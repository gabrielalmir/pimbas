import { beforeEach, describe, expect, it } from "vitest";
import { isRateLimited, resetRateLimits } from "./rate-limit";

function request(ip: string) {
  return new Request("http://localhost/test", {
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  resetRateLimits();
});

describe("isRateLimited", () => {
  it("allows requests under the limit", () => {
    const req = request("1.1.1.1");
    expect(isRateLimited(req, "auth:login", 3, 60_000)).toBe(false);
    expect(isRateLimited(req, "auth:login", 3, 60_000)).toBe(false);
    expect(isRateLimited(req, "auth:login", 3, 60_000)).toBe(false);
  });

  it("blocks once the limit is exceeded within the window", () => {
    const req = request("2.2.2.2");
    for (let i = 0; i < 3; i += 1) isRateLimited(req, "auth:login", 3, 60_000);
    expect(isRateLimited(req, "auth:login", 3, 60_000)).toBe(true);
  });

  it("tracks each IP independently", () => {
    const reqA = request("3.3.3.3");
    const reqB = request("4.4.4.4");
    for (let i = 0; i < 3; i += 1) isRateLimited(reqA, "auth:login", 3, 60_000);
    expect(isRateLimited(reqA, "auth:login", 3, 60_000)).toBe(true);
    expect(isRateLimited(reqB, "auth:login", 3, 60_000)).toBe(false);
  });

  it("tracks each scope independently for the same IP", () => {
    const req = request("5.5.5.5");
    for (let i = 0; i < 3; i += 1) isRateLimited(req, "auth:signup", 3, 60_000);
    expect(isRateLimited(req, "auth:signup", 3, 60_000)).toBe(true);
    expect(isRateLimited(req, "auth:login", 3, 60_000)).toBe(false);
  });
});
