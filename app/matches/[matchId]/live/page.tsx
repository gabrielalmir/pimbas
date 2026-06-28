"use client";

import { Crown, Pause, RotateCcw, ShieldAlert, Timer, Undo2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Eyebrow, KindBadge, Page } from "@/components/PimbasLayout";
import { ScoreBadge } from "@/components/ScoreBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Match } from "@/lib/domain";
import { getScore, hasMatchTimeExpired, positionLabel } from "@/lib/domain";
import { playerName, shortDate } from "@/lib/format";
import { useFinishMatch, useMatch, usePlayers, useRegisterGoal, useUndoGoal } from "@/lib/hooks";
import { playMatchSound, unlockMatchSounds } from "@/lib/matchSounds";

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function LiveMatchPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;

  const [now, setNow] = useState(() => Date.now());
  const [isPaused, setIsPaused] = useState(false);
  const [ownGoalMode, setOwnGoalMode] = useState(false);
  const [pausedAt, setPausedAt] = useState<number>();
  const [pausedDurationMs, setPausedDurationMs] = useState(0);
  const matchQuery = useMatch(matchId);
  const playersQuery = usePlayers();
  const registerGoal = useRegisterGoal(matchId);
  const finishMatch = useFinishMatch(matchId);
  const undoGoal = useUndoGoal(matchId);
  const match = matchQuery.data;
  const players = playersQuery.data ?? [];
  const previousGoalCountRef = useRef<number | undefined>(undefined);
  const previousStatusRef = useRef<Match["status"] | undefined>(undefined);
  const startSoundMatchIdRef = useRef<string | undefined>(undefined);
  const lastGoalTapRef = useRef<{ playerId: string; tappedAt: number } | undefined>(undefined);
  const autoFinishMatchIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (match?.status === "finished" || isPaused) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isPaused, match?.status]);

  useEffect(() => {
    if (!match) return;

    const isNewMatch = startSoundMatchIdRef.current !== match.id;
    if (isNewMatch) {
      previousGoalCountRef.current = match.goals.length;
      previousStatusRef.current = match.status;
    }

    if (match.status !== "finished" && isNewMatch) {
      playMatchSound("start");
      startSoundMatchIdRef.current = match.id;
    }
  }, [match]);

  useEffect(() => {
    if (!match) return;

    const previousGoalCount = previousGoalCountRef.current;
    if (previousGoalCount !== undefined && match.goals.length > previousGoalCount) {
      playMatchSound("goal");
    }
    previousGoalCountRef.current = match.goals.length;
  }, [match]);

  useEffect(() => {
    if (!match) return;

    if (
      previousStatusRef.current &&
      previousStatusRef.current !== "finished" &&
      match.status === "finished"
    ) {
      playMatchSound("finish");
    }
    previousStatusRef.current = match.status;
  }, [match]);

  useEffect(() => {
    if (!match || match.status === "finished" || isPaused || finishMatch.isPending) return;
    if (
      !hasMatchTimeExpired(
        {
          ...match,
          startedAt: new Date(new Date(match.startedAt).getTime() + pausedDurationMs).toISOString(),
        },
        new Date(now),
      )
    )
      return;

    const [currentScoreA, currentScoreB] = getScore(match);
    const shouldContinueToGoldenGoal = currentScoreA === currentScoreB && match.settings.goldenGoal;
    if (shouldContinueToGoldenGoal) return;
    if (autoFinishMatchIdRef.current === match.id) return;

    unlockMatchSounds();
    autoFinishMatchIdRef.current = match.id;
    finishMatch.mutate();
  }, [finishMatch, isPaused, match, now, pausedDurationMs]);

  if (!match || playersQuery.isLoading) return <LoadingState />;

  const [scoreA, scoreB] = getScore(match);
  const clockNow = isPaused && pausedAt ? pausedAt : now;
  const isFinished = match.status === "finished";
  const isGoldenGoal = match.status === "golden_goal";
  const elapsedSeconds = Math.max(
    0,
    Math.floor((clockNow - new Date(match.startedAt).getTime() - pausedDurationMs) / 1000),
  );
  const limitSeconds = match.settings.timeLimitMinutes * 60;
  const remainingSeconds = Math.max(0, limitSeconds - elapsedSeconds);
  const isTimeExpired = remainingSeconds === 0;
  const shouldBlockGoalsByTime = isTimeExpired && !isGoldenGoal;
  const timeProgress = Math.min(100, (elapsedSeconds / limitSeconds) * 100);
  const isTied = scoreA === scoreB;
  const winnerName =
    match.winnerPairId === match.pairA.id
      ? match.pairA.name
      : match.winnerPairId === match.pairB.id
        ? match.pairB.name
        : undefined;
  const leaderName =
    scoreA > scoreB ? match.pairA.name : scoreB > scoreA ? match.pairB.name : undefined;
  const matchStatus = isFinished
    ? winnerName
      ? `${winnerName} venceu`
      : "Partida encerrada"
    : isGoldenGoal || (remainingSeconds === 0 && isTied && match.settings.goldenGoal)
      ? "Gol de ouro: próximo gol decide"
      : leaderName
        ? `${leaderName} na frente`
        : "Empate no placar";
  const recentGoals = match.goals.slice(-5).reverse();
  const undoableGoalIds = new Set(
    match.goals
      .filter((goal) => now - new Date(goal.scoredAt).getTime() <= 10_000)
      .map((goal) => goal.id),
  );
  const scorerTally = match.goals.reduce<Record<string, number>>((tally, goal) => {
    tally[goal.playerId] = (tally[goal.playerId] ?? 0) + 1;
    return tally;
  }, {});
  const topScorerId = Object.entries(scorerTally).sort((a, b) => b[1] - a[1])[0]?.[0];
  const playerInitialsById = Object.fromEntries(
    players.map((player) => [player.id, player.initials.toLowerCase()]),
  );

  const pauseOrResume = () => {
    const tappedAt = Date.now();
    if (isPaused) {
      setPausedDurationMs((duration) => duration + (tappedAt - (pausedAt ?? tappedAt)));
      setPausedAt(undefined);
      setNow(tappedAt);
      setIsPaused(false);
      return;
    }
    setPausedAt(tappedAt);
    setNow(tappedAt);
    setIsPaused(true);
  };

  const resetClock = () => {
    const tappedAt = Date.now();
    setPausedDurationMs(Math.max(0, tappedAt - new Date(match.startedAt).getTime()));
    setPausedAt(undefined);
    setNow(tappedAt);
    setIsPaused(false);
  };

  const registerPlayerGoal = (playerId: string) => {
    unlockMatchSounds();
    const tappedAt = Date.now();
    const lastTap = lastGoalTapRef.current;
    if (lastTap?.playerId === playerId && tappedAt - lastTap.tappedAt < 2_000) return;
    lastGoalTapRef.current = { playerId, tappedAt };
    if (shouldBlockGoalsByTime) return;
    registerGoal.mutate({ playerId, ownGoal: ownGoalMode });
    setOwnGoalMode(false);
  };

  return (
    <Page className="bg-primary text-primary-foreground [background-image:var(--field-rods)] 2xl:max-w-[1680px]">
      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.75fr)_420px] 2xl:grid-cols-[minmax(0,1.9fr)_460px] xl:items-start">
        <main className="min-w-0">
          <header className="mb-3.5 rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <KindBadge kind={match.kind} />
              <p className="m-0 font-black text-primary-foreground" data-testid="live-match-status">
                {matchStatus}
              </p>
            </div>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 max-[520px]:grid-cols-1">
              <TeamSummary name={match.pairA.name} side="lado verde" score={scoreA} align="left" />
              <ScoreBadge match={match} />
              <TeamSummary
                name={match.pairB.name}
                side="lado laranja"
                score={scoreB}
                align="right"
              />
            </div>
          </header>

          <div className="mb-3.5">
            <Button
              type="button"
              variant={ownGoalMode ? "destructive" : "secondary"}
              className={
                ownGoalMode
                  ? "h-auto min-h-10 w-full py-2 text-sm font-black"
                  : "h-auto min-h-10 w-full py-2 bg-[var(--pmb-paper)] text-sm text-primary hover:bg-[var(--pmb-paper)]/90"
              }
              disabled={isFinished || isPaused || shouldBlockGoalsByTime}
              onClick={() => setOwnGoalMode((prev) => !prev)}
              aria-pressed={ownGoalMode}
            >
              <ShieldAlert data-icon="inline-start" />
              {ownGoalMode ? "Gol contra ativo - toque no responsável" : "Registrar gol contra"}
            </Button>
          </div>

          <div className="grid gap-[18px] md:grid-cols-2 md:items-stretch">
            {[match.pairA, match.pairB].map((pair, pairIndex) => (
              <article
                key={pair.id}
                className={
                  pairIndex === 0
                    ? "min-h-60 rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:32px_32px] p-4 md:min-h-[360px]"
                    : "min-h-60 rounded-xl border border-[color-mix(in_oklch,var(--pmb-clay),transparent_50%)] bg-[rgba(207,86,45,0.12)] bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:32px_32px] p-4 md:min-h-[360px]"
                }
              >
                <div className="mb-3.5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg uppercase leading-none">{pair.name}</h2>
                    <small className="text-primary-foreground/70">
                      {pairIndex === 0 ? "lado verde" : "lado laranja"}
                    </small>
                  </div>
                  <strong className="font-display text-5xl leading-none text-primary-foreground">
                    {pairIndex === 0 ? scoreA : scoreB}
                  </strong>
                </div>
                <div className="grid gap-3">
                  {pair.players.map((entry) => (
                    <Button
                      key={entry.playerId}
                      variant="secondary"
                      className="grid h-auto min-h-[62px] grid-cols-[46px_1fr_52px] items-center gap-2.5 whitespace-normal bg-[var(--pmb-paper)] text-left text-foreground hover:bg-[var(--pmb-paper)]/90"
                      disabled={
                        isFinished ||
                        isPaused ||
                        shouldBlockGoalsByTime ||
                        registerGoal.isPending ||
                        undoGoal.isPending
                      }
                      data-testid={`goal-button-${playerInitialsById[entry.playerId] ?? entry.playerId}`}
                      onClick={() => registerPlayerGoal(entry.playerId)}
                      type="button"
                    >
                      <span
                        className={
                          pairIndex === 0
                            ? "inline-grid min-h-7 place-items-center rounded-md bg-primary px-2 text-xs font-black text-primary-foreground"
                            : "inline-grid min-h-7 place-items-center rounded-md bg-[var(--pmb-clay)] px-2 text-xs font-black text-primary-foreground"
                        }
                      >
                        {positionLabel(entry.position).slice(0, 3).toUpperCase()}
                      </span>
                      <strong className="grid min-w-0 gap-0.5 [overflow-wrap:anywhere]">
                        {playerName(players, entry.playerId)}
                        <small className="text-xs font-black text-muted-foreground">
                          #
                          {players.find((player) => player.id === entry.playerId)?.shirtNumber ??
                            "--"}
                        </small>
                      </strong>
                      <em
                        className="font-black not-italic uppercase text-primary"
                        title={ownGoalMode ? "Gol contra" : "Gol"}
                      >
                        {ownGoalMode ? "GC" : "Gol"}
                      </em>
                    </Button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </main>

        <aside className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-4 shadow-[0_14px_0_rgba(9,41,31,0.22)] lg:sticky lg:top-6">
          <Eyebrow>Controle da partida</Eyebrow>
          <div className="grid gap-3">
            <div className="rounded-lg bg-[rgba(9,41,31,0.42)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <strong className="font-display text-5xl leading-none">
                    {formatClock(remainingSeconds)}
                  </strong>
                  <p className="mt-1 text-sm text-primary-foreground/70">
                    {isFinished
                      ? "encerrada"
                      : remainingSeconds === 0
                        ? "tempo esgotado"
                        : "restantes"}
                  </p>
                </div>
                <Timer className="size-8 text-[var(--pmb-gold)]" />
              </div>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-primary-foreground/15"
                role="progressbar"
                aria-label="Tempo usado da partida"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(timeProgress)}
              >
                <span
                  className="block h-full max-w-full rounded-full bg-[linear-gradient(90deg,var(--pmb-gold),var(--pmb-live))]"
                  style={{ width: `${timeProgress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="h-11 bg-[var(--pmb-paper)] text-primary hover:bg-[var(--pmb-paper)]/90"
                aria-pressed={isPaused}
                type="button"
                disabled={isFinished}
                onClick={pauseOrResume}
              >
                <Pause data-icon="inline-start" />
                {isPaused ? "Retomar" : "Pausar"}
              </Button>
              <Button
                variant="secondary"
                className="h-11 bg-[var(--pmb-paper)] text-primary hover:bg-[var(--pmb-paper)]/90"
                type="button"
                disabled={isFinished}
                onClick={resetClock}
              >
                <RotateCcw data-icon="inline-start" />
                Reiniciar
              </Button>
            </div>

            <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-3">
              <Eyebrow>Regra</Eyebrow>
              <strong className="text-primary-foreground">
                {match.settings.goalLimit} gols ou {match.settings.timeLimitMinutes} min
              </strong>
              <p className="mt-1 text-sm text-primary-foreground/70">
                {match.settings.goldenGoal
                  ? "Empate no tempo vai para gol de ouro."
                  : "Sem gol de ouro configurado."}
              </p>
            </div>

            <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-3">
              <Eyebrow>Últimos gols</Eyebrow>
              {recentGoals.length ? (
                <div className="grid gap-2">
                  {recentGoals.map((goal) => (
                    <div
                      key={goal.id}
                      data-testid={`recent-goal-${playerInitialsById[goal.playerId] ?? goal.id}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-[var(--pmb-paper)] p-2 text-foreground"
                    >
                      <div className="min-w-0">
                        <strong className="block truncate">
                          {playerName(players, goal.playerId)}
                        </strong>
                        <small
                          className={goal.ownGoal ? "text-destructive/80" : "text-muted-foreground"}
                        >
                          {goal.ownGoal ? "Gol contra" : positionLabel(goal.position)} -{" "}
                          {shortDate(goal.scoredAt)}
                        </small>
                      </div>
                      {undoableGoalIds.has(goal.id) && (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Desfazer gol de ${playerName(players, goal.playerId)}`}
                          disabled={undoGoal.isPending}
                          onClick={() => undoGoal.mutate(goal.id)}
                        >
                          <Undo2 data-icon="inline-start" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-primary-foreground/75">
                  Sem gols ainda. O primeiro toque já abre o placar.
                </p>
              )}
            </div>

            {isFinished && (
              <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-3">
                <Eyebrow>Resumo</Eyebrow>
                <p className="font-display text-2xl uppercase leading-none text-primary-foreground">
                  {match.pairA.name} {scoreA} - {scoreB} {match.pairB.name}
                </p>
                <strong className="mt-2 block text-primary-foreground">
                  {winnerName ? `${winnerName} venceu` : "Empate"}
                </strong>
                {topScorerId && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-primary-foreground/85">
                    <Crown className="size-4 text-[var(--pmb-gold)]" />
                    Artilheiro: {playerName(players, topScorerId)} ({scorerTally[topScorerId]} gols)
                  </p>
                )}
              </div>
            )}

            <div
              aria-live="polite"
              aria-atomic="true"
              className={
                shouldBlockGoalsByTime && !isFinished
                  ? "rounded-lg border border-[var(--pmb-gold)]/40 bg-[var(--pmb-gold)]/10 px-3 py-2.5 text-sm font-semibold text-[var(--pmb-gold)]"
                  : isPaused
                    ? "rounded-lg border border-primary-foreground/20 bg-primary-foreground/8 px-3 py-2.5 text-sm text-primary-foreground/80"
                    : "px-1 text-sm text-primary-foreground/60"
              }
            >
              {isFinished
                ? "Partida encerrada. Resultado registrado no histórico do grupo."
                : isPaused
                  ? "Partida pausada - retome o cronômetro para registrar gols."
                  : shouldBlockGoalsByTime
                    ? "Tempo encerrado. Toque em Encerrar para salvar o resultado."
                    : "Toque no jogador que marcou. Desfaça em até 10 s pelo ícone ao lado."}
            </div>

            {isFinished ? (
              <Link
                href={`/groups/${match.groupId}`}
                className={buttonVariants({
                  variant: "secondary",
                  className:
                    "h-12 w-full bg-[var(--pmb-paper)] text-primary hover:bg-[var(--pmb-paper)]/90",
                })}
              >
                Voltar para o grupo
              </Link>
            ) : (
              <Button
                variant="destructive"
                className="h-12 w-full bg-[color-mix(in_oklch,var(--destructive),black_12%)] text-primary-foreground"
                data-testid="finish-match"
                disabled={finishMatch.isPending}
                onClick={() => {
                  unlockMatchSounds();
                  finishMatch.mutate();
                }}
              >
                {isTied && match.settings.goldenGoal ? "Ativar gol de ouro" : "Encerrar"}
              </Button>
            )}
          </div>
        </aside>
      </div>
    </Page>
  );
}

function TeamSummary({
  name,
  side,
  score,
  align,
}: {
  name: string;
  side: string;
  score: number;
  align: "left" | "right";
}) {
  return (
    <div
      className={
        align === "right"
          ? "grid min-w-0 justify-items-end gap-1 text-right max-[520px]:justify-items-start max-[520px]:text-left"
          : "grid min-w-0 gap-1"
      }
    >
      <strong className="font-display text-2xl uppercase leading-none">{name}</strong>
      <small className="text-primary-foreground/70">{side}</small>
      <span className="font-display text-5xl leading-none text-[var(--pmb-gold)]">{score}</span>
    </div>
  );
}
