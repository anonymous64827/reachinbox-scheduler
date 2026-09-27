export interface EmailSchedulePayload {
  toEmails: string[];
  senderEmail: string;
  senderName?: string;
  subject: string;
  body: string;
  startTime: string; // ISO date string
  delaySeconds: number;
  hourlyLimit: number;
}

export interface EmailJobData {
  jobRecordId: string;
  toEmail: string;
  senderEmail: string;
  senderName?: string;
  subject: string;
  body: string;
  scheduledTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  attempt: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
}

export interface SlackNotificationPayload {
  senderEmail: string;
  hourlyLimit: number;
  currentCount: number;
  rescheduledCount: number;
  rescheduledToTime: string;
}

export interface SearchQuery {
  q?: string;
  status?: string;
  sender?: string;
  page?: number;
  limit?: number;
}
