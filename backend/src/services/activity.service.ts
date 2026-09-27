import { redisClient } from '../config/redis';

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

const REDIS_ACTIVITY_KEY = 'system:activity_stream';
const MAX_EVENTS = 100;

class ActivityService {
  async record(event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<ActivityEvent> {
    const fullEvent: ActivityEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };

    try {
      await redisClient.lpush(REDIS_ACTIVITY_KEY, JSON.stringify(fullEvent));
      await redisClient.ltrim(REDIS_ACTIVITY_KEY, 0, MAX_EVENTS - 1);
    } catch (err: any) {
      console.warn('⚠️ Could not buffer activity event to Redis:', err.message);
    }

    return fullEvent;
  }

  async getRecent(limit: number = 30): Promise<ActivityEvent[]> {
    try {
      const items = await redisClient.lrange(REDIS_ACTIVITY_KEY, 0, limit - 1);
      return items.map((raw) => JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      await redisClient.del(REDIS_ACTIVITY_KEY);
    } catch {}
  }
}

export const activityService = new ActivityService();
