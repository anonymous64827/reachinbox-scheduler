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
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4.5 hover:border-indigo-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Scheduled Jobs</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{scheduledCount}</div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-indigo-300/80">
          <Clock className="w-3 h-3" />
          <span>Delayed BullMQ Queue</span>
        </div>
      </div>

      {/* Sent Card */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4.5 hover:border-emerald-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Sent via Ethereal</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{sentCount}</div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-emerald-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>With Live Preview Links</span>
        </div>
      </div>

      {/* Rate Limited / Rescheduled Card */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4.5 hover:border-amber-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Rate-Limited & Deferred</span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{rescheduledCount}</div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-amber-400/80">
          <span>Moved to Next Hour</span>
        </div>
      </div>

      {/* Senders Card */}
      <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4.5 hover:border-purple-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Active Senders</span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{sendersCount}</div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-purple-300/80">
          <span>Independent Limits</span>
        </div>
      </div>

      {/* Queue Concurrency Card */}
      <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-4.5 hover:border-cyan-500/40 transition-all shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Queue Activity</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">{delayedQueue} <span className="text-xs font-normal text-slate-400">jobs</span></div>
        <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-cyan-300/80">
          <span>Worker Concurrency: 5</span>
        </div>
      </div>
    </div>
  );
};
