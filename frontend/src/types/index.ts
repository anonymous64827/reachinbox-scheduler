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
  remaining?: number;
  percentUsed?: number;
  isRateLimited?: boolean;
  nextWindowTime?: string;
  slackAlertSent?: boolean;
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

export interface ActivityEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  type: 
    | 'JOB_SCHEDULED'
    | 'WORKER_ACQUIRED'
    | 'RATE_LIMIT_CHECK'
    | 'RATE_LIMIT_DEFERRED'
    | 'SLACK_NOTIFIED'
    | 'SMTP_DISPATCHING'
    | 'EMAIL_DELIVERED'
    | 'JOB_RETRY'
    | 'JOB_CANCELLED'
    | 'SYSTEM_RECONCILE';
  jobId?: string;
  sender?: string;
  recipient?: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface CsvDiagnostics {
  totalEvaluated: number;
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
  sample: string[];
  emails: string[];
  diagnostics?: {
    duplicatesSample: string[];
    invalidSample: string[];
  };
}

export interface JobTelemetry {
  jobRecord: EmailJob;
  bullmq: {
    jobId: string;
    state: string;
    attemptsMade: number;
    delayMs: number;
  };
  lifecycle: {
    created: string;
    scheduled: string;
    sent: string | null;
    status: string;
    durationMs: number | null;
  };
}

export interface SystemHealthData {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
  services: {
    redis: { status: string; latencyMs: number; host: string; port: number };
    database: { status: string; latencyMs: number; type: string };
    queue: { status: string; concurrency: number; minThrottlingSeconds: number; counts: any };
    smtp: { status: string; provider: string; account: string };
    elasticsearch: { status: string; node: string; fallbackMode: boolean };
    slack: { status: string; channel: string | null };
  };
  bullBoardUrl: string;
}
