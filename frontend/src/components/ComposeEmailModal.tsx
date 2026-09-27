import React, { useState, useRef } from 'react';
import { Sender, CsvDiagnostics } from '../types';
import { api } from '../services/api';
import { X, UploadCloud, FileText, Clock, Send, Sparkles, Check, AlertTriangle, Eye, Edit3, ShieldAlert, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface ComposeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  onScheduledSuccess: () => void;
}

export const ComposeEmailModal: React.FC<ComposeEmailModalProps> = ({
  isOpen,
  onClose,
  senders,
  onScheduledSuccess,
}) => {
  const [selectedSender, setSelectedSender] = useState<string>(senders[0]?.email || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(
    `Hi there,\n\nI noticed ReachInbox has been transforming outbound cold email infrastructure with AI-powered workflows. We’d love to connect and share how our automated lead sequences can scale your outreach.\n\nBest regards,\nGrowth Team`
  );
  const [leadsText, setLeadsText] = useState('demo.lead1@outboxlabs.com\ndemo.lead2@outboxlabs.com\nsarah.growth@venture.io');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([
    'demo.lead1@outboxlabs.com',
    'demo.lead2@outboxlabs.com',
    'sarah.growth@venture.io',
  ]);
  const [diagnostics, setDiagnostics] = useState<CsvDiagnostics | null>(null);

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [startTimeMode, setStartTimeMode] = useState<'now' | 'custom'>('now');
  const [customStartTime, setCustomStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentSenderObj = senders.find((s) => s.email === selectedSender) || senders[0];
  const remainingQuota = currentSenderObj?.remaining ?? (currentSenderObj?.hourlyLimit || 50);

  // Real-time parser for textarea changes
  const handleLeadsTextChange = (text: string) => {
    setLeadsText(text);
    const rawTokens = text.split(/[\r\n,;]+/).map((t) => t.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const duplicates: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    for (const t of rawTokens) {
      const clean = t.replace(/["'<>]/g, '').trim();
      if (!clean) continue;
      if (emailRegex.test(clean)) {
        const lower = clean.toLowerCase();
        if (seen.has(lower)) {
          duplicates.push(lower);
        } else {
          seen.add(lower);
          valid.push(lower);
        }
      } else {
        if (!['email', 'emails', 'recipient', 'contact'].includes(clean.toLowerCase())) {
          invalid.push(clean);
        }
      }
    }

    setDetectedEmails(valid);
    setDiagnostics({
      totalEvaluated: rawTokens.length,
      validCount: valid.length,
      duplicateCount: duplicates.length,
      invalidCount: invalid.length,
      sample: valid.slice(0, 5),
      emails: valid,
    });
  };

  // File Upload parser with deep diagnostics
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const data = await api.parseCsv(file);
      setDiagnostics(data);
      if (data.emails && data.emails.length > 0) {
        setDetectedEmails(data.emails);
        setLeadsText(data.emails.join('\n'));
        toast.success(`Intake: ${data.validCount} valid leads detected (${data.duplicateCount} duplicates filtered)`);
      } else {
        toast.error('No valid email addresses found in the uploaded file.');
      }
    } catch (err: any) {
      toast.error('Failed to parse file: ' + (err.message || 'Unknown error'));
    } finally {
      setParsing(false);
    }
  };

  const setPresetSchedule = (minutesFromNow: number) => {
    setStartTimeMode('custom');
    const date = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setCustomStartTime(localIso);
  };

  // Calculate Dispatch Projection
  const totalLeads = detectedEmails.length;
  const totalDurationSeconds = totalLeads > 1 ? (totalLeads - 1) * delaySeconds : 0;
  const durationMinutes = Math.floor(totalDurationSeconds / 60);
  const durationRemainingSeconds = totalDurationSeconds % 60;
  const durationFormatted = durationMinutes > 0
    ? `${durationMinutes}m ${durationRemainingSeconds}s`
    : `${totalDurationSeconds}s`;

  const willRollover = totalLeads > remainingQuota;
  const rolloverCount = Math.max(0, totalLeads - remainingQuota);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSender) {
      toast.error('Please choose a sender address');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please provide an email subject');
      return;
    }

    if (!body.trim()) {
      toast.error('Please provide an email message body');
      return;
    }

    if (detectedEmails.length === 0) {
      toast.error('Please provide at least one valid recipient lead email address');
      return;
    }

    let finalStartTime = 'now';
    if (startTimeMode === 'custom') {
      if (!customStartTime) {
        toast.error('Please specify a valid start time');
        return;
      }
      finalStartTime = new Date(customStartTime).toISOString();
    }

    setSubmitting(true);
    try {
      const response = await api.scheduleEmails({
        toEmails: detectedEmails,
        senderEmail: selectedSender,
        subject,
        body,
        startTime: finalStartTime,
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success(response.message || `Scheduled ${detectedEmails.length} email(s) into BullMQ queue!`);
      onScheduledSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to schedule emails');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[94vh] flex flex-col bg-[#0a0a0f] border border-amber-500/25 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-500/15 flex items-center justify-between bg-zinc-950/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.15)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">Campaign Dispatch Command Center</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  BullMQ Foundry Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">Configure delayed queue jobs, provider throttling, and hourly thresholds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Sender Select with Live Quota */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                From (Sender Mailbox)
              </label>
              <span className="text-[11px] font-mono text-indigo-400">
                Remaining Quota: <strong>{remainingQuota} slots</strong> this hour
              </span>
            </div>
            <select
              value={selectedSender}
              onChange={(e) => {
                setSelectedSender(e.target.value);
                const s = senders.find((snd) => snd.email === e.target.value);
                if (s) setHourlyLimit(s.hourlyLimit);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.email}>
                  {s.name} &lt;{s.email}&gt; • ({s.currentHourCount || 0}/{s.hourlyLimit} sent this hour)
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Accelerating outbound revenue at scale"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Body with Edit / Live Preview Tabs */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Email Message Body
              </label>
              <div className="flex space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center space-x-1 px-2.5 py-0.5 rounded ${activeTab === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center space-x-1 px-2.5 py-0.5 rounded ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Rendered Preview</span>
                </button>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Write your email template here..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
                required
              />
            ) : (
              <div className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 font-sans whitespace-pre-wrap leading-relaxed min-h-[96px] border-l-4 border-l-indigo-500">
                {body || <span className="text-slate-600 italic">No message content entered yet.</span>}
              </div>
            )}
          </div>

          {/* Leads Intake & Diagnostics */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Recipient Leads Intake</span>
              </label>

              {/* Real-time Diagnostics Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {detectedEmails.length} Valid Leads
                </span>
                {diagnostics && diagnostics.duplicateCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    {diagnostics.duplicateCount} Duplicates Filtered
                  </span>
                )}
                {diagnostics && diagnostics.invalidCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    {diagnostics.invalidCount} Invalid Skipped
                  </span>
                )}
              </div>
            </div>

            {/* Drag & Drop Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl p-3 text-center cursor-pointer transition-colors group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 group-hover:text-indigo-300">
                <UploadCloud className="w-4 h-4 text-indigo-400" />
                <span>{parsing ? 'Parsing leads...' : 'Upload CSV / TXT of leads (auto-parsed & deduplicated)'}</span>
              </div>
            </div>

            {/* Leads Text Input */}
            <textarea
              value={leadsText}
              onChange={(e) => handleLeadsTextChange(e.target.value)}
              rows={2}
              placeholder="Paste email addresses here (one per line, comma or space separated)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Scheduling & Throttling Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Dispatch Start Time
              </label>
              <div className="space-y-2">
                <div className="flex rounded-lg overflow-hidden border border-slate-800 p-0.5 bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setStartTimeMode('now')}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                      startTimeMode === 'now'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Right Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartTimeMode('custom')}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                      startTimeMode === 'custom'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Scheduled
                  </button>
                </div>

                {startTimeMode === 'custom' && (
                  <div className="space-y-1.5">
                    <input
                      type="datetime-local"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPresetSchedule(5)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        +5m
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetSchedule(30)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        +30m
                      </button>
                      <button
                        type="button"
                        onClick={() => setPresetSchedule(120)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        +2h
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Delay Between Sends */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Delay Between Sends
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  sec
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Provider throttling delay</p>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hourly Limit (Cap)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  / hr
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Triggers Slack notification</p>
            </div>
          </div>

          {/* Dispatch Plan Projection Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400">
              Dispatch Plan Projection
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Total Jobs:</span>
                <div className="font-bold text-slate-200">{totalLeads} recipients</div>
              </div>
              <div>
                <span className="text-slate-500">Throttling:</span>
                <div className="font-bold text-indigo-300">{delaySeconds}s / email</div>
              </div>
              <div>
                <span className="text-slate-500">Estimated Duration:</span>
                <div className="font-bold text-slate-200">{durationFormatted}</div>
              </div>
              <div>
                <span className="text-slate-500">Window Consumption:</span>
                <div className="font-bold text-slate-200">{totalLeads} / {hourlyLimit}</div>
              </div>
            </div>

            {willRollover && (
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center space-x-2 text-[11px] text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  Notice: Batch ({totalLeads}) exceeds remaining quota ({remainingQuota}). First {remainingQuota} will dispatch now; remaining {rolloverCount} will cleanly rollover to next hour window with a Slack alert.
                </span>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || detectedEmails.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 disabled:opacity-50 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 border border-amber-400/40 transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>{submitting ? 'Enqueuing into BullMQ...' : `Schedule ${detectedEmails.length} Email(s)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
