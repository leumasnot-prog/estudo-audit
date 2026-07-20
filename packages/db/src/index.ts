import { PrismaClient } from "@prisma/client";

// Singleton — reutiliza a conexão do Prisma em serverless (Vercel) e dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

export * from "@prisma/client";
