import { describe, expect, it } from "vitest";
import { createPair } from "./matchRules";
import {
  advanceTournament,
  applyMatchResultToTournament,
  createRandomPairs,
  createThirdPlaceMatchup,
  generateBracket,
  isMatchupReadyToStart,
  resolveInitialByes,
} from "./tournament";
import type { Match, Tournament } from "./types";

function makeFourPairTournament(): Tournament {
  const pairs = [
    createPair("a", "A", "p1", "p2"),
    createPair("b", "B", "p3", "p4"),
    createPair("c", "C", "p5", "p6"),
    createPair("d", "D", "p7", "p8"),
  ];
  return {
    id: "tournament-test",
    groupId: "group-test",
    name: "Copa Teste",
    status: "live",
    pairs,
    settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
    matchups: generateBracket(pairs),
    thirdPlaceMatchup: createThirdPlaceMatchup(),
  };
}

function makeFinishedMatch(overrides: Partial<Match>): Match {
  return {
    id: "match-test",
    groupId: "group-test",
    kind: "tournament",
    status: "finished",
    pairA: createPair("a", "A", "p1", "p2"),
    pairB: createPair("b", "B", "p3", "p4"),
    settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
    goals: [],
    startedAt: "2026-06-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("tournament rules", () => {
  it("rejects odd number of players", () => {
    expect(() => createRandomPairs(["p1", "p2", "p3"])).toThrow("numero par");
  });

  it("generates byes when pair count is not a perfect bracket", () => {
    const pairs = [
      createPair("a", "A", "p1", "p2"),
      createPair("b", "B", "p3", "p4"),
      createPair("c", "C", "p5", "p6"),
    ];

    const bracket = generateBracket(pairs);

    expect(bracket.some((matchup) => matchup.status === "bye")).toBe(true);
    expect(bracket[bracket.length - 1]?.label).toBe("Final");
  });

  it("wires round 1 winners into the final and semifinal losers into third place", () => {
    const bracket = generateBracket([
      createPair("a", "A", "p1", "p2"),
      createPair("b", "B", "p3", "p4"),
      createPair("c", "C", "p5", "p6"),
      createPair("d", "D", "p7", "p8"),
    ]);
    const [game1, game2, final] = bracket;

    expect(game1.nextMatchupId).toBe(final.id);
    expect(game2.nextMatchupId).toBe(final.id);
    expect(game1.nextSlot).toBe("pairAId");
    expect(game2.nextSlot).toBe("pairBId");
    expect(game1.thirdPlaceSlot).toBe("pairAId");
    expect(game2.thirdPlaceSlot).toBe("pairBId");
  });

  it("advances a round winner into the final's slot", () => {
    const tournament = makeFourPairTournament();
    const game1 = tournament.matchups[0];
    const decided = {
      ...tournament,
      matchups: tournament.matchups.map((item) =>
        item.id === game1.id ? { ...item, winnerPairId: "a", status: "finished" as const } : item,
      ),
    };

    const advanced = advanceTournament(decided, game1.id);
    const final = advanced.matchups.find((item) => item.id === game1.nextMatchupId);

    expect(final?.pairAId).toBe("a");
    expect(advanced.championPairId).toBeUndefined();
  });

  it("sends the semifinal loser to the third place matchup", () => {
    const tournament = makeFourPairTournament();
    const game1 = tournament.matchups[0];
    const decided = {
      ...tournament,
      matchups: tournament.matchups.map((item) =>
        item.id === game1.id ? { ...item, winnerPairId: "a", status: "finished" as const } : item,
      ),
    };

    const advanced = advanceTournament(decided, game1.id);

    expect(advanced.thirdPlaceMatchup?.pairAId).toBe("b");
  });

  it("crowns a champion and finishes the tournament when the final is decided", () => {
    const tournament = makeFourPairTournament();
    const final = tournament.matchups[tournament.matchups.length - 1];
    const decided = {
      ...tournament,
      matchups: tournament.matchups.map((item) =>
        item.id === final.id
          ? {
              ...item,
              pairAId: "a",
              pairBId: "c",
              winnerPairId: "a",
              status: "finished" as const,
            }
          : item,
      ),
    };

    const advanced = advanceTournament(decided, final.id);

    expect(advanced.championPairId).toBe("a");
    expect(advanced.status).toBe("finished");
  });

  it("auto-advances byes at creation time", () => {
    const pairs = [
      createPair("a", "A", "p1", "p2"),
      createPair("b", "B", "p3", "p4"),
      createPair("c", "C", "p5", "p6"),
    ];
    const draft: Tournament = {
      id: "tournament-bye",
      groupId: "group-test",
      name: "Copa Bye",
      status: "live",
      pairs,
      settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
      matchups: generateBracket(pairs),
    };

    const resolved = resolveInitialByes(draft);
    const byeMatchup = resolved.matchups.find((item) => item.status === "bye");

    expect(byeMatchup).toBeDefined();
    if (!byeMatchup) return;

    expect(byeMatchup.nextSlot).toBeDefined();
    if (!byeMatchup.nextSlot) return;

    const final = resolved.matchups.find((item) => item.id === byeMatchup.nextMatchupId);

    expect(final?.[byeMatchup.nextSlot]).toBe(byeMatchup.winnerPairId);
  });

  it("applies a finished match result to its matchup and advances the bracket", () => {
    const tournament = makeFourPairTournament();
    const game1 = tournament.matchups[0];
    const withMatch = {
      ...tournament,
      matchups: tournament.matchups.map((item) =>
        item.id === game1.id ? { ...item, matchId: "match-test", status: "live" as const } : item,
      ),
    };
    const match = makeFinishedMatch({
      tournamentId: tournament.id,
      winnerPairId: "a",
    });

    const updated = applyMatchResultToTournament(withMatch, match);
    const updatedGame1 = updated.matchups.find((item) => item.id === game1.id);
    const final = updated.matchups.find((item) => item.id === game1.nextMatchupId);

    expect(updatedGame1?.status).toBe("finished");
    expect(final?.pairAId).toBe("a");
  });

  it("maps match pair winner ids to tournament pair ids when applying a finished match", () => {
    const tournament = makeFourPairTournament();
    const game1 = tournament.matchups[0];
    const withMatch = {
      ...tournament,
      matchups: tournament.matchups.map((item) =>
        item.id === game1.id ? { ...item, matchId: "match-test", status: "live" as const } : item,
      ),
    };
    const match = makeFinishedMatch({
      tournamentId: tournament.id,
      pairA: createPair("match-pair-a", "A", "p1", "p2"),
      pairB: createPair("match-pair-b", "B", "p3", "p4"),
      winnerPairId: "match-pair-a",
    });

    const updated = applyMatchResultToTournament(withMatch, match);
    const updatedGame1 = updated.matchups.find((item) => item.id === game1.id);

    expect(updatedGame1?.winnerPairId).toBe(game1.pairAId);
  });

  it("flags a matchup as ready to start only when both pairs are set and no match exists yet", () => {
    const tournament = makeFourPairTournament();
    const [game1, , final] = tournament.matchups;

    expect(isMatchupReadyToStart(game1)).toBe(true);
    expect(isMatchupReadyToStart(final)).toBe(false);
  });
});
