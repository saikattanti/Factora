import React from 'react';
import Link from 'next/link';
import { Layers } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-background/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4 col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center">
                <Layers className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="font-bold text-md tracking-tight text-white">
                Factora
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              Decentralized invoice financing platform. Empowering businesses to unlock immediate liquidity from outstanding invoices using secure Stellar Soroban smart contracts.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/invoices" className="hover:text-white transition-colors">Marketplace</Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-white transition-colors">Investor Portfolio</Link>
              </li>
              <li>
                <Link href="/analytics" className="hover:text-white transition-colors">Market Analytics</Link>
              </li>
            </ul>
          </div>

          {/* Stellar info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Blockchain</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="text-violet-400 font-semibold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 text-xs">
                  Stellar Testnet
                </span>
              </li>
              <li className="text-xs pt-1">
                Contracts: Soroban Rust
              </li>
              <li className="text-xs">
                Wallets: Freighter, xBull, Albedo
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Factora. Decentralized invoice financing on Stellar.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Docs</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
