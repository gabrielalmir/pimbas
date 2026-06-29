import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

/**
 * Real in-process Postgres for tests.
 *
 * Uses PGlite (a full Postgres compiled to WASM) exposed over the Postgres wire
 * protocol via PGLiteSocketServer, so the application's real Prisma client
 * (`@prisma/adapter-pg`) connects to it exactly as it would to a production
 * Postgres. No database is mocked: the schema comes from the real Prisma
 * migrations and every query runs against an actual Postgres engine.
 *
 * PGlite connects as a superuser, which bypasses RLS — this matches how the
 * password-reset routes use `getDb()` (they never set `app.current_user_id`).
 */

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, "prisma", "migrations");

export interface RealDb {
  databaseUrl: string;
  pglite: PGlite;
  /** Remove all data while keeping the schema, for isolation between tests. */
  reset(): Promise<void>;
  stop(): Promise<void>;
}

function migrationSqlFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .map((dir) => path.join(MIGRATIONS_DIR, dir, "migration.sql"));
}

async function applyMigrations(pglite: PGlite): Promise<void> {
  for (const file of migrationSqlFiles()) {
    const sql = readFileSync(file, "utf8");
    await pglite.exec(sql);
  }
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not determine a free port"));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

export async function startRealDb(): Promise<RealDb> {
  const pglite = new PGlite();
  await pglite.waitReady;
  await applyMigrations(pglite);

  const port = await findFreePort();
  const server = new PGLiteSocketServer({ db: pglite, port, host: "127.0.0.1" });
  await server.start();

  const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres`;

  return {
    databaseUrl,
    pglite,
    async reset() {
      await pglite.exec(
        'TRUNCATE TABLE "password_reset_tokens", "users" RESTART IDENTITY CASCADE;',
      );
    },
    async stop() {
      await server.stop();
      await pglite.close();
    },
  };
}
