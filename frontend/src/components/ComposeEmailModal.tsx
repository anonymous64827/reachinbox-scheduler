import React, { useState, useRef } from 'react';
import { Sender } from '../types';
import { api } from '../services/api';
import { X, UploadCloud, FileText, Clock, Send, Sparkles, Check, AlertCircle, Layers } from 'lucide-react';
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
  const [startTimeMode, setStartTimeMode] = useState<'now' | 'custom'>('now');
  const [customStartTime, setCustomStartTime] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Real-time parser for textarea changes
  const handleLeadsTextChange = (text: string) => {
    setLeadsText(text);
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const unique = Array.from(new Set(matches.map((e) => e.toLowerCase())));
    setDetectedEmails(unique);
  };

  // File Upload parser
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    try {
      const data = await api.parseCsv(file);
      if (data.emails && data.emails.length > 0) {
        setDetectedEmails(data.emails);
        setLeadsText(data.emails.join('\n'));
        toast.success(`Parsed ${data.emails.length} unique leads from ${file.name}`);
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
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setCustomStartTime(localIso);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Compose & Schedule Campaign</h3>
              <p className="text-xs text-slate-400">Configure BullMQ delayed jobs, throttling, and hourly thresholds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Sender Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              From (Sender Mailbox)
            </label>
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
              placeholder="e.g. Accelerating your outbound email growth at scale"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Email Message Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Write your email template here..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono leading-relaxed"
              required
            />
          </div>

          {/* Leads Upload & Paste Section */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Recipient Leads (CSV, TXT, or Paste)</span>
              </label>

              {/* Detected Counter */}
              <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold">
                <Check className="w-3 h-3 text-indigo-400" />
                <span>{detectedEmails.length} Leads Detected</span>
              </div>
            </div>

            {/* Drag & Drop / File Input */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl p-3 text-center cursor-pointer transition-colors mb-3 group"
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
                <span>{parsing ? 'Parsing uploaded file...' : 'Click to upload leads file (.csv, .txt)'}</span>
              </div>
            </div>

            {/* Paste Textarea */}
            <textarea
              value={leadsText}
              onChange={(e) => handleLeadsTextChange(e.target.value)}
              rows={3}
              placeholder="Paste email addresses here (one per line, comma or space separated)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Scheduling & Throttling Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Start Time
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
                    Later
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" title="Delay between sending consecutive emails">
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
              <p className="text-[10px] text-slate-500 mt-1">Min 2s recommended</p>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" title="Maximum emails allowed per hour for this sender">
                Hourly Rate Limit
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
              <p className="text-[10px] text-slate-500 mt-1">Triggers Slack alert</p>
            </div>
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
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Scheduling in BullMQ...' : `Schedule ${detectedEmails.length} Email(s)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
