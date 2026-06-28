"use client";

import { Crown, Medal, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment } from "react";
import { LoadingState } from "@/components/LoadingState";
import {
  Eyebrow,
  LiveBadge,
  Page,
  PageHeader,
  PimbasAvatar,
  SectionCard,
} from "@/components/PimbasLayout";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { TournamentMatchup } from "@/lib/domain";
import { isMatchupReadyToStart } from "@/lib/domain";
import { pairLine } from "@/lib/format";
import { usePlayers, useStartTournamentMatch, useTournament } from "@/lib/hooks";
import { cn } from "@/lib/utils";

/** Altura fixa de cada "linha" do bracket (a rodada com mais jogos define a altura total das colunas). */
const SLOT_HEIGHT = 152;
/** Altura do cabeçalho de cada coluna de rodada — usada para alinhar os conectores ao grid abaixo dele. */
const HEADER_HEIGHT = 40;

function isDecided(matchup: TournamentMatchup) {
  return matchup.status === "finished" || matchup.status === "bye";
}

function RoundHeading({ label, isFinal }: { label: string; isFinal: boolean }) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-1.5 border-b-2 px-0.5",
        isFinal ? "border-[var(--pmb-gold)]" : "border-foreground/10",
      )}
    >
      {isFinal && <Crown className="size-4 shrink-0 text-[var(--pmb-gold)]" />}
      <h2
        className={cn(
          "truncate font-display text-sm uppercase leading-none sm:text-base",
          isFinal ? "text-[var(--pmb-clay)]" : "text-foreground",
        )}
      >
        {label}
      </h2>
    </div>
  );
}

/** Conector entre duas partidas de uma rodada e o jogo da rodada seguinte que recebe o vencedor. */
function BracketJoin({
  topDecided,
  bottomDecided,
}: {
  topDecided: boolean;
  bottomDecided: boolean;
}) {
  const decidedStroke = "var(--pmb-gold)";
  const pendingStroke = "var(--border)";
  const bothDecided = topDecided && bottomDecided;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="block h-full w-full"
      aria-hidden="true"
    >
      <path
        d="M0,25 H50"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        stroke={topDecided ? decidedStroke : pendingStroke}
        strokeWidth={topDecided ? 2.5 : 1.5}
      />
      <path
        d="M0,75 H50"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        stroke={bottomDecided ? decidedStroke : pendingStroke}
        strokeWidth={bottomDecided ? 2.5 : 1.5}
      />
      <path
        d="M50,25 V75 M50,50 H100"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        stroke={bothDecided ? decidedStroke : pendingStroke}
        strokeWidth={bothDecided ? 2.5 : 1.5}
      />
    </svg>
  );
}

/** Conector final, da decisão do título até o troféu. */
function BracketTail({ decided }: { decided: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="block h-full w-full"
      aria-hidden="true"
    >
      <path
        d="M0,50 H100"
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        stroke={decided ? "var(--pmb-gold)" : "var(--border)"}
        strokeWidth={decided ? 2.5 : 1.5}
      />
    </svg>
  );
}

function CupNode({ decided }: { decided: boolean }) {
  return (
    <div
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full border-2",
        decided
          ? "border-[var(--pmb-gold)] bg-[color-mix(in_oklch,var(--pmb-gold),white_78%)] text-[var(--pmb-clay)] shadow-[0_6px_14px_rgba(215,162,58,0.35)]"
          : "border-dashed border-border bg-muted text-muted-foreground/50",
      )}
    >
      <Trophy className="size-5" />
    </div>
  );
}

