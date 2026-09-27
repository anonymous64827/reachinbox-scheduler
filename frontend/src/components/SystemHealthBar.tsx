import React, { useState, useEffect } from 'react';
import { SystemHealthData } from '../types';
import { api } from '../services/api';
import { Database, Server, Cpu, Mail, Search, Slack, ShieldCheck } from 'lucide-react';

interface SystemHealthBarProps {
  health?: SystemHealthData | null;
}

export const SystemHealthBar: React.FC<SystemHealthBarProps> = ({ health: propHealth }) => {
  const [internalHealth, setInternalHealth] = useState<SystemHealthData | null>(null);

  useEffect(() => {
    if (propHealth === undefined) {
      const fetchH = () => {
        api.getHealth().then(setInternalHealth).catch(() => {});
      };
      fetchH();
      const interval = setInterval(fetchH, 6000);
      return () => clearInterval(interval);
    }
  }, [propHealth]);

  const health = propHealth !== undefined ? propHealth : internalHealth;
  if (!health) return null;

  const { services } = health;

  return (
    <div className="bg-[#090e1c] border-y border-slate-800/80 px-6 py-2 text-[11px] font-mono text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
        {/* Left: Overall Health */}
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-200 font-bold uppercase tracking-wider text-[10px]">
            Engine Status:
          </span>
          <span className="text-emerald-400 font-semibold">ALL SYSTEMS NOMINAL</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500">Uptime: {Math.floor(health.uptimeSeconds / 60)}m</span>
        </div>

        {/* Right: Individual Telemetry Nodes */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Redis */}
          <div className="flex items-center space-x-1.5" title={`Redis at ${services.redis.host}:${services.redis.port}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${services.redis.status === 'UP' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-300">Redis</span>
            <span className="text-slate-500 font-semibold">{services.redis.latencyMs}ms</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Database */}
          <div className="flex items-center space-x-1.5" title={`Database (${services.database.type})`}>
            <span className={`w-1.5 h-1.5 rounded-full ${services.database.status === 'UP' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-300">DB</span>
            <span className="text-slate-500 font-semibold">{services.database.latencyMs}ms</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* BullMQ */}
          <div className="flex items-center space-x-1.5" title={`BullMQ Queue with Concurrency: ${services.queue.concurrency}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            <span className="text-slate-300">BullMQ</span>
            <span className="text-indigo-400 font-semibold">{services.queue.concurrency}x Worker</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* SMTP */}
          <div className="flex items-center space-x-1.5" title={`Ethereal SMTP Relay: ${services.smtp.account}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">SMTP</span>
            <span className="text-emerald-400 font-semibold">Ethereal</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Search */}
          <div className="flex items-center space-x-1.5" title={services.elasticsearch.fallbackMode ? 'Elasticsearch fallback active' : 'Elasticsearch cluster connected'}>
            <span className={`w-1.5 h-1.5 rounded-full ${services.elasticsearch.status === 'UP' ? 'bg-amber-400' : 'bg-slate-500'}`} />
            <span className="text-slate-300">Search</span>
            <span className="text-slate-400 font-semibold">{services.elasticsearch.status === 'UP' ? 'ES Node' : 'DB Fallback'}</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Slack */}
          <div className="flex items-center space-x-1.5" title={services.slack.channel || 'Slack Status'}>
            <span className={`w-1.5 h-1.5 rounded-full ${services.slack.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            <span className="text-slate-300">Slack</span>
            <span className="text-slate-400">{services.slack.status === 'CONNECTED' ? 'Ready' : 'Standby'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
