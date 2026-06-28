import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPair } from "./domain";

const apiFetch = vi.fn();
vi.mock("./auth", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  fetchMe: vi.fn(),
}));

const { httpDataClient } = await import("./http-data-client");

describe("httpDataClient", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  it("flattens pairA/pairB into the flat payload the API expects", async () => {
    const match = { id: "match-1" };
    apiFetch.mockResolvedValue({ match });
    const pairA = createPair("pa", "Time Verde", "player-1", "player-2");
    const pairB = createPair("pb", "Time Laranja", "player-3", "player-4");

    const result = await httpDataClient.createFriendly({
      groupId: "group-1",
      pairA,
      pairB,
      settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
    });

    expect(result).toBe(match);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/matches",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(apiFetch.mock.calls[0]?.[1]?.body as string);
    expect(body).toEqual({
      groupId: "group-1",
      pairAName: "Time Verde",
      pairBName: "Time Laranja",
      pairAGoalkeeperId: "player-1",
      pairAAttackerId: "player-2",
      pairBGoalkeeperId: "player-3",
      pairBAttackerId: "player-4",
      settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
    });
  });

  it("unwraps the {match} envelope for getLiveMatch and maps null to undefined", async () => {
    apiFetch.mockResolvedValue({ match: null });
    expect(await httpDataClient.getLiveMatch("group-1")).toBeUndefined();

    const match = { id: "match-2" };
    apiFetch.mockResolvedValue({ match });
    expect(await httpDataClient.getLiveMatch("group-1")).toBe(match);
  });

  it("unwraps the {match} envelope for getMatch", async () => {
    const match = { id: "match-3" };
    apiFetch.mockResolvedValue({ match });
    expect(await httpDataClient.getMatch("match-3")).toBe(match);
  });

  it("passes an optional groupId when listing players", async () => {
    apiFetch.mockResolvedValue({ players: [] });

    await httpDataClient.getPlayers();
    await httpDataClient.getPlayers("group 1");

    expect(apiFetch).toHaveBeenNthCalledWith(1, "/api/v1/players");
    expect(apiFetch).toHaveBeenNthCalledWith(2, "/api/v1/players?groupId=group%201");
  });

  it("sends default match settings in group updates", async () => {
    const group = { id: "group-1" };
    apiFetch.mockResolvedValue({ group });

    const result = await httpDataClient.updateGroup("group-1", {
      defaultMatchSettings: { goalLimit: 7, timeLimitMinutes: 12, goldenGoal: false },
    });

    expect(result).toBe(group);
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/groups/group-1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(JSON.parse(apiFetch.mock.calls[0]?.[1]?.body as string)).toEqual({
      defaultMatchSettings: { goalLimit: 7, timeLimitMinutes: 12, goldenGoal: false },
    });
  });

  it("unwraps the {match} envelope for registerGoal, undoGoal, and finishMatch", async () => {
    const match = { id: "match-4" };
    apiFetch.mockResolvedValue({ match });

    expect(await httpDataClient.registerGoal("match-4", "player-1")).toBe(match);
    expect(await httpDataClient.undoGoal("match-4", "goal-1")).toBe(match);
    expect(await httpDataClient.finishMatch("match-4")).toBe(match);
  });
});