export default function TournamentBracketPage() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params.tournamentId;
  const router = useRouter();

  const tournamentQuery = useTournament(tournamentId);
  const playersQuery = usePlayers();
  const startMatch = useStartTournamentMatch(tournamentId);
  const tournament = tournamentQuery.data;
  const players = playersQuery.data ?? [];

  if (!tournament || playersQuery.isLoading) return <LoadingState />;

  const rounds = [...new Set(tournament.matchups.map((matchup) => matchup.round))].sort(
    (a, b) => a - b,
  );
  const matchesByRound = rounds.map((round) =>
    tournament.matchups.filter((matchup) => matchup.round === round),
  );
  const trackHeight = Math.max(...matchesByRound.map((list) => list.length)) * SLOT_HEIGHT;
  const champion = tournament.pairs.find((pair) => pair.id === tournament.championPairId);

  const onStart = async (matchupId: string) => {
    const match = await startMatch.mutateAsync(matchupId);
    router.push(`/matches/${match.id}/live`);
  };

  const MatchupAction = ({ matchup }: { matchup: TournamentMatchup }) => {
    if (matchup.matchId && matchup.status !== "finished") {
      return (
        <Link
          href={`/matches/${matchup.matchId}/live`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Continuar partida
        </Link>
      );
    }
    if (isMatchupReadyToStart(matchup)) {
      return (
        <Button
          size="sm"
          variant="secondary"
          disabled={startMatch.isPending}
          onClick={() => onStart(matchup.id)}
        >
          Iniciar partida
        </Button>
      );
    }
    return null;
  };

  const hasAction = (matchup: TournamentMatchup) =>
    (Boolean(matchup.matchId) && matchup.status !== "finished") || isMatchupReadyToStart(matchup);

  const PairRow = ({
    pairId,
    isWinner,
    fallback,
  }: {
    pairId?: string;
    isWinner: boolean;
    fallback: string;
  }) => {
    const pair = tournament.pairs.find((item) => item.id === pairId);
    if (!pair) {
      return (
        <div className="flex h-9 items-center text-xs italic text-muted-foreground/70">
          {fallback}
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex h-9 min-w-0 items-center gap-1.5",
          isWinner ? "font-extrabold text-primary" : "text-foreground/90",
        )}
      >
        <div className="flex shrink-0 gap-1">
          {pair.players.map((entry) => {
            const player = players.find((item) => item.id === entry.playerId);
            return (
              <PimbasAvatar
                key={entry.playerId}
                size="sm"
                initials={player?.initials}
                src={player?.avatarUrl}
                alt={player?.displayName}
              />
            );
          })}
        </div>
        <span className="min-w-0 truncate text-sm leading-tight [overflow-wrap:anywhere]">
          {pair.name}
        </span>
        {isWinner && <Crown className="size-3.5 shrink-0 text-[var(--pmb-gold)]" />}
      </div>
    );
  };

  const MatchCard = ({ matchup }: { matchup: TournamentMatchup }) => {
    const decided = isDecided(matchup);
    const isLive = matchup.status === "live";
    const isBye = matchup.status === "bye";
    const action = hasAction(matchup);

    return (
      <article
        className={cn(
          "flex w-full flex-col gap-1 rounded-lg border border-l-[3px] bg-card py-2 pl-3 pr-2.5 shadow-[0_3px_0_rgba(23,73,56,0.06)]",
          isLive &&
            "border-[var(--pmb-clay)]/40 border-l-[var(--pmb-clay)] bg-[color-mix(in_oklch,var(--pmb-clay),white_94%)] ring-1 ring-[var(--pmb-clay)]/25",
          !isLive && decided && "border-[var(--pmb-felt)]/20 border-l-[var(--pmb-felt)]",
          !isLive && !decided && "border-border border-l-[var(--pmb-gold)]",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground/70">
            {matchup.label}
          </span>
          {isLive && <LiveBadge />}
          {isBye && (
            <Badge variant="outline" className="text-[0.6rem] text-muted-foreground">
              Bye
            </Badge>
          )}
        </div>
        <PairRow
          pairId={matchup.pairAId}
          isWinner={Boolean(matchup.winnerPairId) && matchup.winnerPairId === matchup.pairAId}
          fallback="A definir"
        />
        <div className="h-px bg-border/70" />
        <PairRow
          pairId={matchup.pairBId}
          isWinner={Boolean(matchup.winnerPairId) && matchup.winnerPairId === matchup.pairBId}
          fallback={isBye ? "Sem adversário" : "A definir"}
        />
        <div className="flex h-7 items-center justify-end">
          {action ? (
            <MatchupAction matchup={matchup} />
          ) : (
            <span className="text-[0.7rem] text-muted-foreground/70">
              {isBye
                ? "Avanço automático"
                : decided
                  ? "Resultado registrado"
                  : "Aguardando definição"}
            </span>
          )}
        </div>
      </article>
    );
  };

  return (
    <Page>
      <PageHeader dark>
        <Eyebrow>Bracket do torneio</Eyebrow>
        <h1 className="font-display text-3xl uppercase leading-none">{tournament.name}</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Mata-mata simples - regras travadas em {tournament.settings.goalLimit} gols
        </p>
      </PageHeader>

      {champion && (
        <article className="relative mb-4 overflow-hidden rounded-xl border border-[var(--pmb-gold)]/40 bg-[linear-gradient(160deg,color-mix(in_oklch,var(--pmb-gold),white_82%),color-mix(in_oklch,var(--pmb-gold),white_94%)_55%,var(--pmb-paper-soft))] p-6 text-center shadow-[0_18px_36px_rgba(151,108,29,0.18)] sm:p-8">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.55),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative grid justify-items-center gap-2.5">
            <span className="grid size-14 place-items-center rounded-full bg-[var(--pmb-clay)] text-[var(--pmb-paper)] shadow-[0_8px_18px_rgba(198,79,49,0.35)]">
              <Trophy className="size-7" />
            </span>
            <Eyebrow className="text-[var(--pmb-clay)]">Campeão do torneio</Eyebrow>
            <div className="flex items-center gap-2.5">
              {champion.players.map((entry) => {
                const player = players.find((item) => item.id === entry.playerId);
                return (
                  <PimbasAvatar
                    key={entry.playerId}
                    size="lg"
                    initials={player?.initials}
                    src={player?.avatarUrl}
                    alt={player?.displayName}
                  />
                );
              })}
            </div>
            <strong className="font-display text-2xl uppercase leading-none sm:text-3xl">
              {champion.name}
            </strong>
            <small className="text-muted-foreground">{pairLine(champion, players)}</small>
          </div>
        </article>
      )}

      <div className="-mx-4 overflow-x-auto pb-3 md:-mx-7 lg:-mx-10">
        <div className="flex w-max items-start px-4 md:px-7 lg:px-10">
          {rounds.map((round, roundIndex) => {
            const label =
              round === Math.max(...rounds)
                ? "Final"
                : round === 1
                  ? "Primeira rodada"
                  : `Rodada ${round}`;
            const isFinal = roundIndex === rounds.length - 1;
            const currentMatches = matchesByRound[roundIndex];
            const nextMatches = matchesByRound[roundIndex + 1];

            return (
              <Fragment key={round}>
                <div className="flex w-[230px] shrink-0 flex-col">
                  <RoundHeading label={label} isFinal={isFinal} />
                  <div
                    className="grid"
                    style={{
                      height: trackHeight,
                      gridTemplateRows: `repeat(${currentMatches.length}, 1fr)`,
                    }}
                  >
                    {currentMatches.map((matchup) => (
                      <div key={matchup.id} className="flex items-center px-0.5">
                        <MatchCard matchup={matchup} />
                      </div>
                    ))}
                  </div>
                </div>

                {nextMatches ? (
                  <div
                    className="grid w-9 shrink-0 sm:w-12"
                    style={{
                      height: trackHeight,
                      marginTop: HEADER_HEIGHT,
                      gridTemplateRows: `repeat(${nextMatches.length}, 1fr)`,
                    }}
                  >
                    {nextMatches.map((nextMatchup, slotIndex) => {
                      const top = currentMatches[2 * slotIndex];
                      const bottom = currentMatches[2 * slotIndex + 1];
                      return (
                        <BracketJoin
                          key={nextMatchup.id}
                          topDecided={isDecided(top)}
                          bottomDecided={isDecided(bottom)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <>
                    <div
                      className="grid w-9 shrink-0 sm:w-12"
                      style={{ height: trackHeight, marginTop: HEADER_HEIGHT }}
                    >
                      <BracketTail decided={Boolean(champion)} />
                    </div>
                    <div className="flex w-20 shrink-0 flex-col">
                      <div className="flex h-10 items-center justify-center border-b-2 border-[var(--pmb-gold)]">
                        <span className="font-display text-sm uppercase leading-none text-[var(--pmb-clay)] sm:text-base">
                          Título
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-center"
                        style={{ height: trackHeight }}
                      >
                        <CupNode decided={Boolean(champion)} />
                      </div>
                    </div>
                  </>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {tournament.thirdPlaceMatchup && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <Medal className="size-4 text-[var(--pmb-clay)]" />
              Disputa de 3º lugar
            </span>
          }
          className="bg-[color-mix(in_oklch,var(--pmb-gold),white_78%)]"
        >
          <div className="mx-auto max-w-[260px]">
            <MatchCard matchup={tournament.thirdPlaceMatchup} />
          </div>
        </SectionCard>
      )}
    </Page>
  );
}
