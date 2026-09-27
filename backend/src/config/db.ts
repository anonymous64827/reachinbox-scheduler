import { PrismaClient } from '@prisma/client';

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
