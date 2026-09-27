import React, { useState, useEffect, useCallback } from 'react';
import { ActivityEvent } from '../types';
import { api } from '../services/api';
import { Terminal, RefreshCw, CheckCircle2, AlertTriangle, ShieldAlert, Cpu, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface ActivityLogStreamProps {
  events?: ActivityEvent[];
  loading?: boolean;
  onRefresh?: () => void;
}

export const ActivityLogStream: React.FC<ActivityLogStreamProps> = ({
  events: propEvents,
  loading: propLoading,
  onRefresh: propOnRefresh,
}) => {
  const [internalEvents, setInternalEvents] = useState<ActivityEvent[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'warn' | 'error'>('all');

  const fetchInternal = useCallback(async () => {
    try {
      const data = await api.getActivity();
      setInternalEvents(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (propEvents === undefined) {
      fetchInternal();
      const interval = setInterval(fetchInternal, 3000);
      return () => clearInterval(interval);
    }
  }, [propEvents, fetchInternal]);

  const events = propEvents !== undefined ? propEvents : internalEvents;
  const loading = propLoading !== undefined ? propLoading : internalLoading;
  const handleRefresh = propOnRefresh || fetchInternal;

  const filteredEvents = events.filter((e) => {
    if (filter === 'all') return true;
    return e.level === filter;
  });

  const getEventIcon = (type: ActivityEvent['type'], level: ActivityEvent['level']) => {
    if (level === 'error') return <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    if (type === 'SLACK_NOTIFIED' || type === 'RATE_LIMIT_DEFERRED') {
      return <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (type === 'EMAIL_DELIVERED') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (type === 'WORKER_ACQUIRED') return <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    if (type === 'SMTP_DISPATCHING') return <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    return <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  };

  const formatEventTime = (iso: string) => {
    try {
      return format(new Date(iso), 'HH:mm:ss');
    } catch {
      return iso.substring(11, 19);
    }
  };

  return (
    <div className="foundry-card rounded-2xl overflow-hidden shadow-2xl mb-8">
      {/* Console Header */}
      <div className="px-5 py-3.5 border-b border-amber-500/15 bg-zinc-950/90 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex space-x-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-zinc-100 uppercase tracking-widest">Telemetry Stream</span>
            <span className="flex items-center space-x-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>LIVE</span>
            </span>
          </div>
        </div>

        {/* Filter Buttons & Refresh */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1 text-[10px] font-mono bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded ${filter === 'all' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-2 py-0.5 rounded ${filter === 'success' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Delivered
            </button>
            <button
              onClick={() => setFilter('warn')}
              className={`px-2 py-0.5 rounded ${filter === 'warn' ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
            >
              Rate Limits
            </button>
          </div>

          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
            title="Poll Telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="p-3.5 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 divide-y divide-zinc-800/40 bg-[#09090d]/60">
        {filteredEvents.length === 0 ? (
          <div className="py-6 text-center text-zinc-500 text-xs">
            Awaiting system events. Schedule an outreach campaign to view live BullMQ and SMTP events here.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div
              key={evt.id}
              className="pt-1.5 first:pt-0 flex items-start space-x-2.5 text-[11px] leading-relaxed group hover:bg-amber-500/5 px-2 py-1 rounded transition-colors"
            >
              {/* Time */}
              <span className="text-zinc-600 group-hover:text-amber-400/70 shrink-0 select-none">
                [{formatEventTime(evt.timestamp)}]
              </span>

              {/* Icon */}
              {getEventIcon(evt.type, evt.level)}

              {/* Type Badge */}
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${
                  evt.level === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : evt.level === 'warn'
                    ? 'bg-amber-500/10 text-amber-400'
                    : evt.level === 'error'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-indigo-500/10 text-indigo-300'
                }`}
              >
                {evt.type}
              </span>

              {/* Message */}
              <span className="text-slate-300 flex-1 truncate" title={evt.message}>
                {evt.message}
              </span>

              {/* Recipient / Sender Tag if available */}
              {evt.recipient && (
                <span className="text-slate-500 text-[10px] hidden md:inline truncate max-w-[120px]">
                  → {evt.recipient}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
