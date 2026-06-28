import { describe, expect, it } from "vitest";
import {
  createFriendlyInputSchema,
  createTournamentInputSchema,
  manualPairInputSchema,
} from "./schemas";

describe("createFriendlyInputSchema", () => {
  it("accepts a valid friendly payload", () => {
    const result = createFriendlyInputSchema.safeParse({
      groupId: "group-1",
      pairAName: "A",
      pairBName: "B",
      pairAGoalkeeperId: "p1",
      pairAAttackerId: "p2",
      pairBGoalkeeperId: "p3",
      pairBAttackerId: "p4",
      settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a non-positive goal limit", () => {
    const result = createFriendlyInputSchema.safeParse({
      groupId: "group-1",
      pairAName: "A",
      pairBName: "B",
      pairAGoalkeeperId: "p1",
      pairAAttackerId: "p2",
      pairBGoalkeeperId: "p3",
      pairBAttackerId: "p4",
      settings: { goalLimit: 0, timeLimitMinutes: 3, goldenGoal: true },
    });

    expect(result.success).toBe(false);
  });
});

describe("createTournamentInputSchema", () => {
  it("accepts random-draw input with playerIds", () => {
    const result = createTournamentInputSchema.safeParse({
      groupId: "group-1",
      name: "Copa Teste",
      settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
      playerIds: ["p1", "p2", "p3", "p4"],
    });

    expect(result.success).toBe(true);
  });

  it("accepts manual pairs input", () => {
    const result = createTournamentInputSchema.safeParse({
      groupId: "group-1",
      name: "Copa Teste",
      settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
      manualPairs: [{ name: "A", goalkeeperId: "p1", attackerId: "p2" }],
    });

    expect(result.success).toBe(true);
  });
});

describe("manualPairInputSchema", () => {
  it("rejects an empty pair name", () => {
    const result = manualPairInputSchema.safeParse({
      name: "",
      goalkeeperId: "p1",
      attackerId: "p2",
    });

    expect(result.success).toBe(false);
  });
});
