import React, { useState, useEffect, useCallback } from 'react';
import { User, EmailJob, Sender, SlackStatus, DashboardStats } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { ScheduledEmailsTable } from './components/ScheduledEmailsTable';
import { SentEmailsTable } from './components/SentEmailsTable';
import { ComposeEmailModal } from './components/ComposeEmailModal';
import { SlackIntegrationModal } from './components/SlackIntegrationModal';
import { LoginView } from './components/LoginView';
import { Plus, Calendar, CheckCircle2, RefreshCw, Activity } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { SystemHealthBar } from './components/SystemHealthBar';
import { DeliveryFlowVisualizer } from './components/DeliveryFlowVisualizer';
import { SenderCapacityGauge } from './components/SenderCapacityGauge';
import { ActivityLogStream } from './components/ActivityLogStream';
import { JobDetailDrawer } from './components/JobDetailDrawer';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent' | 'observability'>('scheduled');

  // Modals & Drawer
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Selected job for Flow Visualizer & Inspector Drawer
  const [selectedJob, setSelectedJob] = useState<EmailJob | null>(null);

  // Data states
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Search & Loading
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Check auth session on mount
  useEffect(() => {
    const token = localStorage.getItem('reachinbox_token');
    if (token) {
      api
        .getMe()
        .then((data) => {
          setUser(data.user);
        })
        .catch(() => {
          localStorage.removeItem('reachinbox_token');
          setUser(null);
        })
        .finally(() => {
          setAuthChecking(false);
        });
    } else {
      setAuthChecking(false);
    }
  }, []);

  // Fetch Senders & Slack status & Stats
  const fetchGlobalData = useCallback(async () => {
    try {
      const [sendersData, slackData, statsData] = await Promise.all([
        api.getSenders(),
        api.getSlackStatus(),
        api.getStats(),
      ]);
      setSenders(sendersData);
      setSlackStatus(slackData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching global state:', err);
    }
  }, []);

  // Fetch Scheduled and Sent Emails
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const statusFilter = activeTab === 'scheduled' ? 'SCHEDULED' : activeTab === 'sent' ? 'SENT' : undefined;
        const data = await api.searchEmails({ q: searchQuery.trim(), status: statusFilter });
        setSearchSource(data.source);
        const items = data.items;
        if (activeTab === 'scheduled') {
          setScheduledEmails(items);
        } else if (activeTab === 'sent') {
          setSentEmails(items);
        } else {
          setScheduledEmails(items.filter((j) => j.status === 'SCHEDULED'));
          setSentEmails(items.filter((j) => j.status === 'SENT'));
        }
        setSelectedJob((prev) => {
          if (!prev) return items[0] || null;
          const found = items.find((j) => j.id === prev.id);
          return found || prev;
        });
      } else {
        setSearchSource('');
        const [schedData, sentData] = await Promise.all([
          api.getScheduledEmails().catch(() => ({ items: [] })),
          api.getSentEmails().catch(() => ({ items: [] })),
        ]);
        setScheduledEmails(schedData.items);
        setSentEmails(sentData.items);
        setSelectedJob((prev) => {
          const allItems = [...schedData.items, ...sentData.items];
          if (!prev) return allItems[0] || null;
          const found = allItems.find((j) => j.id === prev.id);
          return found || prev;
        });
      }
    } catch (err: any) {
      toast.error('Failed to load email jobs: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  // Initial and reactive data load
  useEffect(() => {
    if (user) {
      fetchGlobalData();
      fetchEmails();
    }
  }, [user, fetchGlobalData, fetchEmails]);

  // Auto-refresh interval (every 4 seconds for live queue feedback)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchEmails();
      api.getStats().then(setStats).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [user, fetchEmails]);

  // Cancel Scheduled Email Handler
  const handleCancelEmail = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled email?')) return;
    try {
      await api.cancelEmail(id);
      toast.success('Scheduled email cancelled');
      fetchEmails();
      fetchGlobalData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to cancel email');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_token');
    setUser(null);
    toast.info('Signed out successfully');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginView
          onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      <Toaster position="top-right" richColors />

      {/* Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackModalOpen(true)}
        stats={stats}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Real-time System Infrastructure Health Bar */}
        <SystemHealthBar />

        {/* Header Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Foundry Outreach Core
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Industrial BullMQ queue orchestration, fake Ethereal SMTP transmission, and sliding rate limit enforcement.
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 border border-amber-400/30 transition-all cursor-pointer group shrink-0 active:scale-95"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200 stroke-[3]" />
            <span className="tracking-wide">Compose New Campaign</span>
          </button>
        </div>

        {/* Stats Overview */}
        <StatsOverview stats={stats} onRefresh={fetchGlobalData} />

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setSearchQuery('');
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'scheduled'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Scheduled Pipeline</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-900 border border-zinc-800 text-amber-400 font-mono font-semibold">
                {stats?.counts?.scheduled ?? scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sent');
                setSearchQuery('');
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'sent'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Dispatched Log</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-900 border border-zinc-800 text-emerald-400 font-mono font-semibold">
                {stats?.counts?.sent ?? sentEmails.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('observability');
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'observability'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Live Telemetry & Queues</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            <DeliveryFlowVisualizer
              job={selectedJob}
              onOpenTelemetry={() => setIsDrawerOpen(true)}
            />
            <ScheduledEmailsTable
              emails={scheduledEmails}
              loading={loading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onCancelEmail={handleCancelEmail}
              onRefresh={fetchEmails}
              searchSource={searchSource}
              onSelectJob={(job) => setSelectedJob(job)}
              selectedJobId={selectedJob?.id}
            />
          </div>
        )}

        {activeTab === 'sent' && (
          <div className="space-y-6">
            <DeliveryFlowVisualizer
              job={selectedJob}
              onOpenTelemetry={() => setIsDrawerOpen(true)}
            />
            <SentEmailsTable
              emails={sentEmails}
              loading={loading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRefresh={fetchEmails}
              searchSource={searchSource}
              onSelectJob={(job) => setSelectedJob(job)}
              selectedJobId={selectedJob?.id}
            />
          </div>
        )}

        {activeTab === 'observability' && (
          <div className="space-y-6">
            <DeliveryFlowVisualizer
              job={selectedJob}
              onOpenTelemetry={() => setIsDrawerOpen(true)}
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <SenderCapacityGauge senders={senders} onRefresh={fetchGlobalData} />
              </div>
              <div className="lg:col-span-7">
                <ActivityLogStream />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Slide-over Job Telemetry Inspector Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Compose Email Modal */}
      <ComposeEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onScheduledSuccess={() => {
          fetchEmails();
          fetchGlobalData();
        }}
      />

      {/* Slack Integration Modal */}
      <SlackIntegrationModal
        isOpen={isSlackModalOpen}
        onClose={() => setIsSlackModalOpen(false)}
        slackStatus={slackStatus}
        onRefreshStatus={fetchGlobalData}
      />
    </div>
  );
};

export default App;
