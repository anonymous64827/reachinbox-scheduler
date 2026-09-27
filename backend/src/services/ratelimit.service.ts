import { redisClient } from '../config/redis';
import { slackService } from './slack.service';
import { prisma } from '../config/db';
import { activityService } from './activity.service';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextWindowTime: Date;
  delayUntilNextWindowMs: number;
}

export interface SenderCapacityStatus {
  email: string;
  count: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  isRateLimited: boolean;
  nextWindowTime: string;
  slackAlertSent: boolean;
}

export class RateLimitService {
  /**
   * Generates a Redis key for the sender in the current 1-hour time window.
   * Format: ratelimit:sender:{senderEmail}:{YYYYMMDDHH}
   */
  private getWindowKey(senderEmail: string, date: Date = new Date()): { key: string; windowStr: string } {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const windowStr = `${year}${month}${day}${hour}`;
    return {
      key: `ratelimit:sender:${senderEmail.toLowerCase()}:${windowStr}`,
      windowStr,
    };
  }

  /**
   * Calculates the exact Date and millisecond delay until the next hour window begins.
   */
  public getNextWindow(date: Date = new Date()): { nextWindowTime: Date; delayMs: number } {
    const nextHour = new Date(date);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 2, 0); // 2 seconds into next hour for safety margin
    const delayMs = Math.max(1000, nextHour.getTime() - date.getTime());
    return { nextWindowTime: nextHour, delayMs };
  }

  /**
   * Retrieves configured hourly limit for a sender from DB or default config.
   */
  async getSenderHourlyLimit(senderEmail: string): Promise<number> {
    const defaultLimit = parseInt(process.env.DEFAULT_HOURLY_LIMIT || '50', 10);
    try {
      const sender = await prisma.sender.findUnique({
        where: { email: senderEmail.toLowerCase() },
      });
      return sender?.hourlyLimit || defaultLimit;
    } catch {
      return defaultLimit;
    }
  }

  /**
   * Atomically checks and increments the sender's hourly email count in Redis.
   * If limit is exceeded, returns allowed: false and triggers Slack notification once per window.
   */
  async checkAndIncrement(senderEmail: string, customLimit?: number, userId?: string, jobRecordId?: string): Promise<RateLimitResult> {
    const now = new Date();
    const { key, windowStr } = this.getWindowKey(senderEmail, now);
    const { nextWindowTime, delayMs } = this.getNextWindow(now);
    const limit = customLimit || (await this.getSenderHourlyLimit(senderEmail));

    // Multi-worker safe atomic increment in Redis
    const currentCount = await redisClient.incr(key);

    // Set TTL to 2 hours if key was newly created
    if (currentCount === 1) {
      await redisClient.expire(key, 7200);
    }

    if (currentCount > limit) {
      // Record telemetry event in activity stream
      await activityService.record({
        level: 'warn',
        type: 'RATE_LIMIT_DEFERRED',
        sender: senderEmail,
        jobId: jobRecordId,
        message: `Sender ${senderEmail} exceeded hourly limit (${currentCount}/${limit}). Job deferred to ${nextWindowTime.toUTCString()}.`,
        metadata: { currentCount, limit, nextWindowTime: nextWindowTime.toISOString() },
      });

      // Threshold exceeded! Send Slack alert once per hour window for this sender
      const slackAlertKey = `ratelimit:slack_notified:${senderEmail.toLowerCase()}:${windowStr}`;
      const firstNotification = await redisClient.set(slackAlertKey, '1', 'EX', 7200, 'NX');

      if (firstNotification === 'OK') {
        console.warn(`🚨 Rate limit exceeded for sender ${senderEmail} (${currentCount}/${limit} emails this hour). Rescheduling to ${nextWindowTime.toISOString()}. Triggering Slack notification...`);
        
        slackService.notifyRateLimitHit(
          {
            senderEmail,
            hourlyLimit: limit,
            currentCount,
            rescheduledCount: 1,
            rescheduledToTime: nextWindowTime.toUTCString(),
          },
          userId
        ).then((delivered) => {
          if (delivered) {
            activityService.record({
              level: 'info',
              type: 'SLACK_NOTIFIED',
              sender: senderEmail,
              message: `Live Slack rate-limit alert dispatched for sender ${senderEmail}`,
            });
          }
        }).catch((err) => {
          console.error('Slack notification dispatch error:', err.message);
        });
      }

      return {
        allowed: false,
        currentCount,
        limit,
        nextWindowTime,
        delayUntilNextWindowMs: delayMs,
      };
    }

    // Normal pass activity event
    await activityService.record({
      level: 'info',
      type: 'RATE_LIMIT_CHECK',
      sender: senderEmail,
      jobId: jobRecordId,
      message: `Rate limit check PASS for ${senderEmail}: ${currentCount}/${limit} slots used`,
      metadata: { currentCount, limit },
    });

    return {
      allowed: true,
      currentCount,
      limit,
      nextWindowTime,
      delayUntilNextWindowMs: 0,
    };
  }

  /**
   * Resets rate limit for a sender (useful for testing and demos).
   */
  async resetSenderRateLimit(senderEmail: string): Promise<void> {
    const { key, windowStr } = this.getWindowKey(senderEmail);
    const slackAlertKey = `ratelimit:slack_notified:${senderEmail.toLowerCase()}:${windowStr}`;
    await redisClient.del(key, slackAlertKey);
    console.log(`🔄 Reset rate limit counter for ${senderEmail}`);
  }

  /**
   * Returns current hour usage for a sender.
   */
  async getCurrentHourUsage(senderEmail: string): Promise<{ count: number; limit: number }> {
    const { key } = this.getWindowKey(senderEmail);
    const countStr = await redisClient.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const limit = await this.getSenderHourlyLimit(senderEmail);
    return { count, limit };
  }

  /**
   * Computes complete real-time sender capacity state for visual operator gauges.
   */
  async getSenderCapacityStatus(senderEmail: string): Promise<SenderCapacityStatus> {
    const now = new Date();
    const { key, windowStr } = this.getWindowKey(senderEmail, now);
    const { nextWindowTime } = this.getNextWindow(now);
    const countStr = await redisClient.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;
    const limit = await this.getSenderHourlyLimit(senderEmail);
    const remaining = Math.max(0, limit - count);
    const percentUsed = Math.min(100, Math.round((count / limit) * 100));
    const isRateLimited = count >= limit;

    const slackAlertKey = `ratelimit:slack_notified:${senderEmail.toLowerCase()}:${windowStr}`;
    const slackAlertSent = (await redisClient.get(slackAlertKey)) === '1';

    return {
      email: senderEmail,
      count,
      limit,
      remaining,
      percentUsed,
      isRateLimited,
      nextWindowTime: nextWindowTime.toISOString(),
      slackAlertSent,
    };
  }
}

export const rateLimitService = new RateLimitService();

