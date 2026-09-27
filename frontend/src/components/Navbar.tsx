import React from 'react';
import { User, SlackStatus, DashboardStats } from '../types';
import { Mail, Activity, Slack, ExternalLink, LogOut, CheckCircle, Database } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  slackStatus: SlackStatus | null;
  onOpenSlackModal: () => void;
  stats: DashboardStats | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  slackStatus,
  onOpenSlackModal,
  stats,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0d1322]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                ReachInbox
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Email Scheduler
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Production Job Queue & Throttling Engine</p>
          </div>
        </div>

        {/* Center Live Badges */}
        <div className="hidden md:flex items-center space-x-2 text-xs">
          {/* Redis Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Redis v5/7</span>
          </div>

          {/* BullMQ Queue */}
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all font-medium group"
            title="Open Live BullMQ Queue Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>BullMQ Dashboard</span>
            <ExternalLink className="w-3 h-3 text-indigo-400/70" />
          </a>

          {/* Elasticsearch status */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              stats?.elasticsearch?.connected
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={stats?.elasticsearch?.connected ? 'Elasticsearch cluster connected' : 'Elasticsearch fallback to DB active'}
          >
            <Database className="w-3 h-3" />
            <span>{stats?.elasticsearch?.connected ? 'ES Index Ready' : 'DB Search Active'}</span>
          </div>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center space-x-4">
          {/* Slack Integration Button */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              slackStatus?.connected
                ? 'bg-[#4A154B]/30 text-pink-300 border-pink-500/40 hover:bg-[#4A154B]/50'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Slack className="w-4 h-4 text-[#ECB22E]" />
            <span className="hidden sm:inline">
              {slackStatus?.connected ? (slackStatus.channelName || 'Slack Connected') : 'Connect Slack'}
            </span>
            {slackStatus?.connected && <CheckCircle className="w-3 h-3 text-emerald-400" />}
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="w-8 h-8 rounded-full ring-2 ring-indigo-500/40 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-500/40">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
            )}

            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-200 leading-tight">
                {user.name || user.email.split('@')[0]}
              </div>
              <div className="text-[11px] text-slate-400 leading-tight truncate max-w-[140px]">
                {user.email}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
