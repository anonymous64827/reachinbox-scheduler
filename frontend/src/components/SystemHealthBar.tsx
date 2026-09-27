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
    <div className="bg-[#09090d] border-y border-amber-500/20 px-6 py-2.5 text-[11px] font-mono text-zinc-400 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-4">
        {/* Left: Overall Health */}
        <div className="flex items-center space-x-2.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-zinc-200 font-bold uppercase tracking-widest text-[10px]">
            Foundry Core:
          </span>
          <span className="text-amber-400 font-bold tracking-wider">ALL SYSTEMS NOMINAL</span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-400">Uptime: {Math.floor(health.uptimeSeconds / 60)}m</span>
        </div>

        {/* Right: Individual Telemetry Nodes */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Redis */}
          <div className="flex items-center space-x-1.5" title={`Redis at ${services.redis.host}:${services.redis.port}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${services.redis.status === 'UP' ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' : 'bg-rose-500'}`} />
            <span className="text-zinc-300">Redis</span>
            <span className="text-amber-400/90 font-semibold">{services.redis.latencyMs}ms</span>
          </div>

          <span className="text-zinc-800">|</span>

          {/* Database */}
          <div className="flex items-center space-x-1.5" title={`Database (${services.database.type})`}>
            <span className={`w-1.5 h-1.5 rounded-full ${services.database.status === 'UP' ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' : 'bg-rose-500'}`} />
            <span className="text-zinc-300">DB</span>
            <span className="text-amber-400/90 font-semibold">{services.database.latencyMs}ms</span>
          </div>

          <span className="text-zinc-800">|</span>

          {/* BullMQ */}
          <div className="flex items-center space-x-1.5" title={`BullMQ Queue with Concurrency: ${services.queue.concurrency}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_#facc15]" />
            <span className="text-zinc-300">BullMQ</span>
            <span className="text-yellow-400/90 font-semibold">{services.queue.concurrency}x Worker</span>
          </div>

          <span className="text-zinc-800">|</span>

          {/* SMTP */}
          <div className="flex items-center space-x-1.5" title={`Ethereal SMTP Relay: ${services.smtp.account}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="text-zinc-300">SMTP</span>
            <span className="text-emerald-400 font-semibold">Ethereal</span>
          </div>

          <span className="text-zinc-800">|</span>

          {/* Search */}
          <div className="flex items-center space-x-1.5" title={services.elasticsearch.fallbackMode ? 'Elasticsearch fallback active' : 'Elasticsearch cluster connected'}>
            <span className={`w-1.5 h-1.5 rounded-full ${services.elasticsearch.status === 'UP' ? 'bg-amber-400' : 'bg-zinc-600'}`} />
            <span className="text-zinc-300">Search</span>
            <span className="text-zinc-400 font-semibold">{services.elasticsearch.status === 'UP' ? 'ES Node' : 'DB Fallback'}</span>
          </div>

          <span className="text-zinc-800">|</span>

          {/* Slack */}
          <div className="flex items-center space-x-1.5" title={services.slack.channel || 'Slack Status'}>
            <span className={`w-1.5 h-1.5 rounded-full ${services.slack.status === 'CONNECTED' ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
            <span className="text-zinc-300">Slack</span>
            <span className="text-zinc-400">{services.slack.status === 'CONNECTED' ? 'Ready' : 'Standby'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
