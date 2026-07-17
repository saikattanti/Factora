'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/context/wallet-context';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { Shield, Users, FileText, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminPortal() {
  const { isConnected, address, role } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all invoices
  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery<any[]>({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const res = await fetch('/api/invoices');
      if (!res.ok) throw new Error('Failed to fetch admin invoices');
      return res.json();
    },
    enabled: !!address && role === 'ADMIN',
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery<any[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch admin users');
      return res.json();
    },
    enabled: !!address && role === 'ADMIN',
  });

  const handleApproveSuspicious = async (id: string, debtor: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pay', // Mocking settlement or resolution
          payerWallet: address,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to resolve invoice flag');
      }

      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          action: 'ADMIN_RESOLVE',
          details: `Admin approved / resolved suspicious invoice of ${debtor}`,
        }),
      });

      alert(`Invoice for ${debtor} has been successfully cleared and approved.`);
      refetchInvoices();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected || role !== 'ADMIN') {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full p-8 rounded-xl border border-white/5 text-center space-y-4">
            <Shield className="w-10 h-10 text-rose-400 mx-auto" />
            <h3 className="text-xl font-bold text-white">Access Denied</h3>
            <p className="text-xs text-muted-foreground">Only registered administrators have access to this portal. Toggle your role in the navbar to test.</p>
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Admin Console</h1>
          <p className="text-sm text-muted-foreground">Audit users, resolve flagging concerns, and check smart contract invoice compliance.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Invoices Audit Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-400" />
              <h3 className="text-xl font-bold text-white tracking-tight">Marketplace Invoices Audit</h3>
            </div>

            {invoicesLoading ? (
              <div className="h-32 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
            ) : !invoices || invoices.length === 0 ? (
              <div className="glass-panel rounded-xl p-8 text-center text-xs text-muted-foreground border border-white/5">
                No invoices listed in the database.
              </div>
            ) : (
              <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
                <table className="min-w-full divide-y divide-white/5 text-sm text-left">
                  <thead className="bg-white/2 text-xxs font-bold text-muted-foreground uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3">Debtor</th>
                      <th scope="col" className="px-4 py-3">Amount</th>
                      <th scope="col" className="px-4 py-3">Yield</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs text-white">
                    {invoices.map((invoice) => {
                      const isSuspicious = invoice.amount > 35000 && invoice.interestRate > 6.0 && invoice.status !== 'PAID' && invoice.status !== 'COMPLETED';
                      return (
                        <tr key={invoice.id} className="hover:bg-white/1">
                          <td className="px-4 py-4">
                            <span className="font-semibold block">{invoice.debtorName}</span>
                            <span className="text-xxs font-mono text-muted-foreground block">{invoice.contractInvoiceId}</span>
                          </td>
                          <td className="px-4 py-4 font-mono">${invoice.amount.toLocaleString()}</td>
                          <td className="px-4 py-4 text-emerald-400">{invoice.interestRate}%</td>
                          <td className="px-4 py-4">
                            <span className="px-2 py-0.5 rounded-full text-xxs font-bold border bg-white/5 border-white/10">
                              {invoice.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            {isSuspicious ? (
                              <button
                                onClick={() => handleApproveSuspicious(invoice.id, invoice.debtorName)}
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/30 text-xxs font-bold text-amber-300 transition-all cursor-pointer"
                                title="High Value/Interest Alert"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Clear Alert
                              </button>
                            ) : (
                              <span className="text-emerald-400 font-bold flex items-center justify-end gap-1 text-xxs">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Verified
                              </span>
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

          {/* Users List Sidebar */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              <h3 className="text-xl font-bold text-white tracking-tight">Active Platform Users</h3>
            </div>

            {usersLoading ? (
              <div className="h-48 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
            ) : !users || users.length === 0 ? (
              <div className="glass-panel rounded-xl p-6 text-center text-xs text-muted-foreground border border-white/5">
                No users found.
              </div>
            ) : (
              <div className="glass-panel p-4 rounded-xl border border-white/10 space-y-4">
                <div className="divide-y divide-white/5 text-xs text-white">
                  {users.map((usr) => (
                    <div key={usr.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-mono block text-violet-300">
                          {usr.walletAddress.substring(0, 8)}...{usr.walletAddress.substring(48)}
                        </span>
                        <span className="text-xxs text-muted-foreground">Joined: {new Date(usr.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xxs font-semibold bg-white/5 border border-white/10">
                        {usr.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
