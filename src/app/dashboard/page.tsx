'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/context/wallet-context';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import DashboardMetrics from '@/components/dashboard-metrics';
import ActivityFeed from '@/components/activity-feed';
import InvoiceCard, { InvoiceType } from '@/components/invoice-card';
import { Wallet, Plus, ArrowRight, Shield, BarChart3, Coins, Landmark, Clock } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { isConnected, address, role, connect } = useWallet();

  // Fetch statistics and user statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', address],
    queryFn: async () => {
      if (!address) return null;
      const res = await fetch(`/api/stats?walletAddress=${address}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!address,
  });

  // Fetch user invoices (if business)
  const { data: businessInvoices, isLoading: invoicesLoading } = useQuery<InvoiceType[]>({
    queryKey: ['business-invoices', address],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?businessWallet=${address}`);
      if (!res.ok) throw new Error('Failed to fetch business invoices');
      return res.json();
    },
    enabled: !!address && role === 'BUSINESS',
    refetchInterval: 5000,
  });

  // Fetch user investments (if investor)
  const { data: investments, isLoading: investmentsLoading } = useQuery({
    queryKey: ['investments', address],
    queryFn: async () => {
      const res = await fetch(`/api/investments?investorWallet=${address}`);
      if (!res.ok) throw new Error('Failed to fetch investments');
      return res.json();
    },
    enabled: !!address && role === 'INVESTOR',
    refetchInterval: 5000,
  });

  // Action triggers
  const handleAction = async (invoice: InvoiceType, action: 'fund' | 'pay' | 'cancel' | 'withdraw') => {
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          investorWallet: address,
          payerWallet: address,
          amount: action === 'fund' ? invoice.fundingGoal - invoice.currentFunding : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action execution failed');
      }

      alert(`Success: Invoice action '${action}' completed!`);
      window.location.reload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/15 via-background to-background py-16 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel max-w-md w-full p-8 rounded-2xl border border-border text-center space-y-6 shadow-2xl"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
              <Wallet className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Connect Your Wallet</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Please connect your Stellar wallet to access your dashboard, list new invoices, or finance receivables.
              </p>
            </div>
            <button
              onClick={() => connect('Simulated')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-semibold shadow shadow-violet-500/20 transition-all cursor-pointer"
            >
              Connect simulated wallet
            </button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  const defaultStats = {
    totalFactored: stats?.totalFactored || 0,
    totalFunding: stats?.totalFunding || 0,
    activeInvestments: stats?.activeInvestments || 0,
    pendingPayments: stats?.pendingPayments || 0,
    totalReturns: stats?.totalReturns || 0,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              {role === 'BUSINESS' ? 'Business Center' : role === 'ADMIN' ? 'Admin Portal' : 'Investor Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Connected as:{' '}
              <span className="font-mono text-primary">
                {typeof address === 'string' ? `${address.substring(0, 8)}...${address.substring(address.length - 8)}` : ''}
              </span>
            </p>
          </div>

          {role === 'BUSINESS' && (
            <Link
              href="/invoices/create"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-sm font-semibold shadow hover:shadow-violet-600/30 transition-all"
            >
              <Plus className="w-4.5 h-4.5" />
              Tokenize Invoice
            </Link>
          )}

          {role === 'INVESTOR' && (
            <Link
              href="/invoices"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-sm font-semibold shadow hover:shadow-violet-600/30 transition-all"
            >
              Marketplace
              <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          )}
        </div>

        {/* Global metrics grid */}
        <DashboardMetrics stats={defaultStats} loading={statsLoading} />

        {/* Layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Context Section */}
          <div className="lg:col-span-2 space-y-6">
            {role === 'BUSINESS' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-foreground tracking-tight">Your Invoices</h3>
                  <Link href="/invoices" className="text-xs font-semibold text-primary hover:text-foreground transition-colors">
                    View All Invoices
                  </Link>
                </div>

                {invoicesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map(i => (
                      <div key={i} className="h-64 rounded-xl border border-border bg-card animate-pulse" />
                    ))}
                  </div>
                ) : !businessInvoices || businessInvoices.length === 0 ? (
                  <div className="glass-panel rounded-xl p-8 text-center border border-border space-y-4">
                    <p className="text-sm text-muted-foreground">You have not registered any invoices yet.</p>
                    <Link
                      href="/invoices/create"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold text-primary-foreground transition-all"
                    >
                      Tokenize your first invoice
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {businessInvoices.slice(0, 4).map((invoice) => (
                      <InvoiceCard
                        key={invoice.id}
                        invoice={invoice}
                        onActionClick={handleAction}
                        currentUserAddress={address}
                        currentUserRole={role}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {role === 'INVESTOR' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-foreground tracking-tight">Your Active Investments</h3>
                  <Link href="/portfolio" className="text-xs font-semibold text-primary hover:text-foreground transition-colors">
                    View Portfolio
                  </Link>
                </div>

                {investmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
                    ))}
                  </div>
                ) : !investments || investments.length === 0 ? (
                  <div className="glass-panel rounded-xl p-8 text-center border border-border space-y-4">
                    <p className="text-sm text-muted-foreground">No active factoring investments found.</p>
                    <Link
                      href="/invoices"
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-violet-600/10 border border-primary/20 hover:bg-violet-500/20 text-xs font-bold text-primary transition-all"
                    >
                      Explore open invoices
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {investments.map((invst: any) => (
                      <div
                        key={invst.id}
                        className="glass-panel p-4 rounded-xl border border-border flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <span className="text-xxs font-mono text-primary">ID: {invst.invoice?.contractInvoiceId}</span>
                          <h4 className="text-sm font-bold text-foreground">{invst.invoice?.debtorName}</h4>
                          <span className="text-xxs text-muted-foreground">APY: {invst.invoice?.interestRate}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">Funded</span>
                          <span className="text-sm font-extrabold text-foreground">${invst.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {role === 'ADMIN' && (
              <div className="glass-panel p-6 rounded-xl border border-border space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-primary" />
                  <div>
                    <h4 className="text-md font-bold text-foreground">System Administration Panel</h4>
                    <p className="text-xs text-muted-foreground">Manage approvals, inspect system statistics, and audit activity logs.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Link
                    href="/admin"
                    className="p-4 rounded-lg bg-muted border border-border hover:border-primary/30 hover:bg-muted text-center transition-all"
                  >
                    <Shield className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <span className="text-xs font-semibold text-foreground block">Audit Operations</span>
                  </Link>
                  <Link
                    href="/analytics"
                    className="p-4 rounded-lg bg-muted border border-border hover:border-primary/30 hover:bg-muted text-center transition-all"
                  >
                    <BarChart3 className="w-5 h-5 mx-auto mb-2 text-primary" />
                    <span className="text-xs font-semibold text-foreground block">View Analytics</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Activity Feed Sidebar */}
          <div className="glass-panel p-6 rounded-xl border border-border h-fit space-y-6">
            <div className="border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground tracking-tight">Recent Platform Activity</h3>
              <p className="text-xxs text-muted-foreground">Live transactions streaming on-chain</p>
            </div>
            <ActivityFeed />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
