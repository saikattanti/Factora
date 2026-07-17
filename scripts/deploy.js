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
  scValToNative,
  xdr,
} = require('@stellar/stellar-sdk');

const FACTORING_WASM = 'C:\\Users\\saika\\cargo-target\\wasm32-unknown-unknown\\release\\invoice_factoring.wasm';
const REGISTRY_WASM = path.join(__dirname, '..', 'contracts', 'admin-registry', 'target', 'wasm32-unknown-unknown', 'release', 'admin_registry.wasm');
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

async function deployContract(accountObj, keypair, wasmPath, contractName) {
  console.log(`\n📦 Deploying ${contractName}...`);
  if (!fs.existsSync(wasmPath)) {
    console.error(`❌ WASM binary not found at: ${wasmPath}. Please compile first.`);
    process.exit(1);
  }
  const wasmBytes = fs.readFileSync(wasmPath);

  // Upload WASM
  const uploadOp = Operation.uploadContractWasm({ wasm: wasmBytes });
  let uploadTx = new TransactionBuilder(accountObj, {
    fee: '100000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .setTimeout(60)
    .build();

  let sim = await rpcServer.simulateTransaction(uploadTx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Upload simulation failed: ${sim.error}`);
  }
  uploadTx = rpc.assembleTransaction(uploadTx, sim).build();
  uploadTx.sign(keypair);

  let sendResult = await rpcServer.sendTransaction(uploadTx);
  if (sendResult.status === 'ERROR') throw new Error(`Upload send error`);
  
  const uploadStatus = await pollTransaction(sendResult.hash);
  const wasmHash = uploadStatus.returnValue.bytes();

  // Create Contract
  const createOp = Operation.createCustomContract({
    wasmHash,
    address: Address.fromString(keypair.publicKey()),
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
  createTx.sign(keypair);

  sendResult = await rpcServer.sendTransaction(createTx);
  if (sendResult.status === 'ERROR') throw new Error(`Instantiation send error`);

  const instantiateStatus = await pollTransaction(sendResult.hash);
  const contractId = scValToNative(instantiateStatus.returnValue);
  console.log(`🎉 ${contractName} deployed at ID: ${contractId}`);
  
  return contractId;
}

async function deploy() {
  console.log('🚀 Starting automated Soroban Level 3 deployment on Testnet...');

  const deployerKeypair = Keypair.random();
  const deployerAddress = deployerKeypair.publicKey();
  console.log(`🔑 Generated temporary deployer account: ${deployerAddress}`);

  console.log('💧 Funding deployer account via Friendbot...');
  const friendbotRes = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(deployerAddress)}`);
  if (!friendbotRes.ok) throw new Error('Friendbot funding failed');

  const horizonUrl = 'https://horizon-testnet.stellar.org';
  const accountRes = await fetch(`${horizonUrl}/accounts/${deployerAddress}`);
  const accountData = await accountRes.json();
  const { Account } = require('@stellar/stellar-sdk');
  const accountObj = new Account(deployerAddress, accountData.sequence);

  // Deploy Admin Registry
  const registryId = await deployContract(accountObj, deployerKeypair, REGISTRY_WASM, 'Admin Registry');

  // Deploy Invoice Factoring
  const factoringId = await deployContract(accountObj, deployerKeypair, FACTORING_WASM, 'Invoice Factoring');

  // We could invoke initialization here, but it's typically done by the frontend or manual script.
  // Actually, we must do it to make the app usable out of the box!
  // Initialize Registry
  const registryContract = new Contract(registryId);
  const initRegistryOp = registryContract.call("initialize", xdr.ScVal.scvAddress(Address.fromString(deployerAddress).toScAddress()));
  
  let initRegistryTx = new TransactionBuilder(accountObj, { fee: '100000', networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(initRegistryOp)
    .setTimeout(60)
    .build();
    
  let sim = await rpcServer.simulateTransaction(initRegistryTx);
  initRegistryTx = rpc.assembleTransaction(initRegistryTx, sim).build();
  initRegistryTx.sign(deployerKeypair);
  let res = await rpcServer.sendTransaction(initRegistryTx);
  await pollTransaction(res.hash);
  console.log('✅ Admin Registry initialized.');

  // Update .env
  if (fs.existsSync(ENV_PATH)) {
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');
    
    // Replace Factoring
    const fRegex = /NEXT_PUBLIC_CONTRACT_ADDRESS="[^"]*"/;
    if (fRegex.test(envContent)) envContent = envContent.replace(fRegex, `NEXT_PUBLIC_CONTRACT_ADDRESS="${factoringId}"`);
    else envContent += `\nNEXT_PUBLIC_CONTRACT_ADDRESS="${factoringId}"`;

    // Replace Registry
    const rRegex = /NEXT_PUBLIC_REGISTRY_ADDRESS="[^"]*"/;
    if (rRegex.test(envContent)) envContent = envContent.replace(rRegex, `NEXT_PUBLIC_REGISTRY_ADDRESS="${registryId}"`);
    else envContent += `\nNEXT_PUBLIC_REGISTRY_ADDRESS="${registryId}"`;

    fs.writeFileSync(ENV_PATH, envContent, 'utf8');
    console.log('📝 Updated .env file with both Contract IDs.');
  }

  console.log('\n🌟 Multi-contract deployment successful!');
}

deploy().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
