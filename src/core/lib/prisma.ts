import { PrismaClient } from '@prisma/client';
import { config as envConfig } from '@/core/lib/env';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: envConfig.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (envConfig.nodeEnv !== 'production') globalForPrisma.prisma = prisma;
