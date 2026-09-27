export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface EmailJob {
  id: string;
  toEmail: string;
  senderEmail: string;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED' | 'RATE_LIMITED_RESCHEDULED' | 'CANCELLED';
  scheduledTime: string;
  sentTime?: string | null;
  delaySeconds: number;
  hourlyLimit: number;
  attempts: number;
  maxAttempts: number;
  etherealPreviewUrl?: string | null;
  etherealMessageId?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  hourlyLimit: number;
  active: boolean;
  currentHourCount: number;
}

export interface SlackStatus {
  connected: boolean;
  teamName: string | null;
  channelName: string | null;
  isActive: boolean;
}

export interface DashboardStats {
  counts: {
    scheduled: number;
    sent: number;
    failed: number;
    rescheduled: number;
    activeSenders: number;
  };
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
  };
  elasticsearch: {
    connected: boolean;
  };
}

export interface ScheduleEmailPayload {
  toEmails: string[];
  senderEmail: string;
  senderName?: string;
  subject: string;
  body: string;
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
}
