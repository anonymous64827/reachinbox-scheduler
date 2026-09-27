import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { rateLimitService } from '../services/ratelimit.service';

const router = Router();

/**
 * 1. List all available email senders and their current hourly rate usage
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const senders = await prisma.sender.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });

    const sendersWithUsage = await Promise.all(
      senders.map(async (sender) => {
        const capacity = await rateLimitService.getSenderCapacityStatus(sender.email);
        return {
          ...sender,
          currentHourCount: capacity.count,
          remaining: capacity.remaining,
          percentUsed: capacity.percentUsed,
          isRateLimited: capacity.isRateLimited,
          nextWindowTime: capacity.nextWindowTime,
          slackAlertSent: capacity.slackAlertSent,
        };
      })
    );

    return res.json(sendersWithUsage);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2. Add or configure a sender
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, hourlyLimit } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and valid email are required' });
    }

    const sender = await prisma.sender.upsert({
      where: { email: email.toLowerCase() },
      update: {
        name,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 50,
        active: true,
      },
      create: {
        name,
        email: email.toLowerCase(),
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 50,
      },
    });

    return res.json(sender);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 3. Reset rate limit for a sender (Demo / Testing helper)
 */
router.post('/reset-limit', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Sender email is required' });
    }

    await rateLimitService.resetSenderRateLimit(email);
    return res.json({ success: true, message: `Rate limit for ${email} has been reset for the current hour window.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
