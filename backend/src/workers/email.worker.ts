import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { EMAIL_QUEUE_NAME, scheduleBullMQJob } from '../queues/email.queue';
import { EmailJobData } from '../types';
import { prisma } from '../config/db';
import { etherealService } from '../services/ethereal.service';
import { rateLimitService } from '../services/ratelimit.service';
import { elasticsearchService } from '../services/elasticsearch.service';
import dotenv from 'dotenv';

dotenv.config();

const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const minDelaySeconds = parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_SECONDS || '2', 10);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function initEmailWorker() {
  console.log(`🚀 Initializing BullMQ Email Worker (Concurrency: ${concurrency}, Min Send Throttling: ${minDelaySeconds}s)...`);

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const data = job.data;
      console.log(`\n📬 [Job ${job.id}] Processing email for ${data.toEmail} (Sender: ${data.senderEmail})...`);

      // 1. Idempotency Check in Database
      const record = await prisma.emailJob.findUnique({
        where: { id: data.jobRecordId },
      });

      if (!record) {
        console.warn(`⚠️ [Job ${job.id}] Record ${data.jobRecordId} not found in DB. Skipping.`);
        return { status: 'SKIPPED_NOT_FOUND' };
      }

      if (record.status === 'SENT') {
        console.log(`🛡️ [Job ${job.id}] Record ${data.jobRecordId} is ALREADY SENT. Idempotency preserved, skipping.`);
        return { status: 'SKIPPED_ALREADY_SENT', previewUrl: record.etherealPreviewUrl };
      }

      if (record.status === 'CANCELLED') {
        console.log(`🛑 [Job ${job.id}] Record ${data.jobRecordId} was cancelled by user. Skipping.`);
        return { status: 'SKIPPED_CANCELLED' };
      }

      // Mark status as PROCESSING in DB
      await prisma.emailJob.update({
        where: { id: data.jobRecordId },
        data: { status: 'PROCESSING' },
      });

      // 2. Multi-Worker Safe Atomic Hourly Rate Limit Check (Redis-backed)
      const rateLimitResult = await rateLimitService.checkAndIncrement(
        data.senderEmail,
        data.hourlyLimit,
        record.userId || undefined
      );

      if (!rateLimitResult.allowed) {
        console.warn(
          `⚠️ [Job ${job.id}] Sender ${data.senderEmail} hit hourly limit (${rateLimitResult.currentCount}/${rateLimitResult.limit}). Rescheduling into next hour window at ${rateLimitResult.nextWindowTime.toISOString()}...`
        );

        // Update DB record status and new scheduled time
        await prisma.emailJob.update({
          where: { id: data.jobRecordId },
          data: {
            status: 'RATE_LIMITED_RESCHEDULED',
            scheduledTime: rateLimitResult.nextWindowTime,
          },
        });

        // Re-enqueue in BullMQ with delay to start of next window
        await scheduleBullMQJob(
          {
            ...data,
            scheduledTime: rateLimitResult.nextWindowTime.toISOString(),
          },
          rateLimitResult.delayUntilNextWindowMs
        );

        // Update Elasticsearch status
        await elasticsearchService.updateEmailStatus(data.jobRecordId, {
          status: 'RATE_LIMITED_RESCHEDULED',
        });

        return {
          status: 'RESCHEDULED_RATE_LIMITED',
          rescheduledTo: rateLimitResult.nextWindowTime,
        };
      }

      // 3. Minimum Delay / Throttling Between Sends (to mimic real provider throttling)
      const effectiveDelay = Math.max(data.delaySeconds || 0, minDelaySeconds);
      if (effectiveDelay > 0) {
        console.log(`⏳ Applying provider send throttling delay of ${effectiveDelay}s...`);
        await sleep(effectiveDelay * 1000);
      }

      // 4. Send Email via Ethereal SMTP
      try {
        const sendResult = await etherealService.sendEmail({
          from: data.senderName ? `"${data.senderName}" <${data.senderEmail}>` : data.senderEmail,
          to: data.toEmail,
          subject: data.subject,
          body: data.body,
        });

        const sentTime = new Date();

        // 5. Update Database to SENT
        await prisma.emailJob.update({
          where: { id: data.jobRecordId },
          data: {
            status: 'SENT',
            sentTime,
            etherealPreviewUrl: sendResult.previewUrl,
            etherealMessageId: sendResult.messageId,
            attempts: { increment: 1 },
          },
        });

        // 6. Update Elasticsearch
        await elasticsearchService.updateEmailStatus(data.jobRecordId, {
          status: 'SENT',
          sentTime,
          etherealPreviewUrl: sendResult.previewUrl,
        });

        console.log(`🎉 [Job ${job.id}] Successfully dispatched email to ${data.toEmail}`);
        return {
          status: 'SENT',
          previewUrl: sendResult.previewUrl,
          messageId: sendResult.messageId,
        };
      } catch (sendError: any) {
        console.error(`❌ [Job ${job.id}] Failed to send email to ${data.toEmail}:`, sendError.message);

        const currentAttempts = record.attempts + 1;
        const isFinalAttempt = currentAttempts >= (record.maxAttempts || 3);

        await prisma.emailJob.update({
          where: { id: data.jobRecordId },
          data: {
            status: isFinalAttempt ? 'FAILED' : 'SCHEDULED',
            attempts: currentAttempts,
            errorMessage: sendError.message,
          },
        });

        await elasticsearchService.updateEmailStatus(data.jobRecordId, {
          status: isFinalAttempt ? 'FAILED' : 'SCHEDULED',
          errorMessage: sendError.message,
        });

        throw sendError; // Let BullMQ handle automatic retry if configured
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency,
    }
  );

  worker.on('ready', () => {
    console.log(`✅ BullMQ Worker ready for queue [${EMAIL_QUEUE_NAME}]`);
  });

  worker.on('failed', (job, err) => {
    console.error(`💥 Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`💥 Worker error:`, err.message);
  });

  return worker;
}
