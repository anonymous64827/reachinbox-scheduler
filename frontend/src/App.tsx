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
import { Plus, Calendar, CheckCircle2, RefreshCw } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);

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

  // Fetch Scheduled or Sent Emails
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const statusFilter = activeTab === 'scheduled' ? 'SCHEDULED' : 'SENT';
        const data = await api.searchEmails({ q: searchQuery.trim(), status: statusFilter });
        setSearchSource(data.source);
        if (activeTab === 'scheduled') {
          setScheduledEmails(data.items);
        } else {
          setSentEmails(data.items);
        }
      } else {
        setSearchSource('');
        if (activeTab === 'scheduled') {
          const data = await api.getScheduledEmails();
          setScheduledEmails(data.items);
        } else {
          const data = await api.getSentEmails();
          setSentEmails(data.items);
        }
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Email Outreach Engine
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Persistent BullMQ job scheduling, Ethereal fake SMTP delivery, and sliding hourly rate limits.
            </p>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer group shrink-0"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Stats Overview */}
        <StatsOverview stats={stats} onRefresh={fetchGlobalData} />

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => {
              setActiveTab('scheduled');
              setSearchQuery('');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'scheduled'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Scheduled Emails</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {stats?.counts?.scheduled ?? 0}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('sent');
              setSearchQuery('');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'sent'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sent Emails</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {stats?.counts?.sent ?? 0}
            </span>
          </button>
        </div>

        {/* Table View */}
        {activeTab === 'scheduled' ? (
          <ScheduledEmailsTable
            emails={scheduledEmails}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCancelEmail={handleCancelEmail}
            onRefresh={fetchEmails}
            searchSource={searchSource}
          />
        ) : (
          <SentEmailsTable
            emails={sentEmails}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={fetchEmails}
            searchSource={searchSource}
          />
        )}
      </main>

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
