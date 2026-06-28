import { describe, expect, it } from "vitest";
import { matches, players } from "./__fixtures__/rankingFixtures";
import { createPair } from "./matchRules";
import { calculatePlayerStats, calculateRanking } from "./ranking";
import { createThirdPlaceMatchup, generateBracket } from "./tournament";
import type { Tournament } from "./types";

function makeDecidedTournament(): Tournament {
  const champion = createPair("pair-champion", "Campeoes", "player-zt", "player-mg");
  const runnerUp = createPair("pair-runner-up", "Vices", "player-bs", "player-ru");
  const third = createPair("pair-third", "Terceiro", "player-td", "player-nn");
  const fourth = createPair("pair-fourth", "Quarto", "player-pr", "player-lm");
  const pairs = [champion, runnerUp, third, fourth];
  const matchups = generateBracket(pairs).map((matchup) => {
    if (matchup.round === 1 && matchup.label === "Jogo 1")
      return {
        ...matchup,
        pairAId: champion.id,
        pairBId: fourth.id,
        winnerPairId: champion.id,
        status: "finished" as const,
      };
    if (matchup.round === 1 && matchup.label === "Jogo 2")
      return {
        ...matchup,
        pairAId: runnerUp.id,
        pairBId: third.id,
        winnerPairId: runnerUp.id,
        status: "finished" as const,
      };
    return {
      ...matchup,
      pairAId: champion.id,
      pairBId: runnerUp.id,
      winnerPairId: champion.id,
      status: "finished" as const,
    };
  });

  return {
    id: "tournament-decided",
    groupId: "group-trampo",
    name: "Copa Decidida",
    status: "finished",
    pairs,
    settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
    matchups,
    thirdPlaceMatchup: {
      ...createThirdPlaceMatchup(),
      pairAId: third.id,
      pairBId: fourth.id,
      winnerPairId: third.id,
      status: "finished",
    },
    championPairId: champion.id,
  };
}

describe("ranking", () => {
  it("orders ranking entries by points descending", () => {
    const finished = matches.filter((match) => match.status === "finished");
    const ranking = calculateRanking(calculatePlayerStats("group-trampo", players, finished));

    for (let index = 1; index < ranking.length; index += 1) {
      expect(ranking[index - 1].points).toBeGreaterThanOrEqual(ranking[index].points);
    }
    expect(ranking.find((entry) => entry.playerId === "player-zt")?.stats.goals).toBeGreaterThan(0);
  });

  it("does not generate individual persistent stats for anonymous players", () => {
    const stats = calculatePlayerStats("group-trampo", players, matches);

    expect(stats.some((entry) => entry.playerId === "player-lm")).toBe(false);
  });

  it("awards title, runner-up and third-place bonuses from a decided tournament", () => {
    const tournament = makeDecidedTournament();
    const stats = calculatePlayerStats("group-trampo", players, [], [tournament]);

    expect(stats.find((entry) => entry.playerId === "player-zt")?.titles).toBe(1);
    expect(stats.find((entry) => entry.playerId === "player-bs")?.runnerUps).toBe(1);
    expect(stats.find((entry) => entry.playerId === "player-td")?.thirdPlaces).toBe(1);
    expect(stats.find((entry) => entry.playerId === "player-pr")?.titles).toBe(0);
  });

  it("computes current and best win streaks from chronological match history", () => {
    const stats = calculatePlayerStats("group-trampo", players, matches);

    const zt = stats.find((entry) => entry.playerId === "player-zt");
    expect(zt?.bestStreak).toBeGreaterThanOrEqual(zt?.currentStreak ?? 0);
    expect(zt?.currentStreak).toBeGreaterThanOrEqual(0);
  });
});
