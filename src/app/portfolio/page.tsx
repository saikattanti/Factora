'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/context/wallet-context';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { MetricCard } from '@/components/dashboard-metrics';
import { Wallet, Landmark, TrendingUp, DollarSign, Clock, ArrowUpRight, HelpCircle, Layers } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Portfolio() {
  const { isConnected, address, role, balance, refreshBalance } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch investments
  const { data: investments, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['portfolio-investments', address],
    queryFn: async () => {
      const res = await fetch(`/api/investments?investorWallet=${address}`);
      if (!res.ok) throw new Error('Failed to fetch investments');
      return res.json();
    },
    enabled: !!address,
  });

  // Fetch user stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['portfolio-stats', address],
    queryFn: async () => {
      const res = await fetch(`/api/stats?walletAddress=${address}`);
      if (!res.ok) throw new Error('Failed to fetch statistics');
      return res.json();
    },
    enabled: !!address,
  });

  const handleWithdraw = async (id: string, debtor: string, amount: number) => {
    setIsSubmitting(true);
    try {
      let txHash = `stellar-tx-withdraw-${Math.random().toString(36).substring(2, 15)}`;
      const invstObj = investments?.find((i) => i.invoice?.id === id);
      const contractInvoiceId = invstObj?.invoice?.contractInvoiceId;

      if (walletName !== 'Simulated' && address && contractInvoiceId) {
        const { withdrawReturnOnChain } = await import('@/lib/stellar');
        const result = await withdrawReturnOnChain(address, contractInvoiceId);
        txHash = result.txHash;
      }

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          investorWallet: address,
          txHash,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete return withdrawal');
      }

      // Log activity
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'WITHDRAW_RETURN',
          details: `Withdrawn yields payout for Invoice of ${debtor}`,
        }),
      });

      await refreshBalance();
      alert('Success! Returns payout successfully withdrawn to your wallet.');
      refetch();
      refetchStats();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const userStats = statsData?.userStats || {
    totalFunded: 0,
    expectedReturns: 0,
    totalWithdrawn: 0,
    activeCount: 0,
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full p-8 rounded-xl border border-white/5 text-center space-y-4">
            <h3 className="text-xl font-bold text-white">Wallet Not Connected</h3>
            <p className="text-xs text-muted-foreground">Please connect your wallet to inspect your investment portfolio.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Your Investment Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Monitor active positions, expected APY yield earnings, and claim payouts from settled factoring pools.
          </p>
        </div>

        {/* Portfolio Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Capital Deployed"
            value={formatCurrency(userStats.totalFunded)}
            icon={Landmark}
            colorClass="text-violet-400"
          />
          <MetricCard
            title="Expected Yield Payouts"
            value={formatCurrency(userStats.expectedReturns)}
            icon={TrendingUp}
            colorClass="text-emerald-400"
          />
          <MetricCard
            title="Yield Claimed"
            value={formatCurrency(userStats.totalWithdrawn)}
            icon={DollarSign}
            colorClass="text-purple-400"
          />
          <MetricCard
            title="Active Positions"
            value={userStats.activeCount}
            icon={Layers}
            colorClass="text-blue-400"
          />
        </div>

        {/* Active Positions List */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white tracking-tight">Active Funding Positions</h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl border border-white/5 bg-card animate-pulse" />
              ))}
            </div>
          ) : !investments || investments.length === 0 ? (
            <div className="glass-panel rounded-xl p-12 text-center border border-white/5 space-y-3">
              <p className="text-sm text-muted-foreground">You do not have any active investment positions.</p>
              <Link
                href="/invoices"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition-all"
              >
                Browse outstanding invoices
              </Link>
            </div>
          ) : (
            <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
              <table className="min-w-full divide-y divide-white/5 text-sm text-left">
                <thead className="bg-white/2 text-xxs font-bold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3">Debtor Company</th>
                    <th scope="col" className="px-6 py-3">Amount Invested</th>
                    <th scope="col" className="px-6 py-3">Interest (APY)</th>
                    <th scope="col" className="px-6 py-3">Expected Return</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-white">
                  {investments.map((invst) => {
                    const invoice = invst.invoice;
                    if (!invoice) return null;

                    const expectedReturn = invst.amount * (1 + invoice.interestRate / 100);
                    const isRepaid = invoice.status === 'PAID';

                    return (
                      <tr key={invst.id} className="hover:bg-white/1">
                        <td className="px-6 py-4 font-semibold whitespace-nowrap">
                          <Link href={`/invoices/${invoice.id}`} className="hover:text-violet-400 transition-colors">
                            {invoice.debtorName}
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-mono">${invst.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-emerald-400 font-bold">{invoice.interestRate}%</td>
                        <td className="px-6 py-4 font-mono font-bold">${expectedReturn.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border ${
                            isRepaid
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : invoice.status === 'COMPLETED'
                              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isRepaid && !invst.withdrawn ? (
                            <button
                              onClick={() => handleWithdraw(invoice.id, invoice.debtorName, invst.amount)}
                              disabled={isSubmitting}
                              className="px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-xxs font-bold text-white transition-all cursor-pointer"
                            >
                              Withdraw returns
                            </button>
                          ) : invst.withdrawn ? (
                            <span className="text-muted-foreground text-xxs font-semibold">Claimed Payout</span>
                          ) : (
                            <span className="text-muted-foreground text-xxs font-semibold">Lock-in Period</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
