import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  const redisPing = await redisClient.ping().catch(() => 'FAILED');
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      redis: redisPing === 'PONG' ? 'UP' : 'DOWN',
      elasticsearch: elasticsearchService.isConnected ? 'UP' : 'OFFLINE_FALLBACK_ACTIVE',
      database: 'UP',
      etherealSmtp: 'UP',
    },
    bullBoardUrl: `http://localhost:${PORT}/admin/queues`,
  });
});

// Root welcome route
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
