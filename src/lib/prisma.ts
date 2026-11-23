import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  __mathForumPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__mathForumPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__mathForumPrisma = prisma;
}
