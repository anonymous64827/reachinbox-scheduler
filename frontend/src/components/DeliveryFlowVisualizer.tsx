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
    { key: 'compose', title: '1. Intake', icon: FileEdit, description: 'Payload validation & DB record created' },
    { key: 'scheduled', title: '2. BullMQ', icon: Calendar, description: 'Persistent delayed sorted-set in Redis' },
    { key: 'worker', title: '3. Worker', icon: Cpu, description: 'Concurrency pool thread allocation' },
    { key: 'ratelimit', title: '4. Rate Limiter', icon: ShieldCheck, description: 'Atomic hourly sliding window check' },
    { key: 'smtp', title: '5. SMTP Relay', icon: Mail, description: 'Provider throttling & Ethereal handshake' },
    { key: 'delivered', title: '6. Output', icon: CheckCircle2, description: 'Sent status, preview URL, ES update' },
  ];

  return (
    <div className="foundry-card rounded-2xl p-5 mb-8 relative overflow-hidden">
      {/* Decorative Technical Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(245,158,11,0.12)_1px,transparent_1px)] [background-size:18px_18px] opacity-40 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-amber-500/15">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-100">
                Live State Lifecycle Engine
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                BullMQ + Redis Pipeline
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              {selectedJob
                ? `Active Node: [${selectedJob.id.substring(0, 12)}...] • To: ${selectedJob.toEmail}`
                : 'Select any outreach job below to inspect its live atomic progression across Redis, Worker threads, and SMTP relays.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          {selectedJob && onOpenTelemetry && (
            <button
              onClick={onOpenTelemetry}
              className="text-[11px] font-mono font-bold text-amber-300 hover:text-black px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-400 border border-amber-500/40 transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            >
              Inspect Telemetry
            </button>
          )}
          {selectedJob && onClearSelection && (
            <button
              onClick={onClearSelection}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-100 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Visual State Pipeline Nodes */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {steps.map((step, index) => {
          const { status, label } = getStepStatus(step.key);
          const Icon = step.icon;

          let badgeColor = 'bg-zinc-900/80 border-zinc-800/80 text-zinc-500';
          let iconColor = 'text-zinc-600';
          let ringPulse = '';

          if (status === 'completed') {
            badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
            iconColor = 'text-emerald-400';
          } else if (status === 'active') {
            badgeColor = 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
            iconColor = 'text-amber-400';
            ringPulse = 'ring-2 ring-amber-500/40 animate-pulse';
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
              className={`p-3 rounded-xl border transition-all duration-200 ${badgeColor} ${ringPulse} flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest font-semibold text-zinc-400">
                    0{index + 1}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                </div>
                <div className="text-xs font-bold text-zinc-100">{step.title}</div>
                <div className="text-[10px] text-zinc-400 leading-tight mt-1 truncate" title={step.description}>
                  {step.description}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[90px]">{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
