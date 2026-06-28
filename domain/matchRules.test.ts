import { describe, expect, it } from "vitest";
import { createPair, enterGoldenGoalIfTied, getScore, registerGoal, undoGoal } from "./matchRules";
import type { Match } from "./types";

function makeMatch(): Match {
  return {
    id: "match-test",
    groupId: "group-test",
    kind: "friendly",
    status: "live",
    pairA: createPair("a", "A", "p1", "p2"),
    pairB: createPair("b", "B", "p3", "p4"),
    settings: { goalLimit: 2, timeLimitMinutes: 3, goldenGoal: true },
    goals: [],
    startedAt: "2026-06-20T10:00:00.000Z",
  };
}

describe("match rules", () => {
  it("registers a goal with player position and pair", () => {
    const match = registerGoal(makeMatch(), "p2", new Date("2026-06-20T10:01:00.000Z"));

    expect(getScore(match)).toEqual([1, 0]);
    expect(match.goals[0]).toMatchObject({
      playerId: "p2",
      pairId: "a",
      position: "attacker",
    });
  });

  it("finishes match when goal limit is reached", () => {
    const first = registerGoal(makeMatch(), "p2", new Date("2026-06-20T10:01:00.000Z"));
    const second = registerGoal(first, "p1", new Date("2026-06-20T10:01:30.000Z"));

    expect(second.status).toBe("finished");
    expect(second.winnerPairId).toBe("a");
  });

  it("enters golden goal only when tied", () => {
    const tied = registerGoal(
      registerGoal(makeMatch(), "p2", new Date("2026-06-20T10:01:00.000Z")),
      "p3",
      new Date("2026-06-20T10:01:30.000Z"),
    );

    expect(enterGoldenGoalIfTied(tied).status).toBe("golden_goal");
  });

  it("undoes a recent selected goal and reopens a match finished by goal limit", () => {
    const first = registerGoal(makeMatch(), "p2", new Date("2026-06-20T10:01:00.000Z"));
    const finished = registerGoal(first, "p1", new Date("2026-06-20T10:01:05.000Z"));

    const updated = undoGoal(finished, finished.goals[1].id, new Date("2026-06-20T10:01:10.000Z"));

    expect(getScore(updated)).toEqual([1, 0]);
    expect(updated.status).toBe("live");
    expect(updated.winnerPairId).toBeUndefined();
    expect(updated.finishedAt).toBeUndefined();
  });

  it("rejects undo after the 10 second safety window", () => {
    const match = registerGoal(makeMatch(), "p2", new Date("2026-06-20T10:01:00.000Z"));

    expect(() => undoGoal(match, match.goals[0].id, new Date("2026-06-20T10:01:11.000Z"))).toThrow(
      "10 segundos",
    );
  });

  it("rejects goals after the configured time limit when not in golden goal", () => {
    expect(() => registerGoal(makeMatch(), "p2", new Date("2026-06-20T10:03:00.000Z"))).toThrow(
      "Tempo esgotado",
    );
  });

  it("allows the decisive goal after time only when the match is in golden goal", () => {
    const tied = registerGoal(
      registerGoal(makeMatch(), "p2", new Date("2026-06-20T10:01:00.000Z")),
      "p3",
      new Date("2026-06-20T10:01:30.000Z"),
    );
    const goldenGoal = enterGoldenGoalIfTied(tied);

    const decided = registerGoal(goldenGoal, "p2", new Date("2026-06-20T10:03:10.000Z"));

    expect(decided.status).toBe("finished");
    expect(decided.winnerPairId).toBe("a");
  });

  it("rejects goals from players outside the match", () => {
    expect(() => registerGoal(makeMatch(), "p9", new Date("2026-06-20T10:01:00.000Z"))).toThrow(
      "jogador da partida",
    );
  });
});
