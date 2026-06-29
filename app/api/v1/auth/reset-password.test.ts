import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { getDb as GetDb } from "@/lib/server/prisma";
import { resetRateLimits } from "@/lib/server/rate-limit";
import { startRealDb } from "@/test/real-db";

// Email delivery is an external side effect (pending Resend integration, #11),
// so it is the only collaborator that stays mocked. The database is REAL: every
// query below runs against an actual Postgres engine (PGlite) over the wire
// protocol, through the application's real Prisma client.
const mockSendEmail = vi.fn<(user: { email: string }, token: string) => Promise<void>>();
vi.mock("@/lib/server/email", () => ({
  sendPasswordResetEmail: (...args: [{ email: string }, string]) => mockSendEmail(...args),
}));

type ForgotRoute = typeof import("./forgot-password/route");
type ResetRoute = typeof import("./reset-password/route");

let realDb: Awaited<ReturnType<typeof startRealDb>>;
let db: ReturnType<typeof GetDb>;
let forgotPost: ForgotRoute["POST"];
let resetPost: ResetRoute["POST"];
let resetGet: ResetRoute["GET"];

beforeAll(async () => {
  realDb = await startRealDb();
  process.env.DATABASE_URL = realDb.databaseUrl;

  // Imported only after DATABASE_URL points at the test database, so the lazy
  // getDb() singleton connects to PGlite rather than any ambient database.
  const prismaModule = await import("@/lib/server/prisma");
  db = prismaModule.getDb();
  ({ POST: forgotPost } = await import("./forgot-password/route"));
  ({ POST: resetPost, GET: resetGet } = await import("./reset-password/route"));
}, 60_000);

afterAll(async () => {
  await realDb.stop();
});

beforeEach(async () => {
  vi.clearAllMocks();
  resetRateLimits();
  await realDb.reset();
});

// ---------------------------------------------------------------------------
// Seed helpers (real rows)
// ---------------------------------------------------------------------------

let userSeq = 0;

async function seedUser(
  overrides: Partial<{ email: string; passwordHash: string | null; googleSub: string | null }> = {},
) {
  userSeq += 1;
  return db.user.create({
    data: {
      email: overrides.email ?? `user${userSeq}@example.com`,
      name: `User ${userSeq}`,
      passwordHash:
        overrides.passwordHash === undefined ? "hashed-password" : overrides.passwordHash,
      googleSub: overrides.googleSub ?? null,
    },
  });
}

