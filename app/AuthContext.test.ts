import { describe, expect, it } from "vitest";
import { deriveAuthStatus } from "./AuthContext";

describe("deriveAuthStatus", () => {
  it("is loading while the /me query is in flight", () => {
    expect(
      deriveAuthStatus({
        authenticated: true,
        isLoading: true,
        playerProfile: undefined,
      }),
    ).toBe("loading");
  });

  it("is anonymous when there is no access token", () => {
    expect(
      deriveAuthStatus({
        authenticated: false,
        isLoading: false,
        playerProfile: undefined,
      }),
    ).toBe("anonymous");
  });

  it("needs a profile when authenticated but no player profile exists yet", () => {
    expect(
      deriveAuthStatus({
        authenticated: true,
        isLoading: false,
        playerProfile: undefined,
      }),
    ).toBe("needs-profile");
  });

  it("is ready once authenticated with a player profile", () => {
    expect(
      deriveAuthStatus({
        authenticated: true,
        isLoading: false,
        playerProfile: { id: "player-1" } as never,
      }),
    ).toBe("ready");
  });
});
