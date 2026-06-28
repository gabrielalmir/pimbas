import { createPair, getScore } from "./matchRules";
import type { Match, TeamPair, Tournament, TournamentMatchup } from "./types";

export function createRandomPairs(playerIds: string[]): TeamPair[] {
  if (playerIds.length % 2 !== 0) {
    throw new Error("Torneio precisa de numero par de jogadores.");
  }

  return [...playerIds].sort().reduce<TeamPair[]>((pairs, playerId, index, sorted) => {
    if (index % 2 !== 0) return pairs;
    pairs.push(
      createPair(`pair-${index / 2 + 1}`, `Dupla ${index / 2 + 1}`, playerId, sorted[index + 1]),
    );
    return pairs;
  }, []);
}

export function generateBracket(pairs: TeamPair[]): TournamentMatchup[] {
  if (pairs.length < 2) {
    throw new Error("Torneio precisa de pelo menos duas duplas.");
  }

  const nextPower = 2 ** Math.ceil(Math.log2(pairs.length));
  const byes = nextPower - pairs.length;
  const matchups: TournamentMatchup[] = [];
  let cursor = 0;

  for (let index = 0; index < nextPower / 2; index += 1) {
    const pairA = pairs[cursor++];
    const pairB = index < byes ? undefined : pairs[cursor++];
    matchups.push({
      id: `round-1-${index + 1}`,
      round: 1,
      label: `Jogo ${index + 1}`,
      pairAId: pairA?.id,
      pairBId: pairB?.id,
      winnerPairId: pairB ? undefined : pairA?.id,
      status: pairB ? "pending" : "bye",
    });
  }

  const totalRounds = Math.log2(nextPower);
  for (let round = 2; round <= totalRounds; round += 1) {
    const games = nextPower / 2 ** round;
    for (let index = 0; index < games; index += 1) {
      matchups.push({
        id: `round-${round}-${index + 1}`,
        round,
        label: round === totalRounds ? "Final" : `Jogo ${index + 1}`,
        status: "pending",
      });
    }
  }

  wireBracketLinks(matchups, totalRounds);
  return matchups;
}

/** Liga cada matchup ao matchup/slot da rodada seguinte que recebera seu vencedor, e marca as semifinais para alimentar o 3o lugar. */
function wireBracketLinks(matchups: TournamentMatchup[], totalRounds: number) {
  const byRound = new Map<number, TournamentMatchup[]>();
  matchups.forEach((matchup) => {
    byRound.set(matchup.round, [...(byRound.get(matchup.round) ?? []), matchup]);
  });

  for (let round = 1; round < totalRounds; round += 1) {
    const current = byRound.get(round) ?? [];
    const next = byRound.get(round + 1) ?? [];
    current.forEach((matchup, index) => {
      const nextMatchup = next[Math.floor(index / 2)];
      if (!nextMatchup) return;
      matchup.nextMatchupId = nextMatchup.id;
      matchup.nextSlot = index % 2 === 0 ? "pairAId" : "pairBId";
      if (round === totalRounds - 1) {
        matchup.thirdPlaceSlot = index % 2 === 0 ? "pairAId" : "pairBId";
      }
    });
  }
}

export function createThirdPlaceMatchup(): TournamentMatchup {
  return {
    id: "third-place",
    round: 99,
    label: "Disputa de 3o lugar",
    status: "pending",
  };
}

/**
 * Propaga o resultado de um matchup (vencedor para a proxima rodada, perdedor de
 * semifinal para o 3o lugar) e atualiza status/campeao do torneio quando aplicavel.
 * Usada tanto para byes resolvidos na criacao quanto para partidas reais finalizadas.
 */
export function advanceTournament(tournament: Tournament, finishedMatchupId: string): Tournament {
  const matchups = tournament.matchups.map((item) => ({ ...item }));
  const matchup = matchups.find((item) => item.id === finishedMatchupId);
  if (!matchup || !matchup.winnerPairId) return tournament;

  const loserPairId = matchup.pairAId === matchup.winnerPairId ? matchup.pairBId : matchup.pairAId;
  const thirdPlaceMatchup = tournament.thirdPlaceMatchup
    ? { ...tournament.thirdPlaceMatchup }
    : undefined;
  let championPairId = tournament.championPairId;

  if (matchup.nextMatchupId) {
    const nextMatchup = matchups.find((item) => item.id === matchup.nextMatchupId);
    if (nextMatchup && matchup.nextSlot) {
      nextMatchup[matchup.nextSlot] = matchup.winnerPairId;
      if (nextMatchup.pairAId && nextMatchup.pairBId) nextMatchup.status = "pending";
    }
  } else {
    championPairId = matchup.winnerPairId;
  }

  if (matchup.thirdPlaceSlot && thirdPlaceMatchup && loserPairId) {
    thirdPlaceMatchup[matchup.thirdPlaceSlot] = loserPairId;
    if (thirdPlaceMatchup.pairAId && thirdPlaceMatchup.pairBId)
      thirdPlaceMatchup.status = "pending";
  }

  const status = championPairId ? "finished" : tournament.status;
  return { ...tournament, matchups, thirdPlaceMatchup, championPairId, status };
}

/** Aplica advanceTournament em todos os matchups ja decididos por bye no momento da criacao. */
export function resolveInitialByes(tournament: Tournament): Tournament {
  return tournament.matchups
    .filter((matchup) => matchup.status === "bye")
    .reduce((current, matchup) => advanceTournament(current, matchup.id), tournament);
}

/** Le o placar de uma partida finalizada e devolve o torneio com o matchup correspondente avancado. */
export function applyMatchResultToTournament(tournament: Tournament, match: Match): Tournament {
  const matchup =
    tournament.matchups.find((item) => item.matchId === match.id) ??
    (tournament.thirdPlaceMatchup?.matchId === match.id ? tournament.thirdPlaceMatchup : undefined);
  if (!matchup || !match.winnerPairId) return tournament;

  const isThirdPlace = matchup.id === tournament.thirdPlaceMatchup?.id;
  const updatedMatchup: TournamentMatchup = {
    ...matchup,
    status: "finished",
    winnerPairId: match.winnerPairId,
  };

  if (isThirdPlace) {
    return { ...tournament, thirdPlaceMatchup: updatedMatchup };
  }

  const matchups = tournament.matchups.map((item) =>
    item.id === updatedMatchup.id ? updatedMatchup : item,
  );
  return advanceTournament({ ...tournament, matchups }, updatedMatchup.id);
}

export function isMatchupReadyToStart(matchup: TournamentMatchup): boolean {
  return (
    matchup.status === "pending" &&
    Boolean(matchup.pairAId) &&
    Boolean(matchup.pairBId) &&
    !matchup.matchId
  );
}

export function getMatchupScoreLabel(match: Match | undefined): string | undefined {
  if (!match) return undefined;
  const [scoreA, scoreB] = getScore(match);
  return `${scoreA} - ${scoreB}`;
}
