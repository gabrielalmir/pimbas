import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@/generated/prisma/client";

export type RootDatabaseClient = InstanceType<typeof PrismaClient>;
export type DatabaseClient = RootDatabaseClient | Prisma.TransactionClient;

let instance: RootDatabaseClient | undefined;

function instantiate(): RootDatabaseClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new (PrismaClient as unknown as new (options: object) => RootDatabaseClient)({ adapter });
}

/** Singleton lazily instantiated on first use (avoids connecting at import time). */
export function getDb(): RootDatabaseClient {
  instance ??= instantiate();
  return instance;
}

export async function withDbUser<T>(
  userId: string,
  run: (db: DatabaseClient) => Promise<T>,
): Promise<T> {
  const db = getDb();
  if (!("$transaction" in db) || typeof db.$transaction !== "function") {
    return run(db);
  }

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
    return run(tx);
  });
}
