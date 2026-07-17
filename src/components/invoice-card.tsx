'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, TrendingUp, Percent, User, ArrowRight, ShieldCheck, Download } from 'lucide-react';
import { motion } from 'framer-motion';

export interface InvoiceType {
  id: string;
  contractInvoiceId: string;
  debtorName: string;
  debtorEmail: string;
  amount: number;
  fundingGoal: number;
  currentFunding: number;
  interestRate: number;
  dueDate: string | Date;
  status: 'DRAFT' | 'PUBLISHED' | 'PARTIALLY_FUNDED' | 'FULLY_FUNDED' | 'AWAITING_PAYMENT' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  pdfUrl?: string | null;
  txHash?: string | null;
  businessWallet?: string;
  business?: {
    walletAddress: string;
    name?: string | null;
  };
}

interface InvoiceCardProps {
  invoice: InvoiceType;
  onActionClick?: (invoice: InvoiceType, action: 'fund' | 'pay' | 'cancel' | 'withdraw') => void;
  currentUserAddress?: string | null;
  currentUserRole?: 'BUSINESS' | 'INVESTOR' | 'ADMIN';
}

export default function InvoiceCard({
  invoice,
  onActionClick,
  currentUserAddress,
  currentUserRole,
}: InvoiceCardProps) {
  const percent = Math.min(100, Math.round((invoice.currentFunding / invoice.fundingGoal) * 100));

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

  const statusText = {
    DRAFT: 'Draft',
    PUBLISHED: 'Open',
    PARTIALLY_FUNDED: 'Partially Funded',
    FULLY_FUNDED: 'Fully Funded',
    AWAITING_PAYMENT: 'Awaiting Repayment',
    PAID: 'Repaid',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  const getDaysLeft = (date: string | Date) => {
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days left` : 'Overdue';
  };

  const isOwner = currentUserAddress && invoice.business?.walletAddress === currentUserAddress;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel rounded-xl overflow-hidden flex flex-col h-full border border-white/10"
    >
      {/* Top Section */}
      <div className="p-5 flex-1 space-y-4">
        <div className="flex justify-between items-start gap-2">
          <div className="space-y-1">
            <span className="text-xxs font-semibold text-violet-400 font-mono tracking-wider uppercase">
              ID: {invoice.contractInvoiceId}
            </span>
            <h4 className="text-lg font-bold text-white tracking-tight truncate max-w-[200px]" title={invoice.debtorName}>
              {invoice.debtorName}
            </h4>
          </div>
          <span className={`text-xxs font-bold border px-2.5 py-0.5 rounded-full ${statusColors[invoice.status]}`}>
            {statusText[invoice.status]}
          </span>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 gap-3 bg-white/3 border border-white/5 rounded-lg p-3 text-sm">
          <div>
            <span className="text-xxs text-muted-foreground block mb-0.5">Invoice Amount</span>
            <span className="font-bold text-white">${invoice.amount.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-xxs text-muted-foreground block mb-0.5">Financing Goal</span>
            <span className="font-bold text-violet-300">${invoice.fundingGoal.toLocaleString()}</span>
          </div>
        </div>

        {/* Progress bar */}
        {['PUBLISHED', 'PARTIALLY_FUNDED', 'FULLY_FUNDED', 'AWAITING_PAYMENT'].includes(invoice.status) && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xxs font-semibold text-muted-foreground">
              <span>Funded: ${invoice.currentFunding.toLocaleString()}</span>
              <span>{percent}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Info Rows */}
        <div className="space-y-2 pt-1 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-violet-400" />
              Yield Offered
            </span>
            <span className="font-bold text-white">{invoice.interestRate}% APY</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              Due Date
            </span>
            <span className="font-semibold text-white">
              {getDaysLeft(invoice.dueDate)}
            </span>
          </div>
          {invoice.business?.walletAddress && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-violet-400" />
                Issuer
              </span>
              <span className="font-mono text-white text-xxs">
                {invoice.business.walletAddress.substring(0, 6)}...{invoice.business.walletAddress.substring(50)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-white/5 bg-white/2 flex items-center justify-between gap-2 mt-auto">
        <Link
          href={`/invoices/${invoice.id}`}
          className="flex items-center gap-1 text-xxs font-bold text-violet-400 hover:text-white transition-colors py-1.5"
        >
          View Details
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {onActionClick && currentUserAddress && (
          <div className="flex gap-2">
            {invoice.status === 'PUBLISHED' && !isOwner && currentUserRole === 'INVESTOR' && (
              <button
                onClick={() => onActionClick(invoice, 'fund')}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xxs font-bold text-white shadow shadow-violet-600/20 transition-all cursor-pointer"
              >
                Finance
              </button>
            )}

            {invoice.status === 'PARTIALLY_FUNDED' && !isOwner && currentUserRole === 'INVESTOR' && (
              <button
                onClick={() => onActionClick(invoice, 'fund')}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xxs font-bold text-white shadow shadow-violet-600/20 transition-all cursor-pointer"
              >
                Finance
              </button>
            )}

            {invoice.status === 'AWAITING_PAYMENT' && isOwner && currentUserRole === 'BUSINESS' && (
              <button
                onClick={() => onActionClick(invoice, 'pay')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xxs font-bold text-white shadow shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Repay Invoice
              </button>
            )}

            {invoice.status === 'PAID' && currentUserRole === 'INVESTOR' && (
              <button
                onClick={() => onActionClick(invoice, 'withdraw')}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xxs font-bold text-white shadow shadow-violet-600/20 transition-all cursor-pointer"
              >
                Withdraw Payout
              </button>
            )}

            {['PUBLISHED', 'PARTIALLY_FUNDED'].includes(invoice.status) && isOwner && currentUserRole === 'BUSINESS' && (
              <button
                onClick={() => onActionClick(invoice, 'cancel')}
                className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/20 text-xxs font-bold text-rose-400 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
