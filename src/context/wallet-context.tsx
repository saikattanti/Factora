'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'BUSINESS' | 'INVESTOR' | 'ADMIN';

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  walletName: string | null;
  balance: number;
  xlmBalance: number;
  role: UserRole;
  setRole: (role: UserRole) => void;
  connect: (walletType: 'Freighter' | 'xBull' | 'Albedo' | 'Simulated') => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  claimFaucet: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [xlmBalance, setXlmBalance] = useState<number>(0);
  const [role, setRoleState] = useState<UserRole>('INVESTOR');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('wallet_address');
    const savedWallet = localStorage.getItem('wallet_name');
    const savedRole = localStorage.getItem('user_role') as UserRole;
    
    if (savedAddress && savedAddress !== '[object Object]' && savedWallet) {
      setAddress(savedAddress);
      setWalletName(savedWallet);
      setIsConnected(true);
      if (savedRole) {
        setRoleState(savedRole);
      }
      
      refreshBalanceInternal(savedAddress, savedWallet);
    }
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    localStorage.setItem('user_role', newRole);
    
    // Add activity log to DB
    if (address && typeof address === 'string') {
      logActivity(address, 'SWITCH_ROLE', `Switched role to ${newRole}`);
    }
  };

  const logActivity = async (wallet: string, action: string, details: string) => {
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet, action, details }),
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  const refreshBalanceInternal = async (walletAddress: string, type: string) => {
    if (type === 'Simulated') {
      const balanceKey = `wallet_balance_${walletAddress}`;
      const saved = localStorage.getItem(balanceKey);
      setBalance(saved ? parseFloat(saved) : 10000);
      setXlmBalance(10000);
      return;
    }

    try {
      // 1. Fetch XLM balance from Horizon
      const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        const nativeBalance = data.balances.find((b: any) => b.asset_type === 'native');
        if (nativeBalance) {
          setXlmBalance(parseFloat(nativeBalance.balance));
        }

        // 2. Fetch USDC balance if trustline exists
        const usdcAsset = data.balances.find((b: any) => 
          b.asset_code === 'USDC' || (b.asset_type === 'credit_alphanum4' && b.asset_code === 'USDC')
        );
        
        if (usdcAsset) {
          setBalance(parseFloat(usdcAsset.balance));
        } else {
          // Check Soroban USDC contract
          try {
            const { rpc, Contract, nativeToScVal, Address: StellarAddress, scValToNative } = await import('@stellar/stellar-sdk');
            const server = new rpc.Server('https://soroban-testnet.stellar.org');
            let usdcContractId = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS || '';
            
            if (usdcContractId) {
              if (usdcContractId.startsWith('G')) {
                try {
                  const { Asset, Networks } = await import('@stellar/stellar-sdk');
                  const asset = new Asset('USDC', usdcContractId);
                  usdcContractId = asset.contractId(Networks.TESTNET);
                } catch (err) {
                  console.error('Invalid USDC asset issuer in environment, using raw value:', err);
                }
              }
              
              if (usdcContractId.startsWith('C') && usdcContractId.length === 56) {
                const contract = new Contract(usdcContractId);
                const tx = new (await import('@stellar/stellar-sdk')).TransactionBuilder(
                  new (await import('@stellar/stellar-sdk')).Account(walletAddress, '0'),
                  { fee: '100', networkPassphrase: (await import('@stellar/stellar-sdk')).Networks.TESTNET }
                )
                  .addOperation(contract.call('balance', nativeToScVal(new StellarAddress(walletAddress))))
                  .setTimeout(30)
                  .build();
                  
                const sim = await server.simulateTransaction(tx);
                if (!rpc.Api.isSimulationError(sim) && sim.result) {
                  const rawBal = scValToNative(sim.result.retval);
                  setBalance(Number(rawBal) / 10_000_000);
                  return;
                }
              }
            }
          } catch (e) {
            console.error('Failed to fetch Soroban USDC balance:', e);
          }
          
          setBalance(0); // If no trustline/contract, balance is 0
        }
      }
    } catch (err) {
      console.error('Failed to refresh real balances:', err);
    }
  };

  const refreshBalance = async () => {
    if (!address || !walletName) return;
    await refreshBalanceInternal(address, walletName);
  };

  const connect = async (walletType: 'Freighter' | 'xBull' | 'Albedo' | 'Simulated') => {
    setIsConnecting(true);
    setError(null);
    try {
      let walletAddress = '';
      
      if (walletType === 'Simulated') {
        const randomHex = Array.from({ length: 48 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        walletAddress = `G${randomHex.toUpperCase()}`.substring(0, 56);
      } else {
        if (walletType === 'Freighter') {
          const freighterApi = await import('@stellar/freighter-api');
          
          if (freighterApi.isConnected) {
            const isInstalledResult = await freighterApi.isConnected();
            const isInstalled = typeof isInstalledResult === 'boolean' 
              ? isInstalledResult 
              : (isInstalledResult as any)?.isConnected;
              
            if (!isInstalled) {
              throw new Error('Freighter extension is not installed or active in your browser.');
            }
          }

          if ((freighterApi as any).requestAccess) {
            const requestResult = await (freighterApi as any).requestAccess();
            walletAddress = typeof requestResult === 'string' 
              ? requestResult 
              : requestResult?.address || '';
            
            if (!walletAddress) {
              const err = requestResult?.error || 'User rejected access';
              throw new Error(`Freighter connection failed: ${err}`);
            }
          } else {
            let allowed = false;
            if (freighterApi.isAllowed) {
              const isAllowedResult = await freighterApi.isAllowed();
              allowed = typeof isAllowedResult === 'boolean' ? isAllowedResult : (isAllowedResult as any)?.isAllowed;
            }

            if (!allowed && freighterApi.setAllowed) {
              const setAllowedResult = await freighterApi.setAllowed();
              allowed = typeof setAllowedResult === 'boolean' ? setAllowedResult : (setAllowedResult as any)?.isAllowed;
            }

            if (!allowed) {
              throw new Error('Freighter wallet access permission denied.');
            }

            const getAddressFn = freighterApi.getAddress || (freighterApi as any).getPublicKey;
            if (!getAddressFn) {
              throw new Error('Freighter address retrieval function not found.');
            }
            
            const res = await getAddressFn();
            walletAddress = typeof res === 'string' ? res : (res as any)?.address || '';
          }
        } else {
          const kitModule = await import('@creit.tech/stellar-wallets-kit') as any;
          const utilsModule = await import('@creit.tech/stellar-wallets-kit/modules/utils') as any;
          
          const kit = new kitModule.StellarWalletsKit({
            network: kitModule.WalletNetwork?.TESTNET || 'testnet',
            modules: utilsModule.defaultModules ? utilsModule.defaultModules() : [],
          }) as any;
          
          await kit.openModal({
            onWalletSelected: async (option: any) => {
              try {
                kit.setWallet(option.id);
                const { address } = await kit.getAddress();
                walletAddress = address;
              } catch (err) {
                console.error('Wallet select connection error:', err);
              }
            },
            onError: (err: any) => {
              throw new Error(err?.message || 'Connection failed');
            }
          });
          
          let retries = 0;
          while (!walletAddress && retries < 20) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            retries++;
          }
          
          if (!walletAddress) {
            throw new Error('Wallet connection timed out or was rejected.');
          }
        }
      }

      setAddress(walletAddress);
      setWalletName(walletType);
      setIsConnected(true);
      
      localStorage.setItem('wallet_address', walletAddress);
      localStorage.setItem('wallet_name', walletType);
      
      await refreshBalanceInternal(walletAddress, walletType);
      await syncUserToDB(walletAddress);
      logActivity(walletAddress, 'CONNECT_WALLET', `Connected using ${walletType} wallet`);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect wallet');
      setIsConnected(false);
      setAddress(null);
      setWalletName(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (address && walletName) {
      logActivity(address, 'DISCONNECT_WALLET', `Disconnected ${walletName} wallet`);
    }
    
    setIsConnected(false);
    setAddress(null);
    setWalletName(null);
    setBalance(0);
    setXlmBalance(0);
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_name');
  };

  const claimFaucet = async () => {
    if (!address) return;
    
    if (walletName === 'Simulated') {
      const balanceKey = `wallet_balance_${address}`;
      const current = parseFloat(localStorage.getItem(balanceKey) || '10000');
      const newBal = current + 5000;
      localStorage.setItem(balanceKey, newBal.toString());
      setBalance(newBal);
    } else {
      // For real wallets, direct them to Friendbot or offer on-chain faucet
      window.open(`https://friendbot.stellar.org?addr=${address}`, '_blank');
    }
    
    logActivity(address, 'CLAIM_FAUCET', 'Claimed 5,000 mock USDC faucet');
  };

  const syncUserToDB = async (wallet: string) => {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet, role }),
      });
    } catch (err) {
      console.error('Failed to sync user to database:', err);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        walletName,
        balance,
        xlmBalance,
        role,
        setRole,
        connect,
        disconnect,
        refreshBalance,
        claimFaucet,
        isConnecting,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
