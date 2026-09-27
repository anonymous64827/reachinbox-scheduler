import React from 'react';
import { Sender } from '../types';
import { api } from '../services/api';
import { Gauge, RotateCcw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface SenderCapacityGaugeProps {
  senders: Sender[];
  onRefresh: () => void;
}

export const SenderCapacityGauge: React.FC<SenderCapacityGaugeProps> = ({
  senders,
  onRefresh,
}) => {
  const handleResetLimit = async (email: string) => {
    try {
      await api.resetSenderLimit(email);
      toast.success(`Reset hourly rate limit counter for ${email}`);
      onRefresh();
    } catch (err: any) {
      toast.error('Failed to reset counter: ' + err.message);
    }
  };

  return (
    <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 mb-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Sender Sliding Window Capacity
            </h3>
            <p className="text-[11px] text-slate-400">
              Multi-worker safe atomic Redis counters. Jobs exceeding capacity automatically rollover to next window.
            </p>
          </div>
        </div>
      </div>

      {/* Senders Capacity Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {senders.map((sender) => {
          const count = sender.currentHourCount || 0;
          const limit = sender.hourlyLimit || 50;
          const remaining = sender.remaining ?? Math.max(0, limit - count);
          const percentUsed = sender.percentUsed ?? Math.min(100, Math.round((count / limit) * 100));
          const isLimited = sender.isRateLimited ?? (count >= limit);

          let barColor = 'bg-emerald-500';
          let textColor = 'text-emerald-400';
          if (percentUsed >= 80 && percentUsed < 100) {
            barColor = 'bg-amber-500';
            textColor = 'text-amber-400';
          } else if (percentUsed >= 100) {
            barColor = 'bg-rose-500 animate-pulse';
            textColor = 'text-rose-400';
          }

          return (
            <div
              key={sender.id}
              className={`p-4 rounded-xl border transition-all ${
                isLimited
                  ? 'bg-rose-950/20 border-rose-500/30 ring-1 ring-rose-500/20'
                  : 'bg-slate-900/60 border-slate-800/90'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs font-bold text-white tracking-tight">{sender.name}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[180px]">
                    {sender.email}
                  </div>
                </div>

                <button
                  onClick={() => handleResetLimit(sender.email)}
                  title="Reset Redis hourly counter (Demo testing)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Meter */}
              <div className="my-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                  <span className="text-slate-400">Current Window:</span>
                  <span className={`font-bold ${textColor}`}>
                    {count} / {limit} ({percentUsed}%)
                  </span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
              </div>

              {/* Capacity Status */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                {isLimited ? (
                  <div className="flex items-center space-x-1 text-rose-400 font-semibold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Hourly Cap Hit • Deferring</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-slate-400 font-medium">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>{remaining} slots available</span>
                  </div>
                )}

                <div className="flex items-center space-x-1 text-slate-400 font-mono text-[9px]">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  <span>Resets at :00</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
