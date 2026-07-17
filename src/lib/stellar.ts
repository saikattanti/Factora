import {
  Horizon,
  rpc,
  TransactionBuilder,
  Networks,
  Address,
  xdr,
  Contract,
  nativeToScVal,
  Asset,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const HORIZON_URL = process.env.NEXT_PUBLIC_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

export const rpcServer = new rpc.Server(RPC_URL);
export const horizonServer = new Horizon.Server(HORIZON_URL);

const getContractId = (envVal: string) => {
  try {
    if (envVal && envVal.startsWith('G')) {
      const asset = new Asset('USDC', envVal);
      return asset.contractId(NETWORK_PASSPHRASE);
    }
  } catch (err) {
    console.error('Invalid asset issuer in environment, using raw value:', err);
  }
  return envVal;
};

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
const USDC_TOKEN_ID = getContractId(process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || '');

/**
 * Invokes a function on a deployed Soroban contract.
 * Prompts Freighter to sign, pays Testnet XLM gas fees, and polls RPC for result.
 */
const sanitizeSymbol = (val: string) => {
  return val.replace(/[^a-zA-Z0-9_]/g, '_');
};

/**
 * Invokes a function on a deployed Soroban contract.
 * Prompts Freighter to sign, pays Testnet XLM gas fees, and polls RPC for result.
 */
export async function invokeContract(
  userAddress: string,
  contractId: string,
  functionName: string,
  args: xdr.ScVal[],
  onStatusChange?: (status: 'SIGNING' | 'PENDING_NETWORK' | 'SUCCESS' | 'ERROR') => void
) {
  if (!userAddress) throw new Error('Wallet address not connected');
  if (!contractId) throw new Error('Contract address not configured in environment');

  // 1. Fetch account sequence number from Horizon
  const accountSource = await horizonServer.loadAccount(userAddress);

  // 2. Build the contract invocation operation
  const contract = new Contract(contractId);
  const operation = contract.call(functionName, ...args);

  // 3. Build basic transaction structure
  let tx: any = new TransactionBuilder(accountSource, {
    fee: '100', // Base fee (assembleTransaction will add sim.minResourceFee)
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  // 4. Simulate transaction to retrieve transaction footprints
  const sim = await rpcServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  // 5. Assemble transaction with simulated footprint/fees
  // assembleTransaction returns a TransactionBuilder — must call .build() to get a Transaction
  const assembledBuilder = rpc.assembleTransaction(tx, sim);
  const assembledTx = assembledBuilder.build();

  // 6. Sign transaction via Freighter Wallet extension
  if (onStatusChange) onStatusChange('SIGNING');
  const signedResult = await signTransaction(assembledTx.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  }) as any;

  const signedXdr = typeof signedResult === 'string' ? signedResult : signedResult?.signedTxXdr;
  if (!signedXdr) {
    throw new Error('Transaction signing failed or was rejected by user.');
  }

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  // 7. Submit transaction to Soroban RPC
  const response = await rpcServer.sendTransaction(signedTx);
  if (response.status === 'ERROR') {
    throw new Error(`Submit transaction failed: ${JSON.stringify((response as any).errorResultXdr || (response as any).errorResult)}`);
  }

  // 8. Poll for transaction confirmation
  if (onStatusChange) onStatusChange('PENDING_NETWORK');
  const txHash = response.hash;
  let status: any = response.status;
  let retries = 0;

  while ((status === 'PENDING' || status === 'NOT_FOUND') && retries < 30) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const txStatus = await rpcServer.getTransaction(txHash);
    status = txStatus.status;
    if (status === 'SUCCESS') {
      if (onStatusChange) onStatusChange('SUCCESS');
      return { txHash, result: (txStatus as any).resultMetaXdr };
    }
    if (status === 'FAILED') {
      throw new Error(`Transaction execution failed: ${JSON.stringify((txStatus as any).resultXdr)}`);
    }
    retries++;
  }

  if (status === 'PENDING') {
    throw new Error('Transaction execution timed out.');
  }

  return { txHash };
}

/**
 * Approve contract to spend USDC tokens from user's account.
 * Necessary before calling fund_invoice() or mark_paid().
 */
export async function approveUSDC(
  userAddress: string, 
  amount: number,
  onStatusChange?: (status: 'SIGNING' | 'PENDING_NETWORK' | 'SUCCESS' | 'ERROR') => void
) {
  // Convert standard amount (e.g. 500) to raw Stroops (7 decimal places in Stellar)
  const rawAmount = BigInt(Math.floor(amount * 10_000_000));
  
  // Set expiration ledger to ~1 day out (Stellar averages 5s ledgers, so 17280 ledgers)
  const latestLedger = await rpcServer.getLatestLedger();
  const expirationLedger = latestLedger.sequence + 20000;

  const args = [
    nativeToScVal(userAddress, { type: 'address' }),
    nativeToScVal(CONTRACT_ID, { type: 'address' }),
    nativeToScVal(rawAmount.toString(), { type: 'i128' }),
    nativeToScVal(expirationLedger, { type: 'u32' }),
  ];

  return invokeContract(userAddress, USDC_TOKEN_ID, 'approve', args, onStatusChange);
}

/**
 * Creates/Tokenizes an invoice on-chain
 */
export async function createInvoiceOnChain(
  userAddress: string,
  invoiceId: string,
  amount: number,
  interestRateBps: number,
  fundingGoal: number,
  dueDateTimestamp: number,
  onStatusChange?: (status: 'SIGNING' | 'PENDING_NETWORK' | 'SUCCESS' | 'ERROR') => void
) {
  const rawAmount = BigInt(Math.floor(amount * 10_000_000));
  const rawGoal = BigInt(Math.floor(fundingGoal * 10_000_000));

  const args = [
    nativeToScVal(sanitizeSymbol(invoiceId), { type: 'symbol' }),
    nativeToScVal(userAddress, { type: 'address' }),
    nativeToScVal(rawAmount.toString(), { type: 'i128' }),
    nativeToScVal(interestRateBps, { type: 'u32' }),
    nativeToScVal(rawGoal.toString(), { type: 'i128' }),
    nativeToScVal(dueDateTimestamp.toString(), { type: 'u64' }),
  ];

  return invokeContract(userAddress, CONTRACT_ID, 'create_invoice', args, onStatusChange);
}

/**
 * Funds an invoice on-chain (Investor role)
 */
export async function fundInvoiceOnChain(
  userAddress: string,
  invoiceId: string,
  amount: number,
  onStatusChange?: (status: 'SIGNING' | 'PENDING_NETWORK' | 'SUCCESS' | 'ERROR') => void
) {
  // First, approve the USDC factoring contract to transfer tokens
  await approveUSDC(userAddress, amount, onStatusChange);

  const rawAmount = BigInt(Math.floor(amount * 10_000_000));

  const args = [
    nativeToScVal(sanitizeSymbol(invoiceId), { type: 'symbol' }),
    nativeToScVal(userAddress, { type: 'address' }),
    nativeToScVal(rawAmount.toString(), { type: 'i128' }),
  ];

  return invokeContract(userAddress, CONTRACT_ID, 'fund_invoice', args, onStatusChange);
}

/**
 * Repays an invoice on-chain (Business role)
 */
export async function repayInvoiceOnChain(
  userAddress: string,
  invoiceId: string,
  totalRepaymentAmount: number,
  onStatusChange?: (status: 'SIGNING' | 'PENDING_NETWORK' | 'SUCCESS' | 'ERROR') => void
) {
  // First, approve the USDC factoring contract to transfer the total repayment
  await approveUSDC(userAddress, totalRepaymentAmount, onStatusChange);

  const args = [
    nativeToScVal(sanitizeSymbol(invoiceId), { type: 'symbol' }),
    nativeToScVal(userAddress, { type: 'address' }),
  ];

  return invokeContract(userAddress, CONTRACT_ID, 'mark_paid', args, onStatusChange);
}

/**
 * Withdraws return payout for investor on-chain
 */
export async function withdrawReturnOnChain(
  userAddress: string,
  invoiceId: string,
  onStatusChange?: (status: 'SIGNING' | 'PENDING_NETWORK' | 'SUCCESS' | 'ERROR') => void
) {
  const args = [
    nativeToScVal(sanitizeSymbol(invoiceId), { type: 'symbol' }),
    nativeToScVal(userAddress, { type: 'address' }),
  ];

  return invokeContract(userAddress, CONTRACT_ID, 'withdraw_return', args, onStatusChange);
}

/**
 * Cancels invoice on-chain (Business role)
 */
export async function cancelInvoiceOnChain(
  userAddress: string,
  invoiceId: string,
  onStatusChange?: (status: 'SIGNING' | 'PENDING_NETWORK' | 'SUCCESS' | 'ERROR') => void
) {
  const args = [
    nativeToScVal(sanitizeSymbol(invoiceId), { type: 'symbol' }),
  ];

  return invokeContract(userAddress, CONTRACT_ID, 'cancel_invoice', args, onStatusChange);
}
