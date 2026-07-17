const fs = require('fs');
const path = require('path');
const {
  Keypair,
  rpc,
  TransactionBuilder,
  Networks,
  Operation,
  Contract,
  StrKey,
  Address,
  scValToNative
} = require('@stellar/stellar-sdk');

const WASM_PATH = 'C:\\Users\\saika\\cargo-target\\wasm32-unknown-unknown\\release\\invoice_factoring.wasm';
const ENV_PATH = path.join(__dirname, '..', '.env');
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

const rpcServer = new rpc.Server(RPC_URL);

async function pollTransaction(txHash) {
  let retries = 0;
  let status = 'PENDING';
  let txStatus = null;
  
  while ((status === 'PENDING' || status === 'NOT_FOUND') && retries < 25) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      txStatus = await rpcServer.getTransaction(txHash);
      status = txStatus ? txStatus.status : 'NOT_FOUND';
    } catch (err) {
      status = 'NOT_FOUND';
    }
    retries++;
  }
  
  if (status !== 'SUCCESS') {
    throw new Error(`Transaction failed or timed out with status: ${status}. Data: ${JSON.stringify(txStatus)}`);
  }
  
  return txStatus;
}

async function deploy() {
  console.log('🚀 Starting automated Soroban contract deployment on Testnet...');

  // 1. Check if WASM exists
  if (!fs.existsSync(WASM_PATH)) {
    console.error(`❌ WASM binary not found at: ${WASM_PATH}. Please compile first.`);
    process.exit(1);
  }
  const wasmBytes = fs.readFileSync(WASM_PATH);
  console.log(`📦 Loaded WASM binary (${(wasmBytes.length / 1024).toFixed(2)} KB)`);

  // 2. Generate and fund deployer account
  const deployerKeypair = Keypair.random();
  const deployerAddress = deployerKeypair.publicKey();
  console.log(`🔑 Generated temporary deployer account: ${deployerAddress}`);

  console.log('💧 Funding deployer account via Friendbot...');
  const friendbotUrl = `https://friendbot.stellar.org?addr=${encodeURIComponent(deployerAddress)}`;
  const friendbotRes = await fetch(friendbotUrl);
  if (!friendbotRes.ok) {
    throw new Error('Friendbot funding failed');
  }
  console.log('✅ Funded successfully with 10,000 Testnet XLM.');

  // 3. Load account sequence
  // Load account info from Friendbot/RPC
  console.log('📡 Fetching deployer account details from RPC...');
  
  // Create an Operation to upload the WASM code
  const uploadOp = Operation.uploadContractWasm({ wasm: wasmBytes });

  // Get account sequence
  const horizonUrl = 'https://horizon-testnet.stellar.org';
  const accountRes = await fetch(`${horizonUrl}/accounts/${deployerAddress}`);
  if (!accountRes.ok) {
    throw new Error('Failed to load account from Horizon');
  }
  const accountData = await accountRes.json();
  const { Account } = require('@stellar/stellar-sdk');
  const accountObj = new Account(deployerAddress, accountData.sequence);

  // 4. Build upload WASM transaction
  console.log('🔧 Assembling and simulating upload transaction...');
  let uploadTx = new TransactionBuilder(accountObj, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(60)
    .build();

  // Simulate to populate footprint & gas fee
  let sim = await rpcServer.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Upload simulation failed: ${sim.error}`);
  }
  uploadTx = rpc.assembleTransaction(uploadTx, sim).build();
  uploadTx.sign(deployerKeypair);

  console.log('📡 Submitting WASM code to Testnet ledger...');
  let sendResult = await rpcServer.sendTransaction(uploadTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Transaction send error: ${JSON.stringify(sendResult.errorResultXdr)}`);
  }

  // Poll for completion
  const uploadStatus = await pollTransaction(sendResult.hash);

  // Extract WASM Hash from metadata
  const wasmHash = uploadStatus.returnValue.toXDR('base64');
  // returnValue is the byte array of the WASM hash (32 bytes)
  const wasmHashHex = Buffer.from(uploadStatus.returnValue.bytes()).toString('hex');
  console.log(`✅ WASM uploaded. WASM Hash: 0x${wasmHashHex}`);

  // Increment sequence automatically handled by TransactionBuilder.build()

  // 5. Instantiate Contract
  console.log('🔧 Assembling and simulating contract instantiation...');
  const createOp = Operation.createCustomContract({
    wasmHash: uploadStatus.returnValue.bytes(),
    address: Address.fromString(deployerAddress),
  });

  let createTx = new TransactionBuilder(accountObj, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(createOp)
    .setTimeout(60)
    .build();

  sim = await rpcServer.simulateTransaction(createTx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Instantiation simulation failed: ${sim.error}`);
  }
  createTx = rpc.assembleTransaction(createTx, sim).build();
  createTx.sign(deployerKeypair);

  console.log('📡 Deploying contract instance...');
  sendResult = await rpcServer.sendTransaction(createTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Instantiation send error: ${JSON.stringify(sendResult.errorResultXdr)}`);
  }

  const instantiateStatus = await pollTransaction(sendResult.hash);

  // Get Contract ID
  const contractId = scValToNative(instantiateStatus.returnValue);
  console.log(`🎉 Success! Smart Contract deployed at ID: ${contractId}`);

  // 6. Update .env file
  if (fs.existsSync(ENV_PATH)) {
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    const contractRegex = /NEXT_PUBLIC_CONTRACT_ADDRESS="[^"]*"/;
    if (contractRegex.test(envContent)) {
      envContent = envContent.replace(contractRegex, `NEXT_PUBLIC_CONTRACT_ADDRESS="${contractId}"`);
    } else {
      envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS="${contractId}"`;
    }
    fs.writeFileSync(ENV_PATH, envContent, 'utf8');
    console.log('📝 Updated .env file with the new NEXT_PUBLIC_CONTRACT_ADDRESS.');
  }

  console.log('\n🌟 Deployed successfully! Restart your dev server if needed to pick up env updates.');
}

deploy().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
