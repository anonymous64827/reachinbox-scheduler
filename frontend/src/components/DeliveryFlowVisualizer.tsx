import React from 'react';
import { EmailJob } from '../types';
import { FileEdit, Calendar, Layers, Cpu, ShieldCheck, Mail, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface DeliveryFlowVisualizerProps {
  job?: EmailJob | null;
  selectedJob?: EmailJob | null;
  onClearSelection?: () => void;
  onOpenTelemetry?: () => void;
}

export const DeliveryFlowVisualizer: React.FC<DeliveryFlowVisualizerProps> = ({
  job,
  selectedJob: propSelectedJob,
  onClearSelection,
  onOpenTelemetry,
}) => {
  const selectedJob = job !== undefined ? job : propSelectedJob;
  const getStepStatus = (stepKey: string) => {
    if (!selectedJob) {
      return { status: 'idle', label: 'Idle' };
    }

    switch (stepKey) {
      case 'compose':
        return { status: 'completed', label: 'Drafted' };

      case 'scheduled':
        return {
          status: 'completed',
          label: selectedJob.status === 'SCHEDULED' ? 'Delayed in Queue' : 'Dispatched',
        };

      case 'queue':
        if (selectedJob.status === 'SCHEDULED') return { status: 'active', label: 'Awaiting Run-Time' };
        if (selectedJob.status === 'PROCESSING') return { status: 'completed', label: 'Popped from Queue' };
        return { status: 'completed', label: 'Dequeued' };

      case 'worker':
        if (selectedJob.status === 'PROCESSING') return { status: 'active', label: 'Worker Thread Locked' };
        if (selectedJob.status === 'SENT' || selectedJob.status === 'RATE_LIMITED_RESCHEDULED' || selectedJob.status === 'FAILED') {
          return { status: 'completed', label: 'Thread Executed' };
        }
        return { status: 'waiting', label: 'Worker Idle' };

      case 'ratelimit':
        if (selectedJob.status === 'RATE_LIMITED_RESCHEDULED') {
          return { status: 'deferred', label: 'Hourly Cap Hit (Deferred)' };
        }
        if (selectedJob.status === 'SENT' || selectedJob.status === 'PROCESSING') {
          return { status: 'completed', label: 'Quota Verified' };
        }
        return { status: 'waiting', label: 'Quota Check' };

      case 'smtp':
        if (selectedJob.status === 'PROCESSING') return { status: 'active', label: 'SMTP Handshake' };
        if (selectedJob.status === 'SENT') return { status: 'completed', label: 'Ethereal Accepted' };
        if (selectedJob.status === 'FAILED') return { status: 'error', label: 'SMTP Failed' };
        return { status: 'waiting', label: 'Transporter' };

      case 'delivered':
        if (selectedJob.status === 'SENT') return { status: 'completed', label: 'Delivered' };
        if (selectedJob.status === 'RATE_LIMITED_RESCHEDULED') return { status: 'deferred', label: 'Next Hour' };
        if (selectedJob.status === 'FAILED') return { status: 'error', label: 'Failed' };
        return { status: 'waiting', label: 'Final State' };

      default:
        return { status: 'waiting', label: '' };
    }
  };

  const steps = [
    { key: 'compose', title: 'Intake', icon: FileEdit, shortDesc: 'Payload Validated' },
    { key: 'scheduled', title: 'BullMQ', icon: Calendar, shortDesc: 'Delayed ZSet' },
    { key: 'worker', title: 'Worker', icon: Cpu, shortDesc: '5x Pool Thread' },
    { key: 'ratelimit', title: 'Rate Limiter', icon: ShieldCheck, shortDesc: 'Sliding Window' },
    { key: 'smtp', title: 'SMTP Relay', icon: Mail, shortDesc: 'Ethereal Wire' },
    { key: 'delivered', title: 'Output', icon: CheckCircle2, shortDesc: 'Sent & Indexed' },
  ];

  return (
    <div className="foundry-card rounded-2xl p-3.5 sm:p-4 mb-5 relative overflow-hidden">
      {/* Decorative Technical Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(245,158,11,0.1)_1px,transparent_1px)] [background-size:16px_16px] opacity-35 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-3 border-b border-amber-500/15">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.15)] shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-100">
                Delivery Lifecycle Pipeline
              </h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                BullMQ State Machine
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono truncate">
              {selectedJob
                ? `Tracing: ${selectedJob.toEmail} • ID: ${selectedJob.id.substring(0, 8)}...`
                : 'Click any email in the table below to trace its live state across Redis, Worker threads, and SMTP relays.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
          {selectedJob && onOpenTelemetry && (
            <button
              onClick={onOpenTelemetry}
              className="text-[10px] font-mono font-bold text-amber-300 hover:text-black px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-400 border border-amber-500/40 transition-all shadow-sm"
            >
              Inspect Details
            </button>
          )}
          {selectedJob && onClearSelection && (
            <button
              onClick={onClearSelection}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Visual State Pipeline Nodes */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {steps.map((step, index) => {
          const { status, label } = getStepStatus(step.key);
          const Icon = step.icon;

          let badgeColor = 'bg-zinc-950/70 border-zinc-800/80 text-zinc-500';
          let iconColor = 'text-zinc-600';
          let ringPulse = '';

          if (status === 'completed') {
            badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.1)]';
            iconColor = 'text-emerald-400';
          } else if (status === 'active') {
            badgeColor = 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]';
            iconColor = 'text-amber-400';
            ringPulse = 'ring-1 ring-amber-500/50 animate-pulse';
          } else if (status === 'deferred') {
            badgeColor = 'bg-amber-500/15 border-amber-500/40 text-amber-300';
            iconColor = 'text-amber-400';
          } else if (status === 'error') {
            badgeColor = 'bg-rose-500/15 border-rose-500/40 text-rose-300';
            iconColor = 'text-rose-400';
          }

          return (
            <div
              key={step.key}
              className={`p-2.5 rounded-xl border transition-all duration-200 ${badgeColor} ${ringPulse} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1">
                  <span className="text-[9px] font-mono text-zinc-500 font-bold">0{index + 1}</span>
                  <span className="text-[11px] font-bold text-zinc-200 truncate">{step.title}</span>
                </div>
                <Icon className={`w-3 h-3 ${iconColor} shrink-0`} />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-zinc-800/40 mt-1">
                <span className="text-zinc-500 text-[9px] truncate max-w-[60px]">{step.shortDesc}</span>
                <span className={`font-semibold text-[9px] truncate max-w-[70px] ${
                  status === 'active' ? 'text-amber-400 font-bold' : status === 'completed' ? 'text-emerald-400' : 'text-zinc-400'
                }`}>
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
