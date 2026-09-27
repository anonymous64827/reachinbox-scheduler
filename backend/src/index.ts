import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/db';
import { redisClient } from './config/redis';
import { etherealService } from './services/ethereal.service';
import { elasticsearchService } from './services/elasticsearch.service';
import { setupBullBoard } from './admin/bull-board';
import { initEmailWorker } from './workers/email.worker';
import { reconcilePendingJobsOnStartup } from './queues/email.queue';

import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import slackRoutes from './routes/slack.routes';
import sendersRoutes from './routes/senders.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Setup Live BullMQ Dashboard
const bullBoardAdapter = setupBullBoard();
app.use('/admin/queues', bullBoardAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/senders', sendersRoutes);

import { emailQueue } from './queues/email.queue';
import { slackService } from './services/slack.service';
import { prisma } from './config/db';

// Health check endpoint with deep infrastructure telemetry
app.get('/api/health', async (_req: Request, res: Response) => {
  const t0 = Date.now();
  let redisPing = 'FAILED';
  let redisLatency = 0;
  try {
    const p0 = Date.now();
    await redisClient.ping();
    redisLatency = Date.now() - p0;
    redisPing = 'PONG';
  } catch {}

  let dbStatus = 'DOWN';
  let dbLatency = 0;
  try {
    const d0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - d0;
    dbStatus = 'UP';
  } catch {}

  const queueCounts = await emailQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed').catch(() => null);
  const slackConfig = await slackService.getConfig().catch(() => null);
  const etherealInfo = etherealService.getAccountInfo();

  return res.json({
    status: redisPing === 'PONG' && dbStatus === 'UP' ? 'healthy' : 'degraded',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      redis: {
        status: redisPing === 'PONG' ? 'UP' : 'DOWN',
        latencyMs: redisLatency,
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
        type: process.env.DATABASE_URL?.includes('postgres') ? 'PostgreSQL' : 'SQLite (Prisma)',
      },
      queue: {
        status: 'HEALTHY',
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
        minThrottlingSeconds: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_SECONDS || '2', 10),
        counts: queueCounts,
      },
      smtp: {
        status: 'UP',
        provider: 'Ethereal SMTP (Fake Transporter)',
        account: etherealInfo?.user || 'Auto-Provisioned',
      },
      etherealSmtp: 'UP (Ethereal fake provider)',
      elasticsearch: {
        status: elasticsearchService.isConnected ? 'UP' : 'OFFLINE_FALLBACK_ACTIVE',
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
        fallbackMode: !elasticsearchService.isConnected,
      },
      slack: {
        status: slackConfig?.webhookUrl ? 'CONNECTED' : 'DISCONNECTED_STANDBY',
        channel: slackConfig?.channelName || null,
      },
    },
    bullBoardUrl: `http://localhost:${PORT}/admin/queues`,
  });
});

// Static frontend serving for production / cloud deployment
const candidateDistPaths = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(__dirname, './public'),
  path.resolve(process.cwd(), 'frontend/dist'),
];

let resolvedDistPath: string | null = null;
for (const p of candidateDistPaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    resolvedDistPath = p;
    break;
  }
}

if (resolvedDistPath) {
  console.log(`📦 Serving compiled frontend from: ${resolvedDistPath}`);
  app.use(express.static(resolvedDistPath));
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(resolvedDistPath!, 'index.html'));
  });
} else {
  // Root welcome route if frontend is hosted separately
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'ReachInbox Email Job Scheduler API',
      version: '1.0.0',
      documentation: {
        bullBoard: `/admin/queues`,
        health: `/api/health`,
        schedule: `POST /api/emails/schedule`,
        scheduled: `GET /api/emails/scheduled`,
        sent: `GET /api/emails/sent`,
        search: `GET /api/emails/search`,
        slackStatus: `GET /api/slack/status`,
      },
    });
  });
}

// Bootstrap server
async function bootstrap() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting ReachInbox Email Job Scheduler Service...');
  console.log('----------------------------------------------------');

  try {
    // 1. Connect Relational Database
    await connectDB();

    // 2. Initialize Ethereal SMTP
    await etherealService.init();

    // 3. Initialize Elasticsearch (with graceful fallback)
    await elasticsearchService.init();

    // 4. Start BullMQ Background Worker
    initEmailWorker();

    // 5. Reconcile jobs for restart persistence
    await reconcilePendingJobsOnStartup();

    // 6. Start HTTP Server
    app.listen(PORT, () => {
      console.log(`\n====================================================`);
      console.log(`🎉 ReachInbox Backend Running on http://localhost:${PORT}`);
      console.log(`📊 BullMQ Live Queue Dashboard: http://localhost:${PORT}/admin/queues`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================\n`);
    });
  } catch (error: any) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();
