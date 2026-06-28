import { jwtVerify, SignJWT } from "jose";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
export interface AuthJwtPayload {
  sub: string;
  tokenVersion: number;
  kind: "access" | "refresh";
}

function readSecret(name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET", testFallback: string) {
  const secret = process.env[name] ?? (process.env.NODE_ENV === "test" ? testFallback : undefined);
  if (!secret) throw new Error(`${name} is required`);
  return new TextEncoder().encode(secret);
}

const ACCESS_SECRET_FALLBACK = "test-only-access-secret-with-32-characters";
const REFRESH_SECRET_FALLBACK = "test-only-refresh-secret-with-32-characters";

async function sign(payload: AuthJwtPayload, secret: Uint8Array, expiresIn: string) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function signAuthTokens(userId: string, tokenVersion: number): Promise<AuthTokens> {
  const accessToken = await sign(
    { sub: userId, tokenVersion, kind: "access" },
    readSecret("JWT_ACCESS_SECRET", ACCESS_SECRET_FALLBACK),
    "15m",
  );
  const refreshToken = await sign(
    { sub: userId, tokenVersion, kind: "refresh" },
    readSecret("JWT_REFRESH_SECRET", REFRESH_SECRET_FALLBACK),
    "7d",
  );
  return { accessToken, refreshToken };
}

export async function verifyAccessToken(token: string): Promise<AuthJwtPayload> {
  const { payload } = await jwtVerify(
    token,
    readSecret("JWT_ACCESS_SECRET", ACCESS_SECRET_FALLBACK),
  );
  return payload as unknown as AuthJwtPayload;
}

export async function verifyRefreshToken(token: string): Promise<AuthJwtPayload> {
  const { payload } = await jwtVerify(
    token,
    readSecret("JWT_REFRESH_SECRET", REFRESH_SECRET_FALLBACK),
  );
  return payload as unknown as AuthJwtPayload;
}
