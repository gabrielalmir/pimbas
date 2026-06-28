"use client";

import { MoreVertical, Swords, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LoadingState } from "@/components/LoadingState";
import {
  Eyebrow,
  LiveBadge,
  Page,
  PageHeader,
  PimbasAvatar,
  SectionCard,
  SurfaceCard,
} from "@/components/PimbasLayout";
import { ScoreBadge } from "@/components/ScoreBadge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Match, RankingEntry } from "@/lib/domain";
import { pairLine, playerName, shortDate } from "@/lib/format";
import {
  useCurrentPlayerId,
  useGroup,
  useLiveMatch,
  useMatches,
  usePlayers,
  useRanking,
} from "@/lib/hooks";

export default function GroupHome() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId || "group-trampo";

  const groupQuery = useGroup(groupId);
  const playersQuery = usePlayers(groupId);
  const rankingQuery = useRanking(groupId);
  const currentPlayerIdQuery = useCurrentPlayerId();
  const liveMatchQuery = useLiveMatch(groupId);
  const matchesQuery = useMatches(groupId);

  if (!groupQuery.data || playersQuery.isLoading) return <LoadingState />;

  const group = groupQuery.data;
  const players = playersQuery.data ?? [];
  const liveMatch = liveMatchQuery.data;
  const finishedMatches = (matchesQuery.data ?? [])
    .filter((match) => match.status === "finished")
    .slice(0, 4);
  const topRanking = (rankingQuery.data ?? []).slice(0, 3);
  const currentPlayerId = currentPlayerIdQuery.data ?? "player-zt";
  const currentRole =
    currentPlayerId && group.adminPlayerIds.includes(currentPlayerId) ? "admin" : "membro";

  return (
    <Page>
      <PageHeader hero>
        <Link href="/groups" aria-label="Trocar de grupo">
          <PimbasAvatar initials="P" src={group.logoUrl} alt={`Logo ${group.name}`} />
        </Link>
        <div className="min-w-0">
          <Eyebrow>Liga de pimbolim</Eyebrow>
          <h1 className="font-display text-4xl uppercase leading-none max-[520px]:text-3xl">
            {group.name}
          </h1>
          <p className="mt-1 text-sm text-primary-foreground/80">
            {group.memberIds.length} membros - você é {currentRole}
          </p>
        </div>
        <Link
          href={`/groups/${groupId}/settings`}
          className={buttonVariants({
            variant: "ghost",
            size: "icon-lg",
            className:
              "ml-auto bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15",
          })}
          aria-label="Abrir configurações do grupo"
        >
          <MoreVertical data-icon="inline-start" />
        </Link>
      </PageHeader>

      {liveMatch ? (
        <article className="mb-3.5 rounded-lg bg-primary p-4 text-primary-foreground shadow-[0_14px_0_rgba(23,73,56,0.1)] [background-image:var(--field-rods)]">
          <div className="flex items-center justify-between gap-3">
            <LiveBadge />
            <small className="text-primary-foreground/80">
              até {liveMatch.settings.goalLimit} gols
            </small>
          </div>
          <div className="my-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 max-[520px]:grid-cols-1">
            <div className="grid min-w-0 gap-1">
              <strong>{liveMatch.pairA.name}</strong>
              <small className="text-primary-foreground/80">
                {pairLine(liveMatch.pairA, players)}
              </small>
            </div>
            <ScoreBadge match={liveMatch} />
            <div className="grid min-w-0 gap-1 text-right max-[520px]:text-left">
              <strong>{liveMatch.pairB.name}</strong>
              <small className="text-primary-foreground/80">
                {pairLine(liveMatch.pairB, players)}
              </small>
            </div>
          </div>
          {liveMatch.goals.length > 0 && (
            <p className="mb-3 text-sm text-primary-foreground/80">
              Último gol:{" "}
              <strong className="text-primary-foreground">
                {playerName(players, liveMatch.goals[liveMatch.goals.length - 1].playerId)}
              </strong>
            </p>
          )}
          <Link
            href={`/matches/${liveMatch.id}/live`}
            className={buttonVariants({
              variant: "secondary",
              className:
                "h-12 w-full bg-[var(--pmb-paper)] text-primary hover:bg-[var(--pmb-paper)]/90",
            })}
          >
            Acompanhar placar
          </Link>
        </article>
      ) : (
        <SurfaceCard className="mb-3.5">Nenhuma partida em andamento agora.</SurfaceCard>
      )}

      <div className="grid max-w-[820px] grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        <Link href={`/groups/${groupId}/friendly/new`} className="block">
          <Card className="rounded-lg border-foreground/10 bg-card shadow-[0_10px_0_rgba(23,73,56,0.08)] transition-transform hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--pmb-felt),white_84%)] text-[var(--pmb-felt)]">
                <Swords className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <strong className="block font-display text-base uppercase leading-none">
                  Amistoso
                </strong>
                <small className="text-muted-foreground">duplas livres</small>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/groups/${groupId}/tournaments`} className="block">
          <Card className="rounded-lg border-foreground/10 bg-card shadow-[0_10px_0_rgba(198,79,49,0.08)] transition-transform hover:-translate-y-0.5">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--pmb-clay),white_84%)] text-[var(--pmb-clay)]">
                <Trophy className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <strong className="block font-display text-base uppercase leading-none">
                  Torneio
                </strong>
                <small className="text-muted-foreground">mata-mata</small>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <SectionCard
        title="Ranking"
        action={
          <Link href={`/groups/${groupId}/ranking`} className="text-sm font-bold text-primary">
            Ver completo
          </Link>
        }
      >
        {topRanking.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem partidas finalizadas.</p>
        ) : (
          <div className="grid gap-2">
            {topRanking.map((entry: RankingEntry) => (
              <div
                key={entry.playerId}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted p-2.5"
              >
                <span>{playerName(players, entry.playerId)}</span>
                <em className="font-black not-italic text-primary">{entry.points}</em>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Histórico recente"
        action={
          <Link href={`/groups/${groupId}/history`} className="text-sm font-bold text-primary">
            Ver tudo
          </Link>
        }
      >
        {finishedMatches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem partidas recentes.</p>
        ) : (
          <div className="grid gap-2">
            {finishedMatches.map((match: Match) => (
              <div
                key={match.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted p-2.5 text-sm max-[520px]:grid"
              >
                <span>
                  {match.kind === "friendly" ? "Amistoso" : "Torneio"} -{" "}
                  {shortDate(match.startedAt)}
                </span>
                <ScoreBadge match={match} />
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </Page>
  );
}
