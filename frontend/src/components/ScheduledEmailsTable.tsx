import React from 'react';
import { EmailJob } from '../types';
import { Clock, Search, Trash2, Calendar, AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ScheduledEmailsTableProps {
  emails: EmailJob[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCancelEmail: (id: string) => void;
  onRefresh: () => void;
  searchSource?: string;
}

export const ScheduledEmailsTable: React.FC<ScheduledEmailsTableProps> = ({
  emails,
  loading,
  searchQuery,
  onSearchChange,
  onCancelEmail,
  onRefresh,
  searchSource,
}) => {
  const getStatusBadge = (status: EmailJob['status']) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mr-1.5 animate-pulse" />
            Scheduled
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-spin" />
            Processing
          </span>
        );
      case 'RATE_LIMITED_RESCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rate-Limited (Deferred)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const formatScheduledTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const isFuture = date.getTime() > Date.now();
      const relative = formatDistanceToNow(date, { addSuffix: true });
      const exact = format(date, 'MMM d, yyyy • h:mm:ss a');
      return { relative, exact, isFuture };
    } catch {
      return { relative: isoString, exact: isoString, isFuture: true };
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
            placeholder="Search scheduled emails by lead, subject..."
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
              <th className="py-3.5 px-6">Scheduled Dispatch</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              // Skeleton Loader
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
                    <div className="h-5 bg-slate-800 rounded-full w-20" />
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="h-6 bg-slate-800 rounded w-8 ml-auto" />
                  </td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">No scheduled emails in queue</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {searchQuery
                          ? `No emails match your query "${searchQuery}".`
                          : 'Your queue is currently clear. Click "Compose New Email" to schedule your next outreach campaign!'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((job) => {
                const timeInfo = formatScheduledTime(job.scheduledTime);
                return (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Recipient */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[11px]">
                          {job.toEmail[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{job.toEmail}</span>
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

                    {/* Scheduled Time */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-1.5 text-slate-200 font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{timeInfo.relative}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {timeInfo.exact}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      {getStatusBadge(job.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => onCancelEmail(job.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Cancel this scheduled email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
