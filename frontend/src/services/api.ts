import axios from 'axios';
import { EmailJob, Sender, SlackStatus, DashboardStats, ScheduleEmailPayload, User } from '../types';

const API_BASE = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Auth
  googleLogin: async (credential: string) => {
    const res = await apiClient.post<{ success: boolean; token: string; user: User }>('/auth/google', { credential });
    return res.data;
  },

  demoLogin: async () => {
    const res = await apiClient.post<{ success: boolean; token: string; user: User }>('/auth/demo');
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient.get<{ user: User }>('/auth/me');
    return res.data;
  },

  // Emails
  scheduleEmails: async (payload: ScheduleEmailPayload) => {
    const res = await apiClient.post<{ success: boolean; message: string; count: number; jobs: EmailJob[] }>('/emails/schedule', payload);
    return res.data;
  },

  getScheduledEmails: async (params?: { page?: number; limit?: number; sender?: string }) => {
    const res = await apiClient.get<{ total: number; page: number; totalPages: number; items: EmailJob[] }>('/emails/scheduled', { params });
    return res.data;
  },

  getSentEmails: async (params?: { page?: number; limit?: number; sender?: string }) => {
    const res = await apiClient.get<{ total: number; page: number; totalPages: number; items: EmailJob[] }>('/emails/sent', { params });
    return res.data;
  },

  searchEmails: async (params: { q?: string; status?: string; sender?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<{ source: string; total: number; page: number; totalPages: number; items: EmailJob[] }>('/emails/search', { params });
    return res.data;
  },

  cancelEmail: async (id: string) => {
    const res = await apiClient.delete<{ success: boolean; message: string; job: EmailJob }>(`/emails/${id}`);
    return res.data;
  },

  parseCsv: async (file?: File, text?: string) => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<import('../types').CsvDiagnostics>('/emails/parse-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } else {
      const res = await apiClient.post<import('../types').CsvDiagnostics>('/emails/parse-csv', { text });
      return res.data;
    }
  },

  getActivity: async () => {
    const res = await apiClient.get<import('../types').ActivityEvent[]>('/emails/activity');
    return res.data;
  },

  getJobTelemetry: async (id: string) => {
    const res = await apiClient.get<import('../types').JobTelemetry>(`/emails/telemetry/${id}`);
    return res.data;
  },

  getHealth: async () => {
    const res = await apiClient.get<import('../types').SystemHealthData>('/health');
    return res.data;
  },

  getStats: async () => {
    const res = await apiClient.get<DashboardStats>('/emails/stats');
    return res.data;
  },

  // Senders
  getSenders: async () => {
    const res = await apiClient.get<Sender[]>('/senders');
    return res.data;
  },

  addSender: async (sender: { name: string; email: string; hourlyLimit: number }) => {
    const res = await apiClient.post<Sender>('/senders', sender);
    return res.data;
  },

  resetSenderLimit: async (email: string) => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/senders/reset-limit', { email });
    return res.data;
  },

  // Slack
  getSlackStatus: async () => {
    const res = await apiClient.get<SlackStatus>('/slack/status');
    return res.data;
  },

  saveSlackWebhook: async (webhookUrl: string, channelName?: string) => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/slack/webhook', { webhookUrl, channelName });
    return res.data;
  },

  sendSlackTest: async () => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/slack/test');
    return res.data;
  },

  disconnectSlack: async () => {
    const res = await apiClient.post<{ success: boolean; message: string }>('/slack/disconnect');
    return res.data;
  },
};
