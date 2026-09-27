import { Router, Response } from 'express';
import multer from 'multer';
import { prisma } from '../config/db';
import { scheduleBullMQJob, removeBullMQJob, emailQueue } from '../queues/email.queue';
import { elasticsearchService } from '../services/elasticsearch.service';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation schema for scheduling emails
const scheduleEmailSchema = z.object({
  toEmails: z.array(z.string().email()).min(1, 'At least one recipient email is required'),
  senderEmail: z.string().email(),
  senderName: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)) || val === 'now', {
    message: 'Invalid start time format',
  }),
  delaySeconds: z.number().min(0).default(2),
  hourlyLimit: z.number().min(1).default(50),
});

/**
 * 1. Schedule New Emails (Batch or Single)
 */
router.post('/schedule', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = scheduleEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { toEmails, senderEmail, senderName, subject, body, startTime, delaySeconds, hourlyLimit } = parseResult.data;
    const userId = req.user?.id || null;

    const baseStartTime = startTime === 'now' ? Date.now() : new Date(startTime).getTime();
    const now = Date.now();
    const effectiveStartTime = Math.max(now, baseStartTime);

    const createdJobs = [];

    // Schedule each lead with consecutive spacing based on delaySeconds
    for (let i = 0; i < toEmails.length; i++) {
      const recipient = toEmails[i].trim().toLowerCase();
      // Consecutive delay spacing
      const scheduledTimeMs = effectiveStartTime + i * (delaySeconds * 1000);
      const scheduledTime = new Date(scheduledTimeMs);
      const delayMs = Math.max(0, scheduledTimeMs - now);

      // Save to Relational Database
      const record = await prisma.emailJob.create({
        data: {
          toEmail: recipient,
          senderEmail: senderEmail.toLowerCase(),
          subject,
          body,
          status: 'SCHEDULED',
          scheduledTime,
          delaySeconds,
          hourlyLimit,
          userId,
        },
      });

      // Index in Elasticsearch
      await elasticsearchService.indexEmail({
        id: record.id,
        toEmail: record.toEmail,
        senderEmail: record.senderEmail,
        subject: record.subject,
        body: record.body,
        status: record.status,
        scheduledTime: record.scheduledTime,
        createdAt: record.createdAt,
      });

      // Add to BullMQ delayed queue
      await scheduleBullMQJob(
        {
          jobRecordId: record.id,
          toEmail: record.toEmail,
          senderEmail: record.senderEmail,
          senderName: senderName || undefined,
          subject: record.subject,
          body: record.body,
          scheduledTime: record.scheduledTime.toISOString(),
          delaySeconds: record.delaySeconds,
          hourlyLimit: record.hourlyLimit,
          attempt: 0,
        },
        delayMs
      );

      createdJobs.push(record);
    }

    return res.status(201).json({
      success: true,
      message: `Successfully scheduled ${createdJobs.length} email job(s).`,
      count: createdJobs.length,
      jobs: createdJobs,
    });
  } catch (error: any) {
    console.error('Failed to schedule emails:', error);
    return res.status(500).json({ error: error.message || 'Internal server error while scheduling' });
  }
});

/**
 * 2. Get Scheduled Emails
 */
router.get('/scheduled', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const sender = req.query.sender as string | undefined;

    const where: any = {
      status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED_RESCHEDULED'] },
    };

    if (sender && sender !== 'ALL') {
      where.senderEmail = sender;
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledTime: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 3. Get Sent Emails
 */
router.get('/sent', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const sender = req.query.sender as string | undefined;

    const where: any = {
      status: { in: ['SENT', 'FAILED'] },
    };

    if (sender && sender !== 'ALL') {
      where.senderEmail = sender;
    }

    const [total, items] = await Promise.all([
      prisma.emailJob.count({ where }),
      prisma.emailJob.findMany({
        where,
        orderBy: { sentTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 4. Search Emails via Elasticsearch (with fallback)
 */
router.get('/search', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query.q as string | undefined;
    const status = req.query.status as string | undefined;
    const sender = req.query.sender as string | undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;

    const searchResult = await elasticsearchService.searchEmails({
      q,
      status,
      sender,
      page,
      limit,
    });

    return res.json(searchResult);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 5. Cancel Scheduled Email
 */
router.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const record = await prisma.emailJob.findUnique({ where: { id } });

    if (!record) {
      return res.status(404).json({ error: 'Email job not found' });
    }

    if (record.status === 'SENT') {
      return res.status(400).json({ error: 'Cannot cancel an email that is already sent' });
    }

    // Remove from BullMQ
    await removeBullMQJob(id);

    // Update DB
    const updated = await prisma.emailJob.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Update Elasticsearch
    await elasticsearchService.updateEmailStatus(id, { status: 'CANCELLED' });

    return res.json({ success: true, message: 'Email cancelled successfully', job: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 6. Parse CSV / Text file of email leads
 */
router.post('/parse-csv', upload.single('file'), async (req: any, res: Response) => {
  try {
    let content = '';

    if (req.file) {
      content = req.file.buffer.toString('utf-8');
    } else if (req.body.text) {
      content = req.body.text;
    } else {
      return res.status(400).json({ error: 'Please upload a CSV/text file or provide raw text of email leads' });
    }

    // Extract all emails using regex matching
    const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    
    // Normalize and de-duplicate
    const uniqueEmails = Array.from(new Set(emailMatches.map((e) => e.toLowerCase())));

    return res.json({
      success: true,
      count: uniqueEmails.length,
      sample: uniqueEmails.slice(0, 10),
      emails: uniqueEmails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to parse file: ' + error.message });
  }
});

/**
 * 7. Overview Dashboard Stats & BullMQ Metrics
 */
router.get('/stats', async (_req, res: Response) => {
  try {
    const [scheduledCount, sentCount, failedCount, rescheduledCount, activeSenders] = await Promise.all([
      prisma.emailJob.count({ where: { status: { in: ['SCHEDULED', 'PROCESSING'] } } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
      prisma.emailJob.count({ where: { status: 'RATE_LIMITED_RESCHEDULED' } }),
      prisma.sender.count({ where: { active: true } }),
    ]);

    const queueCounts = await emailQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');

    return res.json({
      counts: {
        scheduled: scheduledCount,
        sent: sentCount,
        failed: failedCount,
        rescheduled: rescheduledCount,
        activeSenders,
      },
      queue: queueCounts,
      elasticsearch: {
        connected: elasticsearchService.isConnected,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
