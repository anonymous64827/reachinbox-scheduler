import React from 'react';
import { DashboardStats } from '../types';
import { Calendar, CheckCircle2, Clock, Users, Layers, AlertTriangle } from 'lucide-react';

interface StatsOverviewProps {
  stats: DashboardStats | null;
  onRefresh: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const scheduledCount = stats?.counts?.scheduled ?? 0;
  const sentCount = stats?.counts?.sent ?? 0;
  const rescheduledCount = stats?.counts?.rescheduled ?? 0;
  const sendersCount = stats?.counts?.activeSenders ?? 0;
  const delayedQueue = stats?.queue?.delayed ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
      {/* Scheduled Card */}
      <div className="foundry-card rounded-2xl p-4.5 hover:border-amber-500/50 transition-all shadow-sm group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-medium text-zinc-400">Scheduled Jobs</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">{scheduledCount}</div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] font-mono text-amber-400/80">
          <Clock className="w-3 h-3" />
          <span>BullMQ ZSet Delayed</span>
        </div>
      </div>

      {/* Sent Card */}
      <div className="foundry-card rounded-2xl p-4.5 hover:border-emerald-500/50 transition-all shadow-sm group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-medium text-zinc-400">Dispatched Emails</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">{sentCount}</div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] font-mono text-emerald-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span>Ethereal Live View</span>
        </div>
      </div>

      {/* Rate Limited / Rescheduled Card */}
      <div className="foundry-card rounded-2xl p-4.5 hover:border-amber-500/50 transition-all shadow-sm group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-medium text-zinc-400">Sliding Rollovers</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">{rescheduledCount}</div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] font-mono text-amber-400/80">
          <span>Deferred Next Hour</span>
        </div>
      </div>

      {/* Senders Card */}
      <div className="foundry-card rounded-2xl p-4.5 hover:border-amber-500/50 transition-all shadow-sm group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-medium text-zinc-400">Configured Senders</span>
          <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 group-hover:scale-105 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">{sendersCount}</div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] font-mono text-yellow-300/80">
          <span>Independent Limits</span>
        </div>
      </div>

      {/* Queue Concurrency Card */}
      <div className="col-span-2 md:col-span-4 lg:col-span-1 foundry-card rounded-2xl p-4.5 hover:border-amber-500/50 transition-all shadow-sm group">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-medium text-zinc-400">Queue Threads</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">{delayedQueue} <span className="text-xs font-normal text-zinc-500">jobs</span></div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] font-mono text-amber-400/80">
          <span>Pool Concurrency: 5x</span>
        </div>
      </div>
    </div>
  );
};
