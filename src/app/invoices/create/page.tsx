'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useWallet } from '@/context/wallet-context';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { ShieldCheck, ArrowLeft, Upload, FileText, X } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const invoiceSchema = z.object({
  contractInvoiceId: z.string().min(3, 'Contract invoice ID must be at least 3 characters (e.g. INV-001)'),
  debtorName: z.string().min(2, 'Debtor company name must be at least 2 characters'),
  debtorEmail: z.string().email('Invalid debtor email address'),
  amount: z.coerce.number().positive('Invoice value must be a positive number'),
  fundingGoal: z.coerce.number().positive('Funding goal must be a positive number'),
  interestRate: z.coerce.number().positive('Yield rate must be a positive percentage').max(100, 'Yield offered cannot exceed 100%'),
  dueDate: z.string().refine((val) => new Date(val) > new Date(), {
    message: 'Due date must be a future date',
  }),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function CreateInvoice() {
  const router = useRouter();
  const { isConnected, address, role, walletName } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      contractInvoiceId: 'INV-' + Math.floor(100 + Math.random() * 900),
      interestRate: 6.5,
    },
  });

  const amountWatch = watch('amount');
  const goalWatch = watch('fundingGoal');

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
      } else {
        alert('Please drop a valid PDF file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const onSubmit = async (data: InvoiceFormValues) => {
    if (!isConnected || !address) {
      setSubmitError('Please connect your wallet first.');
      return;
    }

    if (role !== 'BUSINESS') {
      setSubmitError('Only registered Business roles can tokenize invoices.');
      return;
    }

    if (data.fundingGoal > data.amount) {
      setSubmitError('Funding goal cannot exceed the total invoice face value.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let txHash = `stellar-create-tx-${Math.random().toString(36).substring(2, 15)}`;
      const pdfUrl = pdfFile
        ? `https://res.cloudinary.com/demo/image/upload/v1600000000/${pdfFile.name}`
        : null;

      if (walletName !== 'Simulated') {
        const { createInvoiceOnChain } = await import('@/lib/stellar');
        // Convert percentage to basis points (e.g., 6.5% -> 650 bps)
        const bps = Math.floor(data.interestRate * 100);
        const dueTimestamp = Math.floor(new Date(data.dueDate).getTime() / 1000);
        
        const contractResult = await createInvoiceOnChain(
          address,
          data.contractInvoiceId,
          data.amount,
          bps,
          data.fundingGoal,
          dueTimestamp
        );
        txHash = contractResult.txHash;
      }

      // Call API
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          businessWallet: address,
          pdfUrl,
          txHash,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit invoice to blockchain');
      }

      // Log activity
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'CREATE_INVOICE',
          details: `Tokenized Invoice ${data.contractInvoiceId} for ${data.debtorName} valued at $${data.amount.toLocaleString()}`,
        }),
      });

      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'Verification / Blockchain submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Tokenize New Invoice</h1>
          <p className="text-sm text-muted-foreground">
            List an unpaid invoice. Supply debtor details, amounts, and Offered interest yields for investors.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="glass-panel rounded-xl border border-white/10 p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Invoice ID */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Contract Invoice ID</label>
                <input
                  type="text"
                  {...register('contractInvoiceId')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. INV-205"
                />
                {errors.contractInvoiceId && (
                  <span className="text-xxs text-rose-400 font-semibold">{errors.contractInvoiceId.message}</span>
                )}
              </div>

              {/* Debtor Name */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Debtor Company Name</label>
                <input
                  type="text"
                  {...register('debtorName')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. Acme Corp"
                />
                {errors.debtorName && (
                  <span className="text-xxs text-rose-400 font-semibold">{errors.debtorName.message}</span>
                )}
              </div>

              {/* Debtor Email */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Debtor Billing Email</label>
                <input
                  type="email"
                  {...register('debtorEmail')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. billing@acme.com"
                />
                {errors.debtorEmail && (
                  <span className="text-xxs text-rose-400 font-semibold">{errors.debtorEmail.message}</span>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Payment Due Date</label>
                <input
                  type="date"
                  {...register('dueDate')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                />
                {errors.dueDate && (
                  <span className="text-xxs text-rose-400 font-semibold">{errors.dueDate.message}</span>
                )}
              </div>

              {/* Total Invoice Amount */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Invoice Total Face Value ($)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('amount')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                  placeholder="0.00"
                />
                {errors.amount && (
                  <span className="text-xxs text-rose-400 font-semibold">{errors.amount.message}</span>
                )}
              </div>

              {/* Financing Required */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Financing Needed / Funding Goal ($)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('fundingGoal')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                  placeholder="Must be <= Face Value"
                />
                {errors.fundingGoal && (
                  <span className="text-xxs text-rose-400 font-semibold">{errors.fundingGoal.message}</span>
                )}
              </div>

              {/* Interest Offered */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">Yield Offered to Investors (% APY)</label>
                <input
                  type="number"
                  step="0.1"
                  {...register('interestRate')}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/3 border border-white/10 text-white placeholder-muted-foreground text-sm focus:border-violet-500 focus:outline-none"
                  placeholder="e.g. 6.5"
                />
                {errors.interestRate && (
                  <span className="text-xxs text-rose-400 font-semibold">{errors.interestRate.message}</span>
                )}
              </div>
            </div>

            {/* Document PDF Drag & Drop */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block">Upload Invoice Document (PDF)</label>
              
              {pdfFile ? (
                <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-400" />
                    <div>
                      <span className="text-xs text-white block font-semibold truncate max-w-[200px]">{pdfFile.name}</span>
                      <span className="text-xxs text-muted-foreground">{(pdfFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPdfFile(null)}
                    className="p-1 rounded hover:bg-white/5 text-muted-foreground hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-violet-500 bg-violet-500/5' : 'border-white/10 hover:border-violet-500/50'
                  }`}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <span className="text-xs text-white block font-semibold">Click to upload or drag & drop</span>
                  <span className="text-xxs text-muted-foreground">PDF invoice files only (max 10MB)</span>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </div>

            {submitError && <div className="text-xs text-rose-400 font-semibold">{submitError}</div>}
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 border border-white/10 rounded-lg text-sm font-semibold hover:bg-white/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-bold text-white shadow shadow-violet-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4.5 h-4.5" />
              {isSubmitting ? 'Signing Tx...' : 'Deploy Smart Contract'}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
