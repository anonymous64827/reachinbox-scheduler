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
    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Filter Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search sent emails by recipient, subject, body..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          {searchSource && (
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Engine: <strong className="text-slate-200">{searchSource === 'elasticsearch' ? 'Elasticsearch' : 'Relational DB'}</strong>
            </span>
          )}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
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
                        ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
                        : 'hover:bg-slate-800/40 border-l-2 border-transparent'
                    }`}
                  >
                    {/* Recipient */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                          {job.toEmail[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                          {job.toEmail}
                        </span>
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="py-4 px-6 text-slate-300">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300">
                        {job.senderEmail}
                      </span>
                    </td>

                    {/* Subject */}
                    <td className="py-4 px-6 text-slate-200">
                      <div className="font-medium max-w-[260px] truncate" title={job.subject}>
                        {job.subject}
                      </div>
                      <div className="text-[11px] text-slate-500 max-w-[260px] truncate mt-0.5">
                        {job.body.slice(0, 60)}...
                      </div>
                    </td>

                    {/* Sent Time */}
                    <td className="py-4 px-6">
                      <div className="text-slate-200 font-medium">{timeInfo.relative}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{timeInfo.exact}</div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      {isSent ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20" title={job.errorMessage || 'Failed'}>
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
                          className="px-2 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 border border-slate-700/60 transition-colors"
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
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all font-medium text-xs shadow-sm"
                          >
                            <span>View Email</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No preview</span>
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
