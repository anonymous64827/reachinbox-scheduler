import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Guarantee fallback DATABASE_URL if omitted in cloud env
if (!process.env.DATABASE_URL) {
  const possiblePaths = [
    path.resolve(process.cwd(), 'prisma/dev.db'),
    path.resolve(process.cwd(), 'backend/prisma/dev.db'),
    path.resolve(__dirname, '../../prisma/dev.db'),
    path.resolve(__dirname, '../prisma/dev.db'),
  ];
  const found = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];
  process.env.DATABASE_URL = `file:${found}`;
  console.log(`📁 Auto-assigned fallback DATABASE_URL: ${process.env.DATABASE_URL}`);
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Relational Database connected via Prisma');
    
    // Seed default senders if not existing
    const defaultSenders = [
      { name: 'Alex - Outreach Lead', email: 'alex@reachinbox.test', hourlyLimit: 50 },
      { name: 'Sarah - Growth Partner', email: 'sarah@reachinbox.test', hourlyLimit: 30 },
      { name: 'Outbox Team', email: 'team@outboxlabs.test', hourlyLimit: 100 },
    ];

    for (const sender of defaultSenders) {
      const existing = await prisma.sender.findUnique({
        where: { email: sender.email },
      });
      if (!existing) {
        await prisma.sender.create({
          data: sender,
        });
      }
    }
  } catch (error) {
    console.error('❌ Failed to connect to Relational Database:', error);
    process.exit(1);
  }
};
