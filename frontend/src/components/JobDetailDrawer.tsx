import React, { useEffect, useState } from 'react';
import { EmailJob, JobTelemetry } from '../types';
import { api } from '../services/api';
import { X, ExternalLink, Clock, Cpu, Mail, CheckCircle2, AlertTriangle, ShieldCheck, Database, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface JobDetailDrawerProps {
  job: EmailJob | null;
  isOpen?: boolean;
  onClose: () => void;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({ job, isOpen = true, onClose }) => {
  const [telemetry, setTelemetry] = useState<JobTelemetry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job && isOpen) {
      setLoading(true);
      api
        .getJobTelemetry(job.id)
        .then(setTelemetry)
        .catch(() => setTelemetry(null))
        .finally(() => setLoading(false));
    } else {
      setTelemetry(null);
    }
  }, [job, isOpen]);

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0a0a0f] border-l border-amber-500/20 h-full flex flex-col shadow-2xl text-zinc-100 overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-amber-500/15 bg-zinc-950/90 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                Foundry Telemetry
              </span>
              <span className="text-xs font-mono text-zinc-400 truncate max-w-[180px]">
                {job.id}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mt-1 truncate max-w-sm">
              {job.subject}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 flex-1 text-xs">
          {/* Status Badge Block */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-mono">Execution Status</span>
              <div className="text-sm font-bold text-white mt-0.5 font-mono">{job.status}</div>
            </div>
            {job.etherealPreviewUrl && (
              <a
                href={job.etherealPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 border border-amber-400/40 transition-all hover:brightness-110 active:scale-95"
              >
                <span>View Email in Ethereal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Queue & Execution Telemetry */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400">
              Distributed Queue Telemetry (BullMQ + Redis)
            </h4>
            <div className="grid grid-cols-2 gap-3 font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500">BullMQ State</span>
                <div className="font-bold text-indigo-300 capitalize">
                  {telemetry?.bullmq?.state || 'Active / Tracked'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500">Attempts Made</span>
                <div className="font-bold text-slate-200">
                  {job.attempts} of {job.maxAttempts || 3}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500">Throttling Delay</span>
                <div className="font-bold text-slate-200">{job.delaySeconds}s provider delay</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500">Sender Hourly Cap</span>
                <div className="font-bold text-slate-200">{job.hourlyLimit} / hour</div>
              </div>
            </div>
          </div>

          {/* Timestamps Lifecycle Trace */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400">
              Lifecycle Timestamps
            </h4>
            <div className="space-y-2 font-mono text-[11px] bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Enqueued At:</span>
                </span>
                <span className="text-slate-200">{format(new Date(job.createdAt), 'MMM d, yyyy • HH:mm:ss')}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-900">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scheduled Run:</span>
                </span>
                <span className="text-slate-200">{format(new Date(job.scheduledTime), 'MMM d, yyyy • HH:mm:ss')}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dispatched At:</span>
                </span>
                <span className="text-slate-200">
                  {job.sentTime ? format(new Date(job.sentTime), 'MMM d, yyyy • HH:mm:ss') : 'Pending execution'}
                </span>
              </div>
            </div>
          </div>

          {/* Email Payload Snapshot */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-400">
              Payload & Metadata
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
              <div>
                <span className="text-slate-500 font-mono">Recipient Lead:</span>
                <div className="font-semibold text-white font-mono mt-0.5">{job.toEmail}</div>
              </div>
              <div>
                <span className="text-slate-500 font-mono">Sender Mailbox:</span>
                <div className="font-mono text-slate-300 mt-0.5">{job.senderEmail}</div>
              </div>
              {job.etherealMessageId && (
                <div>
                  <span className="text-slate-500 font-mono">Ethereal Message ID:</span>
                  <div className="font-mono text-slate-400 text-[10px] break-all mt-0.5">
                    {job.etherealMessageId}
                  </div>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-mono">Message Body Preview:</span>
                <div className="text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[10px] whitespace-pre-wrap leading-relaxed mt-1 max-h-36 overflow-y-auto">
                  {job.body}
                </div>
              </div>
            </div>
          </div>

          {/* Failure Information if any */}
          {job.status === 'FAILED' && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Job Failure Diagnostics</span>
              </div>
              <div className="text-[11px] font-mono mt-1 text-slate-300">
                Reason: {job.errorMessage || 'Worker execution encountered an unhandled error'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Attempts exhausted: {job.attempts}/{job.maxAttempts}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
