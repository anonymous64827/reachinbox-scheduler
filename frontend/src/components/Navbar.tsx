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
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-amber-500/15 px-6 py-3.5 transition-all shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/40">
            <Mail className="w-5 h-5 text-black font-extrabold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-zinc-100 via-amber-100 to-amber-400 bg-clip-text text-transparent">
                ReachInbox
              </span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                Foundry Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">Precision Job Queue & Rate-Limiter</p>
          </div>
        </div>

        {/* Center Live Badges */}
        <div className="hidden md:flex items-center space-x-2.5 text-xs">
          {/* Redis Indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Redis v5/7</span>
          </div>

          {/* BullMQ Queue */}
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all font-mono text-[11px] group"
            title="Open Live BullMQ Queue Monitor"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>BullMQ Dashboard</span>
            <ExternalLink className="w-3 h-3 text-amber-400/70" />
          </a>

          {/* Elasticsearch status */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              stats?.elasticsearch?.connected
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
            title={stats?.elasticsearch?.connected ? 'Elasticsearch cluster connected' : 'Elasticsearch fallback to DB active'}
          >
            <Database className="w-3 h-3 text-amber-400/80" />
            <span>{stats?.elasticsearch?.connected ? 'ES Index Ready' : 'DB Search Active'}</span>
          </div>
        </div>

        {/* Right Action Items */}
        <div className="flex items-center space-x-4">
          {/* Slack Integration Button */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              slackStatus?.connected
                ? 'bg-[#4A154B]/30 text-amber-200 border-amber-500/30 hover:bg-[#4A154B]/50'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-500/40 hover:text-white'
            }`}
          >
            <Slack className="w-4 h-4 text-[#ECB22E]" />
            <span className="hidden sm:inline font-mono text-[11px]">
              {slackStatus?.connected ? (slackStatus.channelName || 'Slack Connected') : 'Connect Slack'}
            </span>
            {slackStatus?.connected && <CheckCircle className="w-3 h-3 text-emerald-400" />}
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-3 pl-2 border-l border-zinc-800">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="w-8 h-8 rounded-full ring-2 ring-amber-500/40 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40 flex items-center justify-center font-bold text-xs font-mono">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
            )}

            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-zinc-200 leading-tight">
                {user.name || user.email.split('@')[0]}
              </div>
              <div className="text-[11px] text-zinc-500 leading-tight truncate max-w-[140px] font-mono">
                {user.email}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
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
