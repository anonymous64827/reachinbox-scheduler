import axios from 'axios';
import { prisma } from '../config/db';
import { SlackNotificationPayload } from '../types';
import dotenv from 'dotenv';

dotenv.config();

class SlackService {
  async getConfig(userId?: string) {
    if (userId) {
      const config = await prisma.slackConfig.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (config && config.webhookUrl) return config;
    }

    // Tenant / Global default fallback
    const globalConfig = await prisma.slackConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (globalConfig && globalConfig.webhookUrl) return globalConfig;

    if (process.env.SLACK_DEFAULT_WEBHOOK) {
      return {
        id: 'env-default',
        webhookUrl: process.env.SLACK_DEFAULT_WEBHOOK,
        teamName: 'Configured via ENV',
        channelName: '#reachinbox-alerts',
        isActive: true,
      };
    }

    return null;
  }

  async saveWebhook(params: {
    webhookUrl: string;
    userId?: string;
    channelName?: string;
    teamName?: string;
  }) {
    return await prisma.slackConfig.create({
      data: {
        userId: params.userId || null,
        webhookUrl: params.webhookUrl,
        channelName: params.channelName || '#alerts',
        teamName: params.teamName || 'Workspace',
        isActive: true,
      },
    });
  }

  async exchangeOAuthCode(code: string, userId?: string) {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI;

    if (!clientId || !clientSecret) {
      throw new Error('Slack OAuth credentials not configured in backend .env');
    }

    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri || '',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const data = response.data;
    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    const webhookUrl = data.incoming_webhook?.url || null;
    const accessToken = data.access_token || null;
    const teamName = data.team?.name || 'Slack Team';
    const channelName = data.incoming_webhook?.channel || '#general';
    const botUserId = data.bot_user_id || null;

    // Persist to DB
    const saved = await prisma.slackConfig.create({
      data: {
        userId: userId || null,
        teamName,
        channelName,
        webhookUrl,
        accessToken,
        botUserId,
        isActive: true,
      },
    });

    return saved;
  }

  async disconnect(userId?: string) {
    if (userId) {
      await prisma.slackConfig.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    } else {
      await prisma.slackConfig.updateMany({
        data: { isActive: false },
      });
    }
  }

  async notifyRateLimitHit(payload: SlackNotificationPayload, userId?: string): Promise<boolean> {
    const config = await this.getConfig(userId);
    if (!config || !config.webhookUrl) {
      // Disconnected or no webhook configured - fail silently without crashing
      console.log(`ℹ️ Slack notification skipped for sender ${payload.senderEmail}: Slack is not connected.`);
      return false;
    }

    try {
      const message = {
        text: `🚨 Rate Limit Hit: Hourly limit reached for sender ${payload.senderEmail}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 ReachInbox Alert: Sender Rate Limit Hit',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n\`${payload.senderEmail}\``,
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Limit:*\n${payload.hourlyLimit} emails/hour`,
              },
              {
                type: 'mrkdwn',
                text: `*Current Window Usage:*\n${payload.currentCount}/${payload.hourlyLimit}`,
              },
              {
                type: 'mrkdwn',
                text: `*Rescheduled Next Window:*\n${payload.rescheduledToTime}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `⚠️ *Action Taken:* Rate limit threshold reached. Pending jobs have been safely delayed and rescheduled into the next hourly window without dropping or losing any jobs.`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `⏱ Timestamp: ${new Date().toISOString()} | Environment: Production`,
              },
            ],
          },
        ],
      };

      await axios.post(config.webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      console.log(`📣 Live Slack alert successfully delivered for sender ${payload.senderEmail} to ${config.channelName || 'Slack channel'}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to dispatch Slack rate limit notification:', error?.response?.data || error?.message || error);
      return false;
    }
  }

  async sendTestNotification(userId?: string): Promise<boolean> {
    const config = await this.getConfig(userId);
    if (!config || !config.webhookUrl) {
      throw new Error('Slack is not connected. Please connect Slack first.');
    }

    const message = {
      text: '🔔 ReachInbox Email Scheduler: Slack Integration Connected Successfully!',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚡ ReachInbox Slack Integration Connected',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Verification Successful!*\nYour Slack channel is now connected to receive real-time rate limit alerts, queue backlog warnings, and throttling notifications from ReachInbox Email Job Scheduler.`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Connected to ${config.teamName || 'Workspace'} • Channel: ${config.channelName || '#alerts'} • Time: ${new Date().toLocaleString()}`,
            },
          ],
        },
      ],
    };

    await axios.post(config.webhookUrl, message, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    return true;
  }
}

export const slackService = new SlackService();
