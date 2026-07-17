'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@/context/wallet-context';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { ArrowLeft, Clock, ShieldCheck, Download, Users, FileText, Landmark, FileCheck, Coins } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function InvoiceDetails() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { isConnected, address, role, balance, refreshBalance } = useWallet();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch invoice details
  const { data: invoice, isLoading, refetch } = useQuery({
    queryKey: ['invoice-details', id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) throw new Error('Failed to fetch invoice details');
      return res.json();
    },
  });

  const handleAction = async (action: 'fund' | 'pay' | 'cancel' | 'withdraw') => {
    setIsSubmitting(true);
    setError(null);
    try {
      let txHash = `stellar-tx-${Math.random().toString(36).substring(2, 15)}`;
      const amount = action === 'fund' ? invoice.fundingGoal - invoice.currentFunding : undefined;

      if (walletName !== 'Simulated' && address) {
        const {
          fundInvoiceOnChain,
          repayInvoiceOnChain,
          withdrawReturnOnChain,
          cancelInvoiceOnChain,
        } = await import('@/lib/stellar');

        if (action === 'fund' && amount) {
          const result = await fundInvoiceOnChain(address, invoice.contractInvoiceId, amount);
          txHash = result.txHash;
        } else if (action === 'pay') {
          const interestAmt = (invoice.fundingGoal * invoice.interestRate) / 100;
          const totalRepay = invoice.fundingGoal + interestAmt;
          const result = await repayInvoiceOnChain(address, invoice.contractInvoiceId, totalRepay);
          txHash = result.txHash;
        } else if (action === 'cancel') {
          const result = await cancelInvoiceOnChain(address, invoice.contractInvoiceId);
          txHash = result.txHash;
        } else if (action === 'withdraw') {
          const result = await withdrawReturnOnChain(address, invoice.contractInvoiceId);
          txHash = result.txHash;
        }
      }

      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          investorWallet: address,
          payerWallet: address,
          amount,
          txHash,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete transaction');
      }

      // Log activity
      let actionDetails = '';
      if (action === 'fund') actionDetails = `Funded $${amount?.toLocaleString()} into Invoice for ${invoice.debtorName}`;
      if (action === 'pay') actionDetails = `Repaid Invoice for ${invoice.debtorName}`;
      if (action === 'cancel') actionDetails = `Cancelled Invoice for ${invoice.debtorName}`;
      if (action === 'withdraw') actionDetails = `Withdrawn returns from Invoice for ${invoice.debtorName}`;

      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: action === 'fund' ? 'FUND_INVOICE' : action === 'pay' ? 'REPAY_INVOICE' : action === 'cancel' ? 'CANCEL_INVOICE' : 'WITHDRAW_RETURN',
          details: actionDetails,
        }),
      });

      // Update mock balance in localStorage if using Simulated wallet
      if (address) {
        const balanceKey = `wallet_balance_${address}`;
        const currentBal = parseFloat(localStorage.getItem(balanceKey) || '10000');
        if (action === 'fund' && amount) {
          localStorage.setItem(balanceKey, (currentBal - amount).toString());
        }
      }

      await refreshBalance();
      alert(`Transaction successful: Action '${action}' processed!`);
      refetch();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Escrow contract call failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow max-w-3xl w-full mx-auto px-4 py-16 space-y-6">
          <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
          <div className="h-64 rounded-xl border border-white/5 bg-card animate-pulse" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-3">
            <h3 className="text-xl font-bold text-white">Invoice Not Found</h3>
            <Link href="/dashboard" className="text-sm text-violet-400 hover:underline">
              Back to Dashboard
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isOwner = address && invoice.business?.walletAddress === address;
  const myInvestment = invoice.investments?.find((i: any) => i.investor?.walletAddress === address || i.investorWallet === address);
  
  const totalRepaymentAmount = invoice.fundingGoal * (1 + invoice.interestRate / 100);

  const statusColors = {
    DRAFT: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    PUBLISHED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PARTIALLY_FUNDED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    FULLY_FUNDED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    AWAITING_PAYMENT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    PAID: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    COMPLETED: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Details Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-xl border border-white/10 p-6 md:p-8 space-y-6">
              {/* Header block */}
              <div className="flex justify-between items-start gap-4 border-b border-white/5 pb-5">
                <div className="space-y-1">
                  <span className="text-xxs font-semibold text-violet-400 font-mono tracking-wider uppercase">
                    Escrow ID: {invoice.contractInvoiceId}
                  </span>
                  <h1 className="text-2xl font-bold text-white tracking-tight">{invoice.debtorName}</h1>
                  <p className="text-xs text-muted-foreground">Debtor Billing: {invoice.debtorEmail}</p>
                </div>
                <span className={`text-xs font-bold border px-3 py-1 rounded-full ${statusColors[invoice.status]}`}>
                  {invoice.status}
                </span>
              </div>

              {/* Grid metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
                <div>
                  <span className="text-xxs text-muted-foreground block mb-0.5">Face Value</span>
                  <span className="text-lg font-bold text-white">${invoice.amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xxs text-muted-foreground block mb-0.5">Financing Goal</span>
                  <span className="text-lg font-bold text-white">${invoice.fundingGoal.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xxs text-muted-foreground block mb-0.5">Yield Offered</span>
                  <span className="text-lg font-bold text-emerald-400">{invoice.interestRate}% APY</span>
                </div>
                <div>
                  <span className="text-xxs text-muted-foreground block mb-0.5">Funded So Far</span>
                  <span className="text-lg font-bold text-white">${invoice.currentFunding.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-xxs text-muted-foreground block mb-0.5">Payment Term Date</span>
                  <span className="text-lg font-bold text-white">
                    {new Date(invoice.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-xxs text-muted-foreground block mb-0.5">Repayment Pool Value</span>
                  <span className="text-lg font-bold text-violet-300">${totalRepaymentAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Funding progress</span>
                  <span>{Math.min(100, Math.round((invoice.currentFunding / invoice.fundingGoal) * 100))}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                    style={{ width: `${(invoice.currentFunding / invoice.fundingGoal) * 100}%` }}
                  />
                </div>
              </div>

              {/* PDF Document Preview block */}
              <div className="border border-white/5 bg-white/2 rounded-lg p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-violet-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Legal invoice Document (PDF)</h4>
                    <p className="text-xxs text-muted-foreground">Includes proof of work, product delivery receipt and debtor audit notes.</p>
                  </div>
                </div>
                <button
                  onClick={() => alert('Simulated PDF Download triggered!')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white transition-all cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              {/* Action buttons */}
              {error && <div className="text-xs text-rose-400 font-semibold">{error}</div>}

              <div className="flex gap-3 pt-4 border-t border-white/5">
                {invoice.status === 'PUBLISHED' && !isOwner && role === 'INVESTOR' && (
                  <button
                    onClick={() => handleAction('fund')}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white shadow shadow-violet-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Coins className="w-4.5 h-4.5" />
                    {isSubmitting ? 'Processing Tx...' : 'Finance Full Amount'}
                  </button>
                )}

                {invoice.status === 'PARTIALLY_FUNDED' && !isOwner && role === 'INVESTOR' && (
                  <button
                    onClick={() => handleAction('fund')}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white shadow shadow-violet-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Coins className="w-4.5 h-4.5" />
                    {isSubmitting ? 'Processing Tx...' : 'Finance Full Amount'}
                  </button>
                )}

                {invoice.status === 'AWAITING_PAYMENT' && isOwner && role === 'BUSINESS' && (
                  <button
                    onClick={() => handleAction('pay')}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white shadow shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4.5 h-4.5" />
                    {isSubmitting ? 'Processing Tx...' : `Pay Total Repayment ($${totalRepaymentAmount.toLocaleString()})`}
                  </button>
                )}

                {invoice.status === 'PAID' && myInvestment && !myInvestment.withdrawn && role === 'INVESTOR' && (
                  <button
                    onClick={() => handleAction('withdraw')}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white shadow shadow-violet-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileCheck className="w-4.5 h-4.5" />
                    {isSubmitting ? 'Processing Tx...' : 'Withdraw Returns Payout'}
                  </button>
                )}

                {['PUBLISHED', 'PARTIALLY_FUNDED'].includes(invoice.status) && isOwner && role === 'BUSINESS' && (
                  <button
                    onClick={() => handleAction('cancel')}
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20 disabled:opacity-50 text-sm font-bold text-rose-400 transition-all cursor-pointer"
                  >
                    Cancel Invoice Factoring Request
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar / Blockchain Info & Investors List */}
          <div className="space-y-6">
            {/* Blockchain Details */}
            <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
              <h3 className="text-md font-bold text-white tracking-tight border-b border-white/5 pb-2">On-Chain Audit</h3>
              <div className="space-y-3 text-xxs">
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Escrow Contract Address</span>
                  <span className="font-mono text-violet-300 block truncate" title="CA345678901234567890123456789012345678901234567890123456">
                    CA345678901234567890123456789012345678901234567890123456
                  </span>
                </div>
                {invoice.txHash && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground block">Deployment Transaction Hash</span>
                    <span className="font-mono text-white block truncate" title={invoice.txHash}>
                      {invoice.txHash}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-muted-foreground block">Settlement Asset</span>
                  <span className="font-mono text-white block font-semibold">
                    USDC (Stellar Stablecoin contract)
                  </span>
                </div>
              </div>
            </div>

            {/* Investors List */}
            <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Users className="w-4 h-4 text-violet-400" />
                <h3 className="text-md font-bold text-white tracking-tight">Escrow Investors</h3>
              </div>

              {!invoice.investments || invoice.investments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No active investor positions.</p>
              ) : (
                <div className="space-y-3">
                  {invoice.investments.map((invst: any) => (
                    <div key={invst.id} className="flex justify-between items-center text-xs border-b border-white/3 pb-2 last:border-0 last:pb-0">
                      <div>
                        <span className="font-mono block text-white">
                          {invst.investor?.walletAddress
                            ? invst.investor.walletAddress.substring(0, 6) + '...' + invst.investor.walletAddress.substring(50)
                            : invst.investorWallet.substring(0, 6) + '...' + invst.investorWallet.substring(50)}
                        </span>
                        {invst.withdrawn && (
                          <span className="text-xxs text-emerald-400 font-bold">Payout claimed</span>
                        )}
                      </div>
                      <span className="font-bold text-white">${invst.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
