import React from 'react';
import { EmailJob } from '../types';
import { Search, ExternalLink, CheckCircle2, XCircle, RefreshCw, MailCheck } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface SentEmailsTableProps {
  emails: EmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  searchSource?: string;
  onSelectJob?: (job: EmailJob) => void;
  selectedJobId?: string;
}

export const SentEmailsTable: React.FC<SentEmailsTableProps> = ({
  emails,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  searchSource,
  onSelectJob,
  selectedJobId,
}) => {
  const formatSentTime = (isoString?: string | null) => {
    if (!isoString) return { relative: 'Recently', exact: '' };
    try {
      const date = new Date(isoString);
      const relative = formatDistanceToNow(date, { addSuffix: true });
      const exact = format(date, 'MMM d, yyyy • h:mm:ss a');
      return { relative, exact };
    } catch {
      return { relative: isoString, exact: isoString };
    }
  };

  return (
    <div className="foundry-card rounded-2xl overflow-hidden shadow-xl">
      {/* Top Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-amber-500/15 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search sent emails by recipient, subject, body..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#08080c] border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono transition-colors"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          {searchSource && (
            <span className="text-[11px] font-mono text-zinc-400 hidden md:inline">
              Engine: <strong className="text-amber-400">{searchSource === 'elasticsearch' ? 'Elasticsearch' : 'Relational DB'}</strong>
            </span>
          )}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-400 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/80 text-zinc-400 font-mono font-semibold border-b border-amber-500/15 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-6">Recipient Lead</th>
              <th className="py-3.5 px-6">Sender</th>
              <th className="py-3.5 px-6">Subject</th>
              <th className="py-3.5 px-6">Sent Timestamp</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Ethereal Live View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-36" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-28" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-48" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-slate-800 rounded w-32" />
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-5 bg-slate-800 rounded-full w-16" />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="h-6 bg-slate-800 rounded w-24 ml-auto" />
                  </td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <MailCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">No sent emails recorded</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {searchQuery
                          ? `No sent emails match "${searchQuery}".`
                          : 'Emails dispatched by the BullMQ worker via Ethereal SMTP will appear here with live preview links.'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((job) => {
                const timeInfo = formatSentTime(job.sentTime);
                const isSent = job.status === 'SENT';
                const isSelected = selectedJobId === job.id;

                return (
                  <tr
                    key={job.id}
                    onClick={() => onSelectJob?.(job)}
                    className={`transition-colors cursor-pointer group ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-2 border-amber-500'
                        : 'hover:bg-amber-500/5 border-l-2 border-transparent'
                    }`}
                  >
                    {/* Recipient */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-[11px] font-mono">
                          {job.toEmail[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                          {job.toEmail}
                        </span>
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="py-4 px-6 text-zinc-300">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                        {job.senderEmail}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-4 px-6 text-zinc-200">
                      <div className="font-medium max-w-[260px] truncate" title={job.subject}>
                        {job.subject}
                      </div>
                      <div className="text-[11px] text-zinc-500 max-w-[260px] truncate mt-0.5 font-mono">
                        {job.body.slice(0, 60)}...
                      </div>
                    </td>

                    {/* Sent Time */}
                    <td className="py-4 px-6">
                      <div className="text-zinc-200 font-medium font-mono text-[11px]">{timeInfo.relative}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">{timeInfo.exact}</div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      {isSent ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20" title={job.errorMessage || 'Failed'}>
                          <XCircle className="w-3 h-3 mr-1" />
                          Failed
                        </span>
                      )}
                    </td>

                    {/* Preview in Ethereal & Inspect */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectJob?.(job);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-zinc-900 hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-500/30 transition-all shadow-sm"
                          title="Inspect job telemetry & execution breakdown"
                        >
                          Inspect
                        </button>
                        {job.etherealPreviewUrl ? (
                          <a
                            href={job.etherealPreviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/30 transition-all font-mono font-semibold text-xs shadow-sm"
                          >
                            <span>Live View</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-xs italic font-mono">No preview</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
