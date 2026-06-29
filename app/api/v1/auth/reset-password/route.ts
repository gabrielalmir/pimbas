import { NextResponse } from "next/server";
import { badRequest, tooManyRequests, validationError } from "@/lib/server/errors";
import { hashPassword } from "@/lib/server/hash";
import { getDb } from "@/lib/server/prisma";
import { isRateLimited } from "@/lib/server/rate-limit";
import { resetPasswordSchema } from "../schemas";

// Validates a reset token without consuming it, so the UI can decide whether to
// show the new-password form or an "invalid/expired link" message on load.
export async function GET(request: Request) {
  if (isRateLimited(request, "auth:reset-password", 5, 60_000)) return tooManyRequests();

  const token = new URL(request.url).searchParams.get("token");
  if (!token) return badRequest("Invalid or expired reset token.");

  const db = getDb();
  const tokenRecord = await db.passwordResetToken.findUnique({ where: { token } });

  if (!tokenRecord) return badRequest("Invalid or expired reset token.");
  if (tokenRecord.expiresAt < new Date()) return badRequest("Invalid or expired reset token.");
  if (tokenRecord.usedAt !== null) return badRequest("Invalid or expired reset token.");

  return NextResponse.json({ valid: true });
}

export async function POST(request: Request) {
  if (isRateLimited(request, "auth:reset-password", 5, 60_000)) return tooManyRequests();

  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);

  const db = getDb();
  const { token, password } = parsed.data;

  const newHash = await hashPassword(password);

  // Atomically claim the token: a single conditional UPDATE that only matches a
  // token that is still unused and not expired. This is what guarantees
  // single-use under concurrency — two simultaneous requests race on the same
  // row, but the database serializes the writes so only the first sees
  // `count === 1`; the second sees `count === 0` and is rejected. This holds on
  // any real Postgres without needing an interactive transaction.
  const claim = await db.passwordResetToken.updateMany({
    where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claim.count === 0) return badRequest("Invalid or expired reset token.");

  // The token was successfully consumed above; now apply the password change and
  // revoke existing sessions. If this step were to fail, the token stays
  // consumed (fail-safe): the user simply requests a new reset link.
  const tokenRecord = await db.passwordResetToken.findUnique({ where: { token } });
  if (!tokenRecord) return badRequest("Invalid or expired reset token.");

  await db.user.update({
    where: { id: tokenRecord.userId },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
    },
  });

  return NextResponse.json({ message: "Password reset successfully." });
}
