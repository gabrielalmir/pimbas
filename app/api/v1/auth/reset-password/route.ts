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

  const tokenRecord = await db.passwordResetToken.findUnique({ where: { token } });

  if (!tokenRecord) return badRequest("Invalid or expired reset token.");
  if (tokenRecord.expiresAt < new Date()) return badRequest("Invalid or expired reset token.");
  if (tokenRecord.usedAt !== null) return badRequest("Invalid or expired reset token.");

  const newHash = await hashPassword(password);

  await db.user.update({
    where: { id: tokenRecord.userId },
    data: {
      passwordHash: newHash,
      tokenVersion: { increment: 1 },
    },
  });

  await db.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ message: "Password reset successfully." });
}
