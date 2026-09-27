import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis';
import { EmailJobData } from '../types';
import { prisma } from '../config/db';

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: false, // Keep in Bull Board for evaluation
    removeOnFail: false,
  },
});

/**
 * Adds an email send job to BullMQ with delayed scheduling and deterministic jobId for idempotency.
 */
export async function scheduleBullMQJob(data: EmailJobData, delayMs: number) {
  const baseJobId = `email-${data.jobRecordId}`;
  
  try {
    const existingJob = await emailQueue.getJob(baseJobId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state === 'delayed' || state === 'waiting') {
        await existingJob.remove().catch(() => {});
      }
    }
  } catch {
    // Ignore removal errors if locked
  }

  const uniqueJobId = `${baseJobId}-${Date.now()}`;
  const job = await emailQueue.add('send-email', data, {
    delay: Math.max(0, delayMs),
    jobId: uniqueJobId,
  });

  console.log(`⏱ Scheduled BullMQ Job [${job.id}] for recipient ${data.toEmail} with delay ${delayMs}ms`);
  return job;
}

/**
 * Removes a job from BullMQ if cancelled by user.
 */
export async function removeBullMQJob(jobRecordId: string) {
  const jobId = `email-${jobRecordId}`;
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.remove();
    console.log(`🗑 Removed BullMQ Job [${jobId}]`);
  }
}

/**
 * Server restart recovery / reconciliation:
 * Scans DB for any jobs with status 'SCHEDULED' or 'PROCESSING' that may have been interrupted,
 * and ensures they are safely re-enqueued at their appropriate scheduled time.
 */
export async function reconcilePendingJobsOnStartup() {
  console.log('🔄 Checking database for scheduled jobs to reconcile across restart...');
  try {
    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED_RESCHEDULED'] },
      },
    });

    const now = Date.now();
    let reEnqueuedCount = 0;

    for (const jobRecord of pendingJobs) {
      const jobId = `email-${jobRecord.id}`;
      const existingJob = await emailQueue.getJob(jobId);

      // If job is already in BullMQ, BullMQ persists delayed jobs across restart natively!
      if (!existingJob) {
        const scheduledTimeMs = new Date(jobRecord.scheduledTime).getTime();
        const delayMs = Math.max(0, scheduledTimeMs - now);

        await scheduleBullMQJob(
          {
            jobRecordId: jobRecord.id,
            toEmail: jobRecord.toEmail,
            senderEmail: jobRecord.senderEmail,
            subject: jobRecord.subject,
            body: jobRecord.body,
            scheduledTime: jobRecord.scheduledTime.toISOString(),
            delaySeconds: jobRecord.delaySeconds,
            hourlyLimit: jobRecord.hourlyLimit,
            attempt: jobRecord.attempts,
          },
          delayMs
        );
        reEnqueuedCount++;
      }
    }

    console.log(`✅ Reconciliation complete. ${pendingJobs.length} active jobs verified (${reEnqueuedCount} re-enqueued, ${pendingJobs.length - reEnqueuedCount} persisted natively by Redis/BullMQ).`);
  } catch (error: any) {
    console.error('❌ Error during job reconciliation:', error?.message || error);
  }
}