async function seedToken(
  userId: string,
  overrides: Partial<{ token: string; expiresAt: Date; usedAt: Date | null }> = {},
) {
  return db.passwordResetToken.create({
    data: {
      token: overrides.token ?? `valid-token-${userId}`,
      userId,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 3_600_000),
      usedAt: overrides.usedAt ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/v1/auth/forgot-password", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeResetRequest(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/v1/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

function makeValidateRequest(token: string | null, ip = "1.2.3.4") {
  const url = new URL("http://localhost/api/v1/auth/reset-password");
  if (token !== null) url.searchParams.set("token", token);
  return new Request(url, { method: "GET", headers: { "x-forwarded-for": ip } });
}

// ---------------------------------------------------------------------------
// forgot-password endpoint
// ---------------------------------------------------------------------------

describe("POST /api/v1/auth/forgot-password", () => {
  it("returns 200 and sends email for a known user", async () => {
    await seedUser({ email: "user@example.com" });

    const res = await forgotPost(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com" }),
      expect.any(String),
    );

    const tokens = await db.passwordResetToken.findMany();
    expect(tokens).toHaveLength(1);
  });

  it("returns 200 silently for unknown email (no enumeration)", async () => {
    const res = await forgotPost(makeRequest({ email: "ghost@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(await db.passwordResetToken.count()).toBe(0);
  });

  it("returns 200 silently for OAuth-only user (no passwordHash)", async () => {
    await seedUser({ email: "oauth@example.com", passwordHash: null, googleSub: "google-id-123" });

    const res = await forgotPost(makeRequest({ email: "oauth@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(await db.passwordResetToken.count()).toBe(0);
  });

  it("returns 400 for invalid email", async () => {
    const res = await forgotPost(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing body", async () => {
    const req = new Request("http://localhost/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = await forgotPost(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const ip = "9.9.9.9";
    for (let i = 0; i < 5; i++) {
      await forgotPost(makeRequest({ email: "user@example.com" }, ip));
    }
    const res = await forgotPost(makeRequest({ email: "user@example.com" }, ip));
    expect(res.status).toBe(429);
  });

  it("replaces previously issued tokens for the same user", async () => {
    const user = await seedUser({ email: "rotate@example.com" });
    await seedToken(user.id, { token: "old-token" });

    await forgotPost(makeRequest({ email: "rotate@example.com" }));

    const tokens = await db.passwordResetToken.findMany({ where: { userId: user.id } });
    expect(tokens).toHaveLength(1);
    expect(tokens[0].token).not.toBe("old-token");
  });

  it("creates a token that expires in the future", async () => {
    await seedUser({ email: "expiry@example.com" });

    await forgotPost(makeRequest({ email: "expiry@example.com" }));

    const token = await db.passwordResetToken.findFirst();
    expect(token?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

// ---------------------------------------------------------------------------
// reset-password endpoint (POST)
// ---------------------------------------------------------------------------

describe("POST /api/v1/auth/reset-password", () => {
  it("resets password and invalidates sessions for a valid token", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id);
    const { verifyPassword } = await import("@/lib/server/hash");

    const res = await resetPost(
      makeResetRequest({ token: token.token, password: "NewPassword1!" }),
    );
    expect(res.status).toBe(200);

    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.tokenVersion).toBe(1);
    expect(updated.passwordHash).not.toBeNull();
    expect(await verifyPassword(updated.passwordHash as string, "NewPassword1!")).toBe(true);
  });

  it("marks token as used after reset", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id);

    await resetPost(makeResetRequest({ token: token.token, password: "NewPassword1!" }));

    const stored = await db.passwordResetToken.findUnique({ where: { token: token.token } });
    expect(stored?.usedAt).not.toBeNull();
  });

  it("returns 400 for an expired token", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id, { expiresAt: new Date(Date.now() - 1000) });

    const res = await resetPost(
      makeResetRequest({ token: token.token, password: "NewPassword1!" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an already used token", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id, { usedAt: new Date() });

    const res = await resetPost(
      makeResetRequest({ token: token.token, password: "NewPassword1!" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown token", async () => {
    const res = await resetPost(
      makeResetRequest({ token: "non-existent-token", password: "NewPass1!" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for password shorter than 8 characters", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id);

    const res = await resetPost(makeResetRequest({ token: token.token, password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing fields", async () => {
    const res = await resetPost(makeResetRequest({ token: "some-token" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const ip = "8.8.8.8";
    for (let i = 0; i < 5; i++) {
      await resetPost(makeResetRequest({ token: "tok", password: "Pass1234!" }, ip));
    }
    const res = await resetPost(makeResetRequest({ token: "tok", password: "Pass1234!" }, ip));
    expect(res.status).toBe(429);
  });

  it("does not change password on expired token", async () => {
    const user = await seedUser({ email: "user@example.com", passwordHash: "original-hash" });
    const token = await seedToken(user.id, { expiresAt: new Date(Date.now() - 1000) });

    await resetPost(makeResetRequest({ token: token.token, password: "NewPass1!" }));

    const unchanged = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.passwordHash).toBe("original-hash");
    expect(unchanged.tokenVersion).toBe(0);
  });

  it("allows a token to be used only once under concurrent requests (atomic single-use)", async () => {
    const user = await seedUser({ email: "race@example.com" });
    const token = await seedToken(user.id);
    const { verifyPassword } = await import("@/lib/server/hash");

    // Fire two resets for the same token at once. The single-use guarantee comes
    // from the conditional UPDATE: only one request can flip used_at from null.
    //
    // NOTE: on a real Postgres the losing request sees `count === 0` and returns
    // 400. PGlite (the in-process test engine) cannot run two write
    // transactions concurrently, so the loser's transaction is aborted and the
    // handler rejects (equivalent to a 500). Either way the security invariant
    // below must hold: exactly one success and exactly one password change.
    const results = await Promise.allSettled([
      resetPost(makeResetRequest({ token: token.token, password: "FirstPass1!" }, "10.0.0.1")),
      resetPost(makeResetRequest({ token: token.token, password: "SecondPass1!" }, "10.0.0.2")),
    ]);

    const okCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === 200,
    ).length;
    expect(okCount).toBe(1);

    // The token is consumed exactly once and sessions are revoked exactly once.
    const updated = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.tokenVersion).toBe(1);

    const stored = await db.passwordResetToken.findUnique({ where: { token: token.token } });
    expect(stored?.usedAt).not.toBeNull();

    // The stored password matches exactly one of the two submitted values.
    const matchesFirst = await verifyPassword(updated.passwordHash as string, "FirstPass1!");
    const matchesSecond = await verifyPassword(updated.passwordHash as string, "SecondPass1!");
    expect(matchesFirst !== matchesSecond).toBe(true);

    // A subsequent reset with the now-used token is always rejected.
    const replay = await resetPost(
      makeResetRequest({ token: token.token, password: "ReplayPass1!" }, "10.0.0.3"),
    );
    expect(replay.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// reset-password token validation (GET)
// ---------------------------------------------------------------------------

describe("GET /api/v1/auth/reset-password (token validation)", () => {
  it("returns 200 for a valid token", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id);

    const res = await resetGet(makeValidateRequest(token.token));
    expect(res.status).toBe(200);
  });

  it("does not consume the token when validating", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id);

    await resetGet(makeValidateRequest(token.token));

    const stored = await db.passwordResetToken.findUnique({ where: { token: token.token } });
    expect(stored?.usedAt).toBeNull();
  });

  it("returns 400 when token is missing", async () => {
    const res = await resetGet(makeValidateRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown token", async () => {
    const res = await resetGet(makeValidateRequest("does-not-exist"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an expired token", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id, { expiresAt: new Date(Date.now() - 1000) });

    const res = await resetGet(makeValidateRequest(token.token));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an already used token", async () => {
    const user = await seedUser({ email: "user@example.com" });
    const token = await seedToken(user.id, { usedAt: new Date() });

    const res = await resetGet(makeValidateRequest(token.token));
    expect(res.status).toBe(400);
  });
});
