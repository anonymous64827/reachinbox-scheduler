import { Router, Response } from 'express';
import { slackService } from '../services/slack.service';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * 1. Get current Slack integration status
 */
router.get('/status', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await slackService.getConfig(req.user?.id);
    return res.json({
      connected: !!(config && config.webhookUrl),
      teamName: config?.teamName || null,
      channelName: config?.channelName || null,
      isActive: config?.isActive || false,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2. Start Slack OAuth Flow
 */
router.get('/oauth/start', (req, res: Response) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/oauth/callback';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!clientId) {
    return res.redirect(`${frontendUrl}?slack_error=Slack+Client+ID+not+configured`);
  }

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=incoming-webhook,chat:write&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return res.redirect(slackAuthUrl);
});

/**
 * 3. Slack OAuth Callback Handler
 */
router.get('/oauth/callback', async (req, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (error || !code) {
    return res.redirect(`${frontendUrl}?slack_error=${encodeURIComponent(error || 'User cancelled authorization')}`);
  }

  try {
    await slackService.exchangeOAuthCode(code);
    return res.redirect(`${frontendUrl}?slack_success=Slack+workspace+connected+successfully!`);
  } catch (err: any) {
    return res.redirect(`${frontendUrl}?slack_error=${encodeURIComponent(err.message || 'OAuth exchange failed')}`);
  }
});

/**
 * 4. Save Direct Slack Webhook URL (Evaluator friendly)
 */
router.post('/webhook', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { webhookUrl, channelName, teamName } = req.body;
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({ error: 'Please enter a valid Slack incoming webhook URL (https://hooks.slack.com/...)' });
    }

    const saved = await slackService.saveWebhook({
      webhookUrl,
      userId: req.user?.id,
      channelName: channelName || '#email-scheduler-alerts',
      teamName: teamName || 'ReachInbox Demo Workspace',
    });

    return res.json({
      success: true,
      message: 'Slack webhook configured successfully!',
      config: saved,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 5. Send Test Notification to Slack
 */
router.post('/test', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await slackService.sendTestNotification(req.user?.id);
    return res.json({ success: true, message: 'Test notification sent to Slack successfully!' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to send test notification' });
  }
});

/**
 * 6. Disconnect Slack
 */
router.post('/disconnect', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await slackService.disconnect(req.user?.id);
    return res.json({ success: true, message: 'Slack disconnected successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
