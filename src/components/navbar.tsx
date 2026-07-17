'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet, UserRole } from '@/context/wallet-context';
import { Wallet, Shield, Coins, LogOut, Check, ChevronDown, Menu, X, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const pathname = usePathname();
  const {
    isConnected,
    address,
    walletName,
    balance,
    xlmBalance,
    role,
    setRole,
    connect,
    disconnect,
    claimFaucet
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isFaucetClaiming, setIsFaucetClaiming] = useState(false);

  const links = [
    { name: 'Home', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Marketplace', href: '/invoices' },
    { name: 'Portfolio', href: '/portfolio' },
    { name: 'Analytics', href: '/analytics' },
    { name: 'Settings', href: '/settings' },
  ];

  // If Admin role, add admin link
  const navLinks = [...links];
  if (role === 'ADMIN') {
    navLinks.push({ name: 'Admin', href: '/admin' });
  }

  const handleConnectWallet = async (type: 'Freighter' | 'xBull' | 'Albedo' | 'Simulated') => {
    await connect(type);
    setShowWalletModal(false);
  };

  const handleFaucet = async () => {
    setIsFaucetClaiming(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await claimFaucet();
    setIsFaucetClaiming(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Layers className="w-5 h-5 text-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Factora
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary relative py-1 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Actions / Wallet Connect */}
          <div className="hidden md:flex items-center gap-3">
            {isConnected && walletName === 'Simulated' && (
              <button
                onClick={handleFaucet}
                disabled={isFaucetClaiming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-violet-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                <Coins className={`w-3.5 h-3.5 ${isFaucetClaiming ? 'animate-spin' : ''}`} />
                {isFaucetClaiming ? 'Claiming...' : 'Faucet'}
              </button>
            )}

            {/* Role Switcher */}
            {isConnected && (
              <div className="relative">
                <button
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-xs font-semibold transition-colors cursor-pointer text-foreground"
                >
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>Role: {role}</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {showRoleDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowRoleDropdown(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-1.5 w-40 rounded-lg border border-border bg-card p-1 shadow-xl z-20"
                      >
                        {(['INVESTOR', 'BUSINESS', 'ADMIN'] as UserRole[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setRole(r);
                              setShowRoleDropdown(false);
                            }}
                            className="flex items-center justify-between w-full px-3 py-2 text-left text-xs rounded-md hover:bg-muted transition-colors cursor-pointer text-foreground"
                          >
                            <span>{r}</span>
                            {role === r && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Wallet Button */}
            {isConnected ? (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground font-mono">
                    {typeof address === 'string' ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : ''}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {walletName === 'Simulated'
                      ? `${balance.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} USDC`
                      : `${xlmBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} XLM`
                    }
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="p-2 rounded-lg hover:bg-muted border border-transparent hover:border-border text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                  title="Disconnect Wallet"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowWalletModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile Menu Icon */}
          <div className="flex md:hidden items-center gap-3">
            {isConnected && (
              <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded">
                {balance.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
              </span>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-lg border border-border hover:bg-muted cursor-pointer text-foreground"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-border bg-background/80 backdrop-blur-lg w-full overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block py-2 text-sm font-semibold transition-colors ${
                    pathname === link.href ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              <div className="pt-4 border-t border-border flex flex-col gap-3">
                {isConnected ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-mono">
                          {typeof address === 'string' ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : ''}
                        </span>
                        <span className="text-xs text-primary">
                          Wallet: {walletName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {walletName === 'Simulated' && (
                          <button
                            onClick={handleFaucet}
                            className="px-2.5 py-1 rounded bg-primary/10 text-primary text-xs border border-primary/20"
                          >
                            Faucet
                          </button>
                        )}
                        <button
                          onClick={() => {
                            disconnect();
                            setIsOpen(false);
                          }}
                          className="p-2 text-destructive border border-destructive/20 rounded-lg"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Role Selector in Mobile Drawer */}
                    <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                      <span className="text-xs text-muted-foreground">Select Testing Role:</span>
                      <div className="flex gap-1.5">
                        {(['INVESTOR', 'BUSINESS', 'ADMIN'] as UserRole[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={`px-2 py-1 rounded text-xxs font-bold ${
                              role === r
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowWalletModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wallet Selector Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWalletModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Connect a Wallet</h3>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() => handleConnectWallet('Freighter')}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted text-left transition-all cursor-pointer hover:border-primary/45 group text-foreground"
                >
                  <div className="w-8 h-8 rounded bg-amber-500/20 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Freighter Wallet</div>
                    <div className="text-xs text-muted-foreground">Official Stellar browser extension</div>
                  </div>
                </button>

                <button
                  onClick={() => handleConnectWallet('xBull')}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted text-left transition-all cursor-pointer hover:border-primary/45 group text-foreground"
                >
                  <div className="w-8 h-8 rounded bg-teal-500/20 text-teal-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">xBull Wallet</div>
                    <div className="text-xs text-muted-foreground">Powerful multi-network wallet</div>
                  </div>
                </button>

                <button
                  onClick={() => handleConnectWallet('Albedo')}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted text-left transition-all cursor-pointer hover:border-primary/45 group text-foreground"
                >
                  <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Albedo Wallet</div>
                    <div className="text-xs text-muted-foreground">Easy web-based Stellar wallet</div>
                  </div>
                </button>

                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xxs uppercase"><span className="bg-card px-2 text-muted-foreground font-semibold">Testing / Demo fallback</span></div>
                </div>

                <button
                  onClick={() => handleConnectWallet('Simulated')}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-primary/20 bg-violet-500/5 hover:bg-primary/10 text-left transition-all cursor-pointer hover:border-violet-500/60 group"
                >
                  <div className="w-8 h-8 rounded bg-violet-500/20 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-primary">Simulated Wallet (Demo Mode)</div>
                    <div className="text-xs text-primary/70">Instantly test the full platform lifecycle</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
