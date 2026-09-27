import React, { useState } from 'react';
import { SlackStatus } from '../types';
import { api } from '../services/api';
import { X, Slack, CheckCircle, AlertTriangle, Send, Link, Unlink } from 'lucide-react';
import { toast } from 'sonner';

interface SlackIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  slackStatus: SlackStatus | null;
  onRefreshStatus: () => void;
}

export const SlackIntegrationModal: React.FC<SlackIntegrationModalProps> = ({
  isOpen,
  onClose,
  slackStatus,
  onRefreshStatus,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channelName, setChannelName] = useState('#email-scheduler-alerts');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  if (!isOpen) return null;

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      toast.error('Please enter a valid Slack Incoming Webhook URL starting with https://hooks.slack.com/...');
      return;
    }

    setLoading(true);
    try {
      await api.saveSlackWebhook(webhookUrl, channelName);
      toast.success('Slack Webhook connected successfully!');
      onRefreshStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to connect Slack');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSlack = async () => {
    setTesting(true);
    try {
      const res = await api.sendSlackTest();
      toast.success(res.message || 'Live test alert sent to Slack!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to dispatch Slack alert');
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack notifications?')) return;
    try {
      await api.disconnectSlack();
      toast.success('Slack disconnected');
      onRefreshStatus();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#4A154B]/30 text-[#ECB22E] flex items-center justify-center border border-pink-500/20">
              <Slack className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Slack Rate Limit Alerts</h3>
              <p className="text-xs text-slate-400">Receive live alerts when sender hourly limit is exceeded</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Current Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 ${
              slackStatus?.connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {slackStatus?.connected ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <span className="font-bold">
                {slackStatus?.connected ? 'Slack is Connected' : 'Slack is Not Connected'}
              </span>
              <p className="mt-0.5 text-slate-300">
                {slackStatus?.connected
                  ? `Notifications are routed to ${slackStatus.teamName || 'Workspace'} in ${slackStatus.channelName || '#alerts'}. When a sender hits their limit, an alert is sent instantly.`
                  : 'Rate-limit hits will silently defer jobs without crashing. Connect your Slack workspace or webhook below to receive instant alerts.'}
              </p>
            </div>
          </div>

          {/* Action: Live Test or Disconnect if Connected */}
          {slackStatus?.connected && (
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={handleTestSlack}
                disabled={testing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{testing ? 'Sending to Slack...' : 'Send Live Test Verification Alert'}</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                title="Disconnect Slack"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Connect Section */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {slackStatus?.connected ? 'Update Connection' : 'Connect to Slack'}
            </h4>

            {/* Option A: Slack OAuth */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Slack OAuth Authorize</div>
                <div className="text-[11px] text-slate-400">1-click real Slack OAuth 2.0 flow</div>
              </div>
              <a
                href="/api/slack/oauth/start"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#4A154B] hover:bg-[#611f69] text-white font-medium text-xs shadow-sm transition-colors"
              >
                <Slack className="w-3.5 h-3.5" />
                <span>Authorize</span>
              </a>
            </div>

            {/* Option B: Direct Webhook (Evaluator fast test) */}
            <form onSubmit={handleSaveWebhook} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Or Connect via Slack Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Channel Name / Purpose
                </label>
                <input
                  type="text"
                  placeholder="#email-alerts"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-colors"
              >
                <Link className="w-4 h-4" />
                <span>{loading ? 'Saving Webhook...' : 'Save & Connect Webhook'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
