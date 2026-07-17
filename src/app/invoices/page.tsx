'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/context/wallet-context';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import InvoiceCard, { InvoiceType } from '@/components/invoice-card';
import { Search, Filter, Coins, Check, X, Calculator, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Marketplace() {
  const { isConnected, address, role, balance, refreshBalance } = useWallet();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PUBLISHED'); // Default to showing open invoices
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txStatus, setTxStatus] = useState<'IDLE' | 'SIGNING' | 'PENDING_NETWORK' | 'SUCCESS'>('IDLE');
  const [error, setError] = useState<string | null>(null);

  // Fetch all invoices
  const { data: invoices, isLoading, refetch } = useQuery<InvoiceType[]>({
    queryKey: ['marketplace-invoices', statusFilter],
    queryFn: async () => {
      const url = statusFilter === 'ALL' ? '/api/invoices' : `/api/invoices?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch marketplace invoices');
      return res.json();
    },
    refetchInterval: 5000,
  });

  const handleActionClick = (invoice: InvoiceType, action: 'fund' | 'pay' | 'cancel' | 'withdraw') => {
    if (action === 'fund') {
      setSelectedInvoice(invoice);
      // Auto-fill remaining funding needed
      const remaining = invoice.fundingGoal - invoice.currentFunding;
      setFundAmount(remaining.toString());
      setError(null);
    } else {
      executeAction(invoice.id, action);
    }
  };

  const executeAction = async (id: string, action: string, amount?: number) => {
    setIsSubmitting(true);
    setTxStatus('IDLE');
    setError(null);
    try {
      let txHash = `stellar-tx-${Math.random().toString(36).substring(2, 15)}`;
      const invoiceObj = invoices?.find((i) => i.id === id);
      const contractInvoiceId = invoiceObj ? invoiceObj.contractInvoiceId : '';

      if (walletName !== 'Simulated' && address && contractInvoiceId) {
        const {
          fundInvoiceOnChain,
          repayInvoiceOnChain,
          withdrawReturnOnChain,
          cancelInvoiceOnChain,
        } = await import('@/lib/stellar');

        if (action === 'fund' && amount) {
          const result = await fundInvoiceOnChain(address, contractInvoiceId, amount, setTxStatus);
          txHash = result.txHash;
        } else if (action === 'pay') {
          const interestAmt = invoiceObj ? (invoiceObj.fundingGoal * invoiceObj.interestRate) / 100 : 0;
          const totalRepay = invoiceObj ? invoiceObj.fundingGoal + interestAmt : 0;
          const result = await repayInvoiceOnChain(address, contractInvoiceId, totalRepay, setTxStatus);
          txHash = result.txHash;
        } else if (action === 'cancel') {
          const result = await cancelInvoiceOnChain(address, contractInvoiceId, setTxStatus);
          txHash = result.txHash;
        } else if (action === 'withdraw') {
          const result = await withdrawReturnOnChain(address, contractInvoiceId, setTxStatus);
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
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to complete transaction');
      }

      // Log the activity
      const debtor = invoiceObj ? invoiceObj.debtorName : 'Debtor';
      
      let actionDetails = '';
      if (action === 'fund') actionDetails = `Funded $${amount?.toLocaleString()} into Invoice for ${debtor}`;
      if (action === 'pay') actionDetails = `Repaid Invoice for ${debtor}`;
      if (action === 'cancel') actionDetails = `Cancelled Invoice for ${debtor}`;
      if (action === 'withdraw') actionDetails = `Withdrawn returns from Invoice for ${debtor}`;

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
      refetch();
      setSelectedInvoice(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Transaction failed');
      setTxStatus('IDLE');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !address) return;

    const amt = parseFloat(fundAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive number');
      return;
    }

    const remaining = selectedInvoice.fundingGoal - selectedInvoice.currentFunding;
    if (amt > remaining) {
      setError(`Maximum fundable amount is $${remaining.toLocaleString()}`);
      return;
    }

    if (amt > balance) {
      setError('Insufficient wallet balance to cover this transaction');
      return;
    }

    await executeAction(selectedInvoice.id, 'fund', amt);
  };

  const filteredInvoices = invoices?.filter(inv =>
    inv.debtorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Financing Marketplace</h1>
          <p className="text-sm text-muted-foreground">
            Browse outstanding invoices tokenized on-chain. Finance factoring requests to earn competitive yield payouts.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted border border-border rounded-xl p-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by debtor company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:border-violet-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {[
              { label: 'Open', value: 'PUBLISHED' },
              { label: 'Funding', value: 'PARTIALLY_FUNDED' },
              { label: 'Repayable', value: 'AWAITING_PAYMENT' },
              { label: 'Settled', value: 'PAID' },
              { label: 'All Invoices', value: 'ALL' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.value
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow'
                    : 'bg-muted text-muted-foreground hover:bg-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Invoices Marketplace Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : !filteredInvoices || filteredInvoices.length === 0 ? (
          <div className="glass-panel rounded-xl p-12 text-center border border-border space-y-2">
            <h3 className="text-lg font-bold text-foreground">No invoices found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              There are no outstanding invoices listing under this filter. Try adjusting your query or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onActionClick={handleActionClick}
                currentUserAddress={address}
                currentUserRole={role}
              />
            ))}
          </div>
        )}
      </main>

      {/* Financing Modal Dialog */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoice(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <div>
                  <span className="text-xxs font-mono text-primary">Escrow Contract: {selectedInvoice.contractInvoiceId}</span>
                  <h3 className="text-lg font-bold text-foreground">Finance Invoice</h3>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Invoice Summary */}
              <div className="bg-muted border border-border rounded-lg p-4 space-y-2.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Debtor Company:</span>
                  <span className="font-bold text-foreground">{selectedInvoice.debtorName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interest rate (APY):</span>
                  <span className="font-bold text-emerald-400">{selectedInvoice.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Goal:</span>
                  <span className="font-bold text-foreground">${selectedInvoice.fundingGoal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Needed:</span>
                  <span className="font-bold text-primary">
                    ${(selectedInvoice.fundingGoal - selectedInvoice.currentFunding).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleFundSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="amount" className="text-xs font-semibold text-muted-foreground block">
                    Investment Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="amount"
                      placeholder="0.00"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="w-full pl-4 pr-16 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                      required
                    />
                    <span className="absolute right-4 top-3 text-xxs font-bold text-primary">USDC</span>
                  </div>
                  <span className="text-xxs text-muted-foreground block">
                    Available Balance: {balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </span>
                </div>

                {/* Return Calculator Display */}
                {parseFloat(fundAmount) > 0 && (
                  <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Expected Return payout:</span>
                    </div>
                    <span className="font-bold text-foreground">
                      ${(parseFloat(fundAmount) * (1 + selectedInvoice.interestRate / 100)).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                {error && <div className="text-xs text-rose-400 font-semibold">{error}</div>}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedInvoice(null)}
                    className="px-4 py-2 border border-border rounded-lg text-xs font-semibold hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg text-xs font-semibold text-primary-foreground shadow shadow-violet-600/30 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {txStatus === 'SIGNING' ? 'Please Sign in Wallet...' : 
                     txStatus === 'PENDING_NETWORK' ? 'Confirming on Network...' :
                     txStatus === 'SUCCESS' ? 'Success!' : 'Sign & Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
