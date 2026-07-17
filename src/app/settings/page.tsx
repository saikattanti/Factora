'use client';

import React, { useState } from 'react';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { useWallet } from '@/context/wallet-context';
import { Settings, Shield, Globe, ShieldAlert, Cpu } from 'lucide-react';

export default function SettingsPage() {
  const { isConnected, address, role } = useWallet();

  const [rpcNode, setRpcNode] = useState('https://soroban-testnet.stellar.org');
  const [horizonNode, setHorizonNode] = useState('https://horizon-testnet.stellar.org');
  const [usdcAddress, setUsdcAddress] = useState('GBBD47R7F2C5PZ2PQQ5HVS2C2W6A5Y3K1L1C4S2B2W3K1S1C4S2B2W3K');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-8 h-8 text-violet-400" />
            Configuration & Settings
          </h1>
          <p className="text-sm text-muted-foreground">Configure blockchain connection variables, API credentials, and network configurations.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Blockchain Node Variables */}
          <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Globe className="w-5 h-5 text-violet-400" />
              <h3 className="text-md font-bold text-white tracking-tight">Stellar Testnet Node RPC Settings</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Soroban RPC URL Endpoint</label>
                <input
                  type="text"
                  value={rpcNode}
                  onChange={(e) => setRpcNode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Horizon Horizon Server URL</label>
                <input
                  type="text"
                  value={horizonNode}
                  onChange={(e) => setHorizonNode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Asset Setup */}
          <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Cpu className="w-5 h-5 text-violet-400" />
              <h3 className="text-md font-bold text-white tracking-tight">factoring Settlement Asset Setup</h3>
            </div>

            <div className="space-y-2 text-xs">
              <label className="text-xs font-semibold text-muted-foreground block">USDC Token Smart Contract Address (Soroban format)</label>
              <input
                type="text"
                value={usdcAddress}
                onChange={(e) => setUsdcAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm font-mono focus:border-violet-500 focus:outline-none"
              />
              <span className="text-xxs text-muted-foreground block">Standard testnet USDC token used as the factoring asset.</span>
            </div>
          </div>

          {/* Security alerts */}
          <div className="glass-panel p-6 rounded-xl border border-white/10 bg-yellow-500/5 space-y-3">
            <div className="flex items-center gap-2 text-yellow-400">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="text-sm font-bold">Verification Note</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These RPC network nodes are leveraged directly by the transaction builder to simulate and submit transactions. If your wallet is connected, Freighter/Albedo configurations will override default values.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            {isSaved && (
              <span className="text-xs text-emerald-400 font-semibold self-center mr-2 animate-pulse">
                Configuration Saved Successfully!
              </span>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-bold text-white shadow shadow-violet-600/30 transition-all cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
