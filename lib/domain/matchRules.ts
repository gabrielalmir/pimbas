import type { Goal, Match, MatchSettings, PairPlayer, PlayerPosition, TeamPair } from "./types";

export function createPair(
  id: string,
  name: string,
  goalkeeperId: string,
  attackerId: string,
): TeamPair {
  if (goalkeeperId === attackerId) {
    throw new Error("A dupla precisa ter dois jogadores diferentes.");
  }

  return {
    id,
    name,
    players: [
      { playerId: goalkeeperId, position: "goalkeeper" },
      { playerId: attackerId, position: "attacker" },
    ],
  };
}

export function getPairScore(match: Match, pairId: string): number {
  return match.goals.filter((goal) => goal.pairId === pairId).length;
}

export function getScore(match: Match): [number, number] {
  return [getPairScore(match, match.pairA.id), getPairScore(match, match.pairB.id)];
}

export function getPlayerInMatch(match: Match, playerId: string): PairPlayer | undefined {
  return [...match.pairA.players, ...match.pairB.players].find(
    (player) => player.playerId === playerId,
  );
}

export function getPlayerPairId(match: Match, playerId: string): string | undefined {
  if (match.pairA.players.some((player) => player.playerId === playerId)) return match.pairA.id;
  if (match.pairB.players.some((player) => player.playerId === playerId)) return match.pairB.id;
  return undefined;
}

export function registerGoal(
  match: Match,
  playerId: string,
  now = new Date(),
  ownGoal = false,
): Match {
  if (match.status === "finished") {
    throw new Error("Partidas encerradas nao aceitam novos gols.");
  }

  if (hasMatchTimeExpired(match, now) && match.status !== "golden_goal") {
    throw new Error("Tempo esgotado: nao e permitido marcar gols apos o fim da partida.");
  }

  const player = getPlayerInMatch(match, playerId);
  const scorerPairId = getPlayerPairId(match, playerId);

  if (!player || !scorerPairId) {
    throw new Error("Gol precisa ser marcado por jogador da partida.");
  }

  const pairId = ownGoal
    ? scorerPairId === match.pairA.id
      ? match.pairB.id
      : match.pairA.id
    : scorerPairId;

  const goal: Goal = {
    id: `goal-${match.id}-${match.goals.length + 1}`,
    matchId: match.id,
    pairId,
    playerId,
    position: player.position,
    ownGoal,
    scoredAt: now.toISOString(),
  };

  return applyMatchEndRules({ ...match, goals: [...match.goals, goal] });
}

export function undoGoal(match: Match, goalId: string, now = new Date()): Match {
  const goal = match.goals.find((item) => item.id === goalId);
  if (!goal) {
    throw new Error("Gol nao encontrado na partida.");
  }

  const elapsedSinceGoalMs = now.getTime() - new Date(goal.scoredAt).getTime();
  if (elapsedSinceGoalMs > 10_000) {
    throw new Error("Gol so pode ser desfeito nos primeiros 10 segundos.");
  }

  const goals = match.goals.filter((item) => item.id !== goalId);
  const reopened: Match = {
    ...match,
    goals,
    status: match.status === "finished" ? "live" : match.status,
    winnerPairId: match.status === "finished" ? undefined : match.winnerPairId,
    finishedAt: match.status === "finished" ? undefined : match.finishedAt,
  };

  return shouldBeGoldenGoal(reopened, now) ? { ...reopened, status: "golden_goal" } : reopened;
}

export function hasMatchTimeExpired(match: Match, now = new Date()): boolean {
  const elapsedMs = now.getTime() - new Date(match.startedAt).getTime();
  return elapsedMs >= match.settings.timeLimitMinutes * 60_000;
}

function shouldBeGoldenGoal(match: Match, now: Date): boolean {
  if (!match.settings.goldenGoal || match.status === "finished") return false;
  const [scoreA, scoreB] = getScore(match);
  return scoreA === scoreB && hasMatchTimeExpired(match, now);
}

export function applyMatchEndRules(match: Match): Match {
  const [scoreA, scoreB] = getScore(match);
  const winnerPairId =
    scoreA > scoreB ? match.pairA.id : scoreB > scoreA ? match.pairB.id : undefined;

  if (winnerPairId && Math.max(scoreA, scoreB) >= match.settings.goalLimit) {
    return finishMatch(match, winnerPairId);
  }

  if (match.status === "golden_goal" && winnerPairId) {
    return finishMatch(match, winnerPairId);
  }

  return match;
}

export function enterGoldenGoalIfTied(match: Match): Match {
  const [scoreA, scoreB] = getScore(match);
  if (!match.settings.goldenGoal || scoreA !== scoreB || match.status === "finished") {
    return match;
  }

  return { ...match, status: "golden_goal" };
}

export function finishMatch(match: Match, winnerPairId?: string, now = new Date()): Match {
  const resolvedWinner = winnerPairId ?? resolveWinner(match);
  return {
    ...match,
    status: "finished",
    winnerPairId: resolvedWinner,
    finishedAt: now.toISOString(),
  };
}

export function resolveWinner(match: Match): string | undefined {
  const [scoreA, scoreB] = getScore(match);
  if (scoreA === scoreB) return undefined;
  return scoreA > scoreB ? match.pairA.id : match.pairB.id;
}

export function validateMatchSettings(settings: MatchSettings): string[] {
  const errors: string[] = [];
  if (settings.goalLimit < 1) errors.push("O limite de gols deve ser maior que zero.");
  if (settings.timeLimitMinutes < 1) errors.push("O limite de tempo deve ser maior que zero.");
  return errors;
}

export function positionLabel(position: PlayerPosition): string {
  return position === "goalkeeper" ? "Goleiro" : "Atacante";
}
