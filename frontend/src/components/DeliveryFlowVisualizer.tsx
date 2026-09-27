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
    <div className="bg-[#0b1120] border border-slate-800/90 rounded-2xl p-5 mb-8 shadow-2xl relative overflow-hidden">
      {/* Decorative Technical Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Live Lifecycle State Machine
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                BullMQ + Redis Event Flow
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {selectedJob
                ? `Inspecting Job: ${selectedJob.id.substring(0, 13)}... • Recipient: ${selectedJob.toEmail}`
                : 'Click any email in the table below to inspect its live stage progression across Redis, Worker threads, and SMTP relays.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-center">
          {selectedJob && onOpenTelemetry && (
            <button
              onClick={onOpenTelemetry}
              className="text-[11px] font-medium text-indigo-300 hover:text-white px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 transition-colors"
            >
              Inspect Telemetry
            </button>
          )}
          {selectedJob && onClearSelection && (
            <button
              onClick={onClearSelection}
              className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Visual State Pipeline Nodes */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {steps.map((step, index) => {
          const { status, label } = getStepStatus(step.key);
          const Icon = step.icon;

          let badgeColor = 'bg-slate-800/70 border-slate-700/60 text-slate-400';
          let iconColor = 'text-slate-500';
          let ringPulse = '';

          if (status === 'completed') {
            badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
            iconColor = 'text-emerald-400';
          } else if (status === 'active') {
            badgeColor = 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200';
            iconColor = 'text-indigo-400';
            ringPulse = 'ring-2 ring-indigo-500/30 animate-pulse';
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
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-slate-400">
                    Step {index + 1}
                  </span>
                  <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                </div>
                <div className="text-xs font-bold text-slate-100">{step.title}</div>
                <div className="text-[10px] text-slate-400 leading-tight mt-1 truncate" title={step.description}>
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
