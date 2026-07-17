'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, TrendingUp, CheckCircle, DollarSign, XCircle, ArrowRightLeft, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityItem {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: {
    walletAddress: string;
  };
}

export default function ActivityFeed() {
  const { data: activities, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activities'],
    queryFn: async () => {
      const res = await fetch('/api/activity');
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
  });

  const getIcon = (action: string) => {
    switch (action) {
      case 'CREATE_INVOICE':
        return <Plus className="w-4 h-4 text-emerald-400" />;
      case 'FUND_INVOICE':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'SWITCH_ROLE':
        return <UserCheck className="w-4 h-4 text-violet-400" />;
      case 'CLAIM_FAUCET':
        return <DollarSign className="w-4 h-4 text-amber-400" />;
      case 'INVOICE_PAID':
      case 'REPAY_INVOICE':
      case 'SWITCH_SETTLED':
        return <CheckCircle className="w-4 h-4 text-teal-400" />;
      case 'INVOICE_CANCELLED':
      case 'CANCEL_INVOICE':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'WITHDRAW_RETURN':
        return <DollarSign className="w-4 h-4 text-purple-400" />;
      default:
        return <ArrowRightLeft className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getBG = (action: string) => {
    switch (action) {
      case 'CREATE_INVOICE':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'FUND_INVOICE':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'INVOICE_PAID':
      case 'REPAY_INVOICE':
        return 'bg-teal-500/10 border-teal-500/20';
      case 'INVOICE_CANCELLED':
      case 'CANCEL_INVOICE':
        return 'bg-rose-500/10 border-rose-500/20';
      default:
        return 'bg-zinc-500/10 border-zinc-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 shrink-0" />
            <div className="space-y-2 flex-1 pt-1">
              <div className="h-3 w-1/3 bg-white/5 rounded" />
              <div className="h-4 w-3/4 bg-white/5 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        No recent activities logged on platform.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((activity, activityIdx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {activityIdx !== activities.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-white/5"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span
                    className={`h-8 w-8 rounded-full border flex items-center justify-center ${getBG(
                      activity.action
                    )}`}
                  >
                    {getIcon(activity.action)}
                  </span>
                </div>
                <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold text-white mb-0.5">
                      {activity.details}
                    </p>
                    <span>By user </span>
                    <span className="font-mono text-xxs bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-violet-300">
                      {activity.user?.walletAddress
                        ? activity.user.walletAddress.substring(0, 6) +
                          '...' +
                          activity.user.walletAddress.substring(50)
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="text-right text-xxs whitespace-nowrap text-muted-foreground">
                    <time dateTime={activity.createdAt}>
                      {new Date(activity.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
