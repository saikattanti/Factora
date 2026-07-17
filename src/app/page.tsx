'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { useWallet } from '@/context/wallet-context';
import { motion } from 'framer-motion';
import { Layers, Coins, Landmark, ShieldCheck, ArrowRight, Zap, CheckCircle2, ChevronDown, UserCheck } from 'lucide-react';

export default function LandingPage() {
  const { isConnected, address, connect } = useWallet();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-background to-background">
          {/* Subtle grid lines in background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6 max-w-4xl mx-auto"
            >
              {/* Badge */}
              <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                Stellar Soroban Powered factoring
              </motion.div>

              {/* Headline */}
              <motion.h1 variants={itemVariants} className="text-4xl sm:text-6xl font-black leading-tight tracking-tight text-white">
                Unlocking Liquidity by{' '}
                <span className="text-gradient">Tokenizing Unpaid Invoices</span>
              </motion.h1>

              {/* Sub-headline */}
              <motion.p variants={itemVariants} className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
                Bridge the 30-90 day gap. Businesses sell outstanding invoices for early capital, while investors earn competitive APY yields, secured by blockchain smart contracts.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
                {isConnected ? (
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-md font-bold text-white shadow-lg shadow-violet-500/25 transition-all"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <button
                    onClick={() => connect('Simulated')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-md font-bold text-white shadow-lg shadow-violet-500/25 transition-all cursor-pointer"
                  >
                    Launch Demo Wallet
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
                <Link
                  href="/invoices"
                  className="w-full sm:w-auto px-8 py-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-md font-bold transition-all text-center"
                >
                  Browse Marketplace
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                Core Features of Factora
              </h2>
              <p className="text-muted-foreground text-md font-medium">
                Our protocol replaces manual invoicing processes with secure, decentralized escrow algorithms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="glass-panel p-8 rounded-xl border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                  <Landmark className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Invoice Tokenization</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Convert legal receivables invoices into tokenized smart contract positions, specifying principal amounts, interest yields, and payment timelines.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="glass-panel p-8 rounded-xl border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Liquidity Marketplace</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Investors browse registered invoices, evaluate debtor reputations, and supply funds. Smart contracts automatically disburse funds to the business.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="glass-panel p-8 rounded-xl border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Soroban Escrow Pools</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Payments are locked in tamper-proof Stellar smart contracts. Repayments distribute principal + yield back to fractional investors automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-white/[0.01] border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                The Factoring Process
              </h2>
              <p className="text-muted-foreground text-md">
                Four simple steps from invoice creation to yield return.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { step: '01', title: 'Upload & Tokenize', desc: 'A business uploads an unpaid invoice PDF, details debtor payment terms, and deploys it.' },
                { step: '02', title: 'Marketplace Funding', desc: 'Investors evaluate metrics and deposit USDC stablecoins into the factoring pool contract.' },
                { step: '03', title: 'Instant Cash-out', desc: 'Once the goal is reached, the escrow automatically triggers and releases funds to the business.' },
                { step: '04', title: 'Automatic Repayment', desc: 'Debtor repays the invoice. Escrow unlocks, and investors claim principal + yield returns.' }
              ].map((item, index) => (
                <div key={index} className="relative space-y-3 p-4">
                  <span className="text-5xl font-black text-violet-500/20 block font-mono">
                    {item.step}
                  </span>
                  <h4 className="text-lg font-bold text-white">{item.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 border-t border-white/5">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-6">
              {[
                { q: 'What is Invoice Factoring?', a: 'Invoice factoring is a financial transaction where a business sells its accounts receivable (invoices) to a third party (investors) at a discount in exchange for immediate cash.' },
                { q: 'How does Stellar Soroban secure the transactions?', a: 'All funds are deposited directly into immutable smart contracts. The business cannot withdraw funds without reaching the funding goal, and investors have cryptographically secured claims on the repayment yield.' },
                { q: 'What happens if a debtor defaults on payment?', a: 'Platform admins review delinquent invoices. Soroban smart contracts manage disputes and allow admins to approve suspension or execute insurance payouts where applicable.' }
              ].map((faq, i) => (
                <div key={i} className="glass-panel p-6 rounded-lg border border-white/5">
                  <h4 className="font-bold text-md text-white mb-2">{faq.q}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
