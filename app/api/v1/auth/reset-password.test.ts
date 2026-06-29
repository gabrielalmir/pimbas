import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/server/rate-limit";

// ---------------------------------------------------------------------------
// Minimal DB mock for password reset flows
// ---------------------------------------------------------------------------

type MockUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  googleSub: string | null;
  tokenVersion: number;
};

type MockResetToken = {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

function createDbMock() {
  const users = new Map<string, MockUser>();
  const resetTokens = new Map<string, MockResetToken>();
  let userSeq = 1;
  let tokenSeq = 1;

  return {
    _users: users,
    _resetTokens: resetTokens,

    _seedUser(overrides: Partial<MockUser> = {}): MockUser {
      const user: MockUser = {
        id: `user-${userSeq++}`,
        email: `user${userSeq}@example.com`,
        passwordHash: "hashed-password",
        googleSub: null,
        tokenVersion: 0,
        ...overrides,
      };
      users.set(user.id, user);
      return user;
    },

    _seedToken(overrides: Partial<MockResetToken> = {}): MockResetToken {
      const token: MockResetToken = {
        id: `token-${tokenSeq++}`,
        token: `valid-token-${tokenSeq}`,
        userId: "user-1",
        expiresAt: new Date(Date.now() + 3_600_000),
        usedAt: null,
        ...overrides,
      };
      resetTokens.set(token.token, token);
      return token;
    },

    user: {
      findUnique({ where }: { where: { email?: string; id?: string } }) {
        const found = where.email
          ? [...users.values()].find((u) => u.email === where.email)
          : where.id
            ? users.get(where.id)
            : undefined;
        return Promise.resolve(found ?? null);
      },
      update({
        where,
        data,
      }: {
        where: { id: string };
        data: { passwordHash?: string | null; tokenVersion?: number | { increment: number } };
      }) {
        const user = users.get(where.id);
        if (!user) throw new Error("User not found");
        if (
          data.tokenVersion &&
          typeof data.tokenVersion === "object" &&
          "increment" in data.tokenVersion
        ) {
          user.tokenVersion += data.tokenVersion.increment;
        } else if (typeof data.tokenVersion === "number") {
          user.tokenVersion = data.tokenVersion;
        }
        if (data.passwordHash !== undefined) user.passwordHash = data.passwordHash;
        users.set(user.id, user);
        return Promise.resolve(user);
      },
    },

    passwordResetToken: {
      create({ data }: { data: Omit<MockResetToken, "id"> }) {
        const record: MockResetToken = { id: `token-${tokenSeq++}`, ...data };
        resetTokens.set(record.token, record);
        return Promise.resolve(record);
      },
      findUnique({ where }: { where: { token: string } }) {
        return Promise.resolve(resetTokens.get(where.token) ?? null);
      },
      update({ where, data }: { where: { token: string }; data: Partial<MockResetToken> }) {
        const record = resetTokens.get(where.token);
        if (!record) throw new Error("Token not found");
        Object.assign(record, data);
        resetTokens.set(record.token, record);
        return Promise.resolve(record);
      },
      deleteMany({ where }: { where: { userId: string } }) {
        let count = 0;
        for (const [key, t] of resetTokens.entries()) {
          if (t.userId === where.userId) {
            resetTokens.delete(key);
            count++;
          }
        }
        return Promise.resolve({ count });
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

let db: ReturnType<typeof createDbMock>;

vi.mock("@/lib/server/prisma", () => ({
  getDb: () => db,
}));

const mockSendEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/server/email", () => ({
  sendPasswordResetEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/server/hash", () => ({
  hashPassword: (pw: string) => Promise.resolve(`hashed:${pw}`),
  verifyPassword: (hash: string, pw: string) => Promise.resolve(hash === `hashed:${pw}`),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/v1/auth/forgot-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function makeResetRequest(body: unknown, ip = "1.2.3.4") {
  return new Request("http://localhost/api/v1/auth/reset-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// forgot-password endpoint
// ---------------------------------------------------------------------------

describe("POST /api/v1/auth/forgot-password", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimits();
    db = createDbMock();
    vi.resetModules();
  });

  it("returns 200 and sends email for a known user", async () => {
    db._seedUser({ email: "user@example.com", googleSub: null });
    const { POST } = await import("./forgot-password/route");

    const res = await POST(makeRequest({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@example.com" }),
      expect.any(String),
    );
  });

  it("returns 200 silently for unknown email (no enumeration)", async () => {
    const { POST } = await import("./forgot-password/route");

    const res = await POST(makeRequest({ email: "ghost@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 200 silently for OAuth-only user (no passwordHash)", async () => {
    db._seedUser({ email: "oauth@example.com", passwordHash: null, googleSub: "google-id-123" });
    const { POST } = await import("./forgot-password/route");

    const res = await POST(makeRequest({ email: "oauth@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid email", async () => {
    const { POST } = await import("./forgot-password/route");

    const res = await POST(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing body", async () => {
    const { POST } = await import("./forgot-password/route");

    const req = new Request("http://localhost/api/v1/auth/forgot-password", {
      method: "POST",
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const { POST } = await import("./forgot-password/route");
    const ip = "9.9.9.9";

    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ email: "user@example.com" }, ip));
    }
    const res = await POST(makeRequest({ email: "user@example.com" }, ip));
    expect(res.status).toBe(429);
  });

  it("creates a reset token in the database", async () => {
    db._seedUser({ email: "user@example.com" });
    const { POST } = await import("./forgot-password/route");

    await POST(makeRequest({ email: "user@example.com" }));
    expect(db._resetTokens.size).toBe(1);
  });

  it("token expires in the future", async () => {
    db._seedUser({ email: "user@example.com" });
    const { POST } = await import("./forgot-password/route");

    await POST(makeRequest({ email: "user@example.com" }));
    const [token] = db._resetTokens.values();
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

// ---------------------------------------------------------------------------
// reset-password endpoint
// ---------------------------------------------------------------------------

describe("POST /api/v1/auth/reset-password", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimits();
    db = createDbMock();
    vi.resetModules();
  });

  it("resets password and invalidates sessions for a valid token", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({ userId: user.id });
    const { POST } = await import("./reset-password/route");

    const res = await POST(
      makeResetRequest({ token: tokenRecord.token, password: "NewPassword1!" }),
    );
    expect(res.status).toBe(200);

    const updatedUser = db._users.get(user.id);
    expect(updatedUser?.passwordHash).toBe("hashed:NewPassword1!");
    expect(updatedUser?.tokenVersion).toBe(1);
  });

  it("marks token as used after reset", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({ userId: user.id });
    const { POST } = await import("./reset-password/route");

    await POST(makeResetRequest({ token: tokenRecord.token, password: "NewPassword1!" }));

    const stored = db._resetTokens.get(tokenRecord.token);
    expect(stored?.usedAt).not.toBeNull();
  });

  it("returns 400 for an expired token", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({
      userId: user.id,
      expiresAt: new Date(Date.now() - 1000),
    });
    const { POST } = await import("./reset-password/route");

    const res = await POST(
      makeResetRequest({ token: tokenRecord.token, password: "NewPassword1!" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an already used token", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({ userId: user.id, usedAt: new Date() });
    const { POST } = await import("./reset-password/route");

    const res = await POST(
      makeResetRequest({ token: tokenRecord.token, password: "NewPassword1!" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown token", async () => {
    const { POST } = await import("./reset-password/route");

    const res = await POST(
      makeResetRequest({ token: "non-existent-token", password: "NewPass1!" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for password shorter than 8 characters", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({ userId: user.id });
    const { POST } = await import("./reset-password/route");

    const res = await POST(makeResetRequest({ token: tokenRecord.token, password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("./reset-password/route");

    const res = await POST(makeResetRequest({ token: "some-token" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const { POST } = await import("./reset-password/route");
    const ip = "8.8.8.8";

    for (let i = 0; i < 5; i++) {
      await POST(makeResetRequest({ token: "tok", password: "Pass1234!" }, ip));
    }
    const res = await POST(makeResetRequest({ token: "tok", password: "Pass1234!" }, ip));
    expect(res.status).toBe(429);
  });

  it("does not change password on expired token", async () => {
    const user = db._seedUser({ email: "user@example.com", passwordHash: "hashed:OldPass1!" });
    const tokenRecord = db._seedToken({
      userId: user.id,
      expiresAt: new Date(Date.now() - 1000),
    });
    const { POST } = await import("./reset-password/route");

    await POST(makeResetRequest({ token: tokenRecord.token, password: "NewPass1!" }));

    const unchanged = db._users.get(user.id);
    expect(unchanged?.passwordHash).toBe("hashed:OldPass1!");
    expect(unchanged?.tokenVersion).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// reset-password token validation (GET)
// ---------------------------------------------------------------------------

function makeValidateRequest(token: string | null, ip = "1.2.3.4") {
  const url = new URL("http://localhost/api/v1/auth/reset-password");
  if (token !== null) url.searchParams.set("token", token);
  return new Request(url, {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
}

describe("GET /api/v1/auth/reset-password (token validation)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetRateLimits();
    db = createDbMock();
    vi.resetModules();
  });

  it("returns 200 for a valid token", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({ userId: user.id });
    const { GET } = await import("./reset-password/route");

    const res = await GET(makeValidateRequest(tokenRecord.token));
    expect(res.status).toBe(200);
  });

  it("does not consume the token when validating", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({ userId: user.id });
    const { GET } = await import("./reset-password/route");

    await GET(makeValidateRequest(tokenRecord.token));

    const stored = db._resetTokens.get(tokenRecord.token);
    expect(stored?.usedAt).toBeNull();
  });

  it("returns 400 when token is missing", async () => {
    const { GET } = await import("./reset-password/route");

    const res = await GET(makeValidateRequest(null));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an unknown token", async () => {
    const { GET } = await import("./reset-password/route");

    const res = await GET(makeValidateRequest("does-not-exist"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an expired token", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({
      userId: user.id,
      expiresAt: new Date(Date.now() - 1000),
    });
    const { GET } = await import("./reset-password/route");

    const res = await GET(makeValidateRequest(tokenRecord.token));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an already used token", async () => {
    const user = db._seedUser({ email: "user@example.com" });
    const tokenRecord = db._seedToken({ userId: user.id, usedAt: new Date() });
    const { GET } = await import("./reset-password/route");

    const res = await GET(makeValidateRequest(tokenRecord.token));
    expect(res.status).toBe(400);
  });
});
