'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, DollarSign, Clock, Users, ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  colorClass?: string;
}

export function MetricCard({
  title,
  value,
  change,
  isPositive = true,
  icon: Icon,
  loading = false,
  colorClass = 'text-violet-400'
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-card p-6 relative overflow-hidden">
        {/* Skeleton animation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
        <div className="space-y-3">
          <div className="h-4 w-24 bg-white/10 rounded" />
          <div className="h-8 w-32 bg-white/10 rounded" />
          <div className="h-3 w-16 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-panel glass-panel-hover rounded-xl p-6 relative overflow-hidden"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <h3 className="text-3xl font-bold tracking-tight text-white">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg bg-white/5 border border-white/5 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {change && (
        <div className="mt-4 flex items-center gap-1">
          <span className={`flex items-center text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {change}
            {isPositive && <ArrowUpRight className="w-3 h-3 ml-0.5" />}
          </span>
          <span className="text-xxs text-muted-foreground">vs last month</span>
        </div>
      )}
    </motion.div>
  );
}

interface MetricsGridProps {
  stats: {
    totalFactored: number;
    totalFunding: number;
    activeInvestments: number;
    pendingPayments: number;
    totalReturns: number;
    usersCount?: number;
  };
  loading?: boolean;
}

export default function DashboardMetrics({ stats, loading = false }: MetricsGridProps) {
  const formatCurrency = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Total Factoring Volume"
        value={formatCurrency(stats.totalFactored)}
        change="+14.2%"
        icon={Coins}
        loading={loading}
        colorClass="text-violet-400"
      />
      <MetricCard
        title="Total Funded"
        value={formatCurrency(stats.totalFunding)}
        change="+18.5%"
        icon={TrendingUp}
        loading={loading}
        colorClass="text-emerald-400"
      />
      <MetricCard
        title="Active Investments"
        value={formatCurrency(stats.activeInvestments)}
        change="+8.3%"
        icon={DollarSign}
        loading={loading}
        colorClass="text-blue-400"
      />
      <MetricCard
        title="Pending Payments"
        value={formatCurrency(stats.pendingPayments)}
        icon={Clock}
        loading={loading}
        colorClass="text-amber-400"
      />
    </div>
  );
}
