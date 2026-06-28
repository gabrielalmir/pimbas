import { getScore } from "./matchRules";
import type {
  Match,
  PairStats,
  PlayerProfile,
  PlayerStats,
  RankingEntry,
  Tournament,
} from "./types";

interface TournamentHonors {
  titles: number;
  runnerUps: number;
  thirdPlaces: number;
}

/** Le titulos, vices e terceiros lugares de fato dos torneios decididos (championPairId, perdedor da final, vencedor do 3o lugar). */
function calculateTournamentHonors(tournaments: Tournament[]): Map<string, TournamentHonors> {
  const honors = new Map<string, TournamentHonors>();
  const add = (playerIds: string[] | undefined, key: keyof TournamentHonors) => {
    playerIds?.forEach((playerId) => {
      const current = honors.get(playerId) ?? {
        titles: 0,
        runnerUps: 0,
        thirdPlaces: 0,
      };
      current[key] += 1;
      honors.set(playerId, current);
    });
  };

  tournaments.forEach((item) => {
    if (!item.championPairId) return;

    const champion = item.pairs.find((pair) => pair.id === item.championPairId);
    add(
      champion?.players.map((entry) => entry.playerId),
      "titles",
    );

    const finalMatchup = item.matchups.find((matchup) => !matchup.nextMatchupId);
    if (finalMatchup?.status === "finished" && finalMatchup.winnerPairId) {
      const runnerUpPairId =
        finalMatchup.pairAId === finalMatchup.winnerPairId
          ? finalMatchup.pairBId
          : finalMatchup.pairAId;
      const runnerUp = item.pairs.find((pair) => pair.id === runnerUpPairId);
      add(
        runnerUp?.players.map((entry) => entry.playerId),
        "runnerUps",
      );
    }

    if (item.thirdPlaceMatchup?.status === "finished" && item.thirdPlaceMatchup.winnerPairId) {
      const thirdPlace = item.pairs.find(
        (pair) => pair.id === item.thirdPlaceMatchup?.winnerPairId,
      );
      add(
        thirdPlace?.players.map((entry) => entry.playerId),
        "thirdPlaces",
      );
    }
  });

  return honors;
}

/** results em ordem cronologica (true = vitoria). Sequencia atual conta a partir do jogo mais recente. */
function calculateStreaks(results: boolean[]): {
  currentStreak: number;
  bestStreak: number;
} {
  let bestStreak = 0;
  let running = 0;
  for (const won of results) {
    running = won ? running + 1 : 0;
    bestStreak = Math.max(bestStreak, running);
  }

  let currentStreak = 0;
  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (!results[index]) break;
    currentStreak += 1;
  }

  return { currentStreak, bestStreak };
}

export function calculatePlayerStats(
  groupId: string,
  players: PlayerProfile[],
  matches: Match[],
  tournaments: Tournament[] = [],
): PlayerStats[] {
  const honors = calculateTournamentHonors(tournaments);

  return players
    .filter((player) => !player.isAnonymous)
    .map((player) => {
      const playerMatches = matches
        .filter((match) =>
          [...match.pairA.players, ...match.pairB.players].some(
            (entry) => entry.playerId === player.id,
          ),
        )
        .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
      const goals = matches
        .flatMap((match) => match.goals)
        .filter((goal) => goal.playerId === player.id && !goal.ownGoal);
      const results = playerMatches.map((match) => {
        const playerPairId = match.pairA.players.some((entry) => entry.playerId === player.id)
          ? match.pairA.id
          : match.pairB.id;
        return match.winnerPairId === playerPairId;
      });
      const wins = results.filter(Boolean).length;
      const { currentStreak, bestStreak } = calculateStreaks(results);
      const honor = honors.get(player.id) ?? {
        titles: 0,
        runnerUps: 0,
        thirdPlaces: 0,
      };

      return {
        playerId: player.id,
        groupId,
        matches: playerMatches.length,
        wins,
        losses: Math.max(playerMatches.length - wins, 0),
        goals: goals.length,
        goalkeeperGoals: goals.filter((goal) => goal.position === "goalkeeper").length,
        attackerGoals: goals.filter((goal) => goal.position === "attacker").length,
        titles: honor.titles,
        runnerUps: honor.runnerUps,
        thirdPlaces: honor.thirdPlaces,
        currentStreak,
        bestStreak,
      };
    });
}

export function calculateRanking(stats: PlayerStats[]): RankingEntry[] {
  return stats
    .map((entry) => ({
      playerId: entry.playerId,
      points:
        entry.wins * 3 +
        entry.goals +
        entry.titles * 10 +
        entry.runnerUps * 5 +
        entry.thirdPlaces * 3,
      position: 0,
      stats: entry,
    }))
    .sort(
      (a, b) => b.points - a.points || b.stats.wins - a.stats.wins || b.stats.goals - a.stats.goals,
    )
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function calculatePairStats(groupId: string, matches: Match[]): PairStats[] {
  const stats = new Map<string, PairStats>();

  matches.forEach((match) => {
    const [scoreA, scoreB] = getScore(match);
    [
      { pair: match.pairA, goalsFor: scoreA, goalsAgainst: scoreB },
      { pair: match.pairB, goalsFor: scoreB, goalsAgainst: scoreA },
    ].forEach(({ pair, goalsFor, goalsAgainst }) => {
      const playerIds = pair.players.map((player) => player.playerId).sort() as [string, string];
      const pairKey = playerIds.join(":");
      const current =
        stats.get(pairKey) ??
        ({
          pairKey,
          groupId,
          playerIds,
          matches: 0,
          wins: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          titles: 0,
        } satisfies PairStats);

      stats.set(pairKey, {
        ...current,
        matches: current.matches + 1,
        wins: current.wins + (match.winnerPairId === pair.id ? 1 : 0),
        losses:
          current.losses + (match.status === "finished" && match.winnerPairId !== pair.id ? 1 : 0),
        goalsFor: current.goalsFor + goalsFor,
        goalsAgainst: current.goalsAgainst + goalsAgainst,
      });
    });
  });

  return [...stats.values()].sort((a, b) => b.wins - a.wins || b.goalsFor - a.goalsFor);
}
