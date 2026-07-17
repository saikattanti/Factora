'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Coins, Percent } from 'lucide-react';
import { MetricCard } from '@/components/dashboard-metrics';

export default function Analytics() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch stats for analytics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['global-analytics-stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  const chartData = stats?.chartData || [
    { name: 'Jan', volume: 45000, funded: 38000, returns: 2400 },
    { name: 'Feb', volume: 55000, funded: 48000, returns: 3100 },
    { name: 'Mar', volume: 68000, funded: 59000, returns: 3900 },
    { name: 'Apr', volume: 80000, funded: 71000, returns: 4800 },
    { name: 'May', volume: 95000, funded: 84000, returns: 5600 },
    { name: 'Jun', volume: 122000, funded: 107000, returns: 7100 },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Marketplace Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Explore platform-wide statistics, total factoring volume, investor yield distributions, and liquidity trends.
          </p>
        </div>

        {/* Global Stats metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Factoring Transactions"
            value={stats?.invoicesCount || 4}
            icon={Coins}
            colorClass="text-violet-400"
            loading={isLoading}
          />
          <MetricCard
            title="Total returns Yield Paid"
            value={formatCurrency(stats?.totalReturns || 0)}
            icon={Percent}
            colorClass="text-emerald-400"
            loading={isLoading}
          />
          <MetricCard
            title="Total Active funding"
            value={formatCurrency(stats?.activeInvestments || 0)}
            icon={TrendingUp}
            colorClass="text-blue-400"
            loading={isLoading}
          />
          <MetricCard
            title="Total Users Registered"
            value={stats?.usersCount || 3}
            icon={Users}
            colorClass="text-amber-400"
            loading={isLoading}
          />
        </div>

        {/* Recharts Panels */}
        {mounted && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: Factoring Volume */}
            <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
              <div>
                <h3 className="text-md font-bold text-white tracking-tight">Factoring Volume & Funding</h3>
                <p className="text-xxs text-muted-foreground">Monthly total receivables tokenized vs funded capital</p>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                    <XAxis dataKey="name" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                    <Bar dataKey="volume" fill="#8b5cf6" name="Total Face Value" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="funded" fill="#10b981" name="Funded Capital" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Cumulative Yield */}
            <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-4">
              <div>
                <h3 className="text-md font-bold text-white tracking-tight">Investor returns Payouts</h3>
                <p className="text-xxs text-muted-foreground">Cumulative APY interest returns paid back to investors</p>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a35" />
                    <XAxis dataKey="name" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }} />
                    <Area type="monotone" dataKey="returns" stroke="#c084fc" fillOpacity={1} fill="url(#colorReturns)" name="Interest Returned ($)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
