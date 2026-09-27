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

      {/* Senders Capacity List - Never wraps awkwardly or overflows */}
      <div className="space-y-3">
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
              className={`p-3.5 rounded-xl border transition-all ${
                isLimited
                  ? 'bg-rose-950/20 border-rose-500/30 ring-1 ring-rose-500/20'
                  : 'bg-zinc-950/80 border-zinc-800/80 hover:border-amber-500/30'
              }`}
            >
              {/* Row Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white tracking-tight truncate">{sender.name}</span>
                    {isLimited && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                        Capped
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 truncate">
                    {sender.email}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className={`text-xs font-mono font-bold ${textColor}`}>
                    {count} <span className="text-zinc-600 font-normal">/</span> {limit}
                    <span className="text-[10px] font-normal text-zinc-500 ml-1">({percentUsed}%)</span>
                  </span>

                  <button
                    onClick={() => handleResetLimit(sender.email)}
                    title="Reset Redis hourly counter (Demo testing)"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#08080c] rounded-full h-1.5 overflow-hidden border border-zinc-800/80 my-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="flex items-center space-x-1">
                  {isLimited ? (
                    <span className="text-rose-400 font-medium">⚠️ Rollover Active (Moved to next hour)</span>
                  ) : (
                    <span className="text-zinc-400">✓ {remaining} sends left in this hour</span>
                  )}
                </span>
                <span className="text-zinc-600">Resets at :00</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
