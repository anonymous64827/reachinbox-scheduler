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
    <div className="foundry-card rounded-2xl p-5 mb-8 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-amber-500/15">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-100">
              Sender Sliding Window Capacity
            </h3>
            <p className="text-[11px] text-zinc-400 font-mono">
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

          let barColor = 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
          let textColor = 'text-amber-400';
          if (percentUsed >= 80 && percentUsed < 100) {
            barColor = 'bg-gradient-to-r from-yellow-500 to-amber-500';
            textColor = 'text-yellow-400';
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
                  : 'bg-zinc-950/80 border-zinc-800/80 hover:border-amber-500/30'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-xs font-bold text-white tracking-tight">{sender.name}</div>
                  <div className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate max-w-[180px]">
                    {sender.email}
                  </div>
                </div>

                <button
                  onClick={() => handleResetLimit(sender.email)}
                  title="Reset Redis hourly counter (Demo testing)"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Meter */}
              <div className="my-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                  <span className="text-zinc-400">Current Window:</span>
                  <span className={`font-bold ${textColor}`}>
                    {count} / {limit} ({percentUsed}%)
                  </span>
                </div>
                <div className="w-full bg-[#08080c] rounded-full h-2 overflow-hidden border border-zinc-800">
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
