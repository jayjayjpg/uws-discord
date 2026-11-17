import { PrismaClient } from "@prisma/client";
import { logger } from "../logger.js";

export const prisma = new PrismaClient();

/** Connects up front so a bad DATABASE_URL fails fast with a clear message, not a cryptic error mid-command. */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("Connected to the database");
  } catch (err) {
    logger.error(err, "Failed to connect to the database — check DATABASE_URL in .env and that Postgres is running");
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
