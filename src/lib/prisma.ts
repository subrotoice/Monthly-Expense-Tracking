import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const SCHEMA_VERSION = 'v2_personal_expense_deleted';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion: string | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

if (globalForPrisma.prisma && globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION) {
  // Schema changed; discard stale cached client
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}


