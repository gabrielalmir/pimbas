import type { NextResponse } from "next/server";
import { unauthorized } from "./errors";
import { verifyAccessToken } from "./jwt";

export interface AuthUser {
  id: string;
  tokenVersion: number;
}

export type AuthResult = { authUser: AuthUser } | { response: NextResponse };

/** Verifies the Bearer access token on the request. Callers must check `"response" in result`. */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token) return { response: unauthorized() };
  try {
    const payload = await verifyAccessToken(token);
    if (payload.kind !== "access") return { response: unauthorized() };
    return {
      authUser: { id: payload.sub, tokenVersion: payload.tokenVersion },
    };
  } catch {
    return { response: unauthorized() };
  }
}
