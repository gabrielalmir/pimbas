"use client";

import { Crown } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Eyebrow, Page, PageHeader, PimbasAvatar } from "@/components/PimbasLayout";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { percent, playerName } from "@/lib/format";
import { usePairStats, usePlayers, useRanking } from "@/lib/hooks";

export default function RankingPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId || "group-trampo";

  const [tab, setTab] = useState<"players" | "pairs">("players");
  const rankingQuery = useRanking(groupId);
  const pairStatsQuery = usePairStats(groupId);
  const playersQuery = usePlayers(groupId);
  const players = playersQuery.data ?? [];

  if (rankingQuery.isLoading || pairStatsQuery.isLoading || playersQuery.isLoading)
    return <LoadingState />;

  const ranking = rankingQuery.data ?? [];
  const podium = ranking.slice(0, 3);

  return (
    <Page>
      <PageHeader dark>
        <Eyebrow>Ranking do grupo</Eyebrow>
        <h1 className="font-display text-3xl uppercase leading-none">Pimbas do Trampo</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Considera apenas partidas finalizadas deste grupo.
        </p>
        <ToggleGroup
          value={[tab]}
          onValueChange={(value) => value[0] && setTab(value[0] as "players" | "pairs")}
          variant="outline"
          className="mt-4 grid w-full max-w-sm grid-cols-2 rounded-lg bg-primary-foreground/15 p-1"
        >
          <ToggleGroupItem
            value="players"
            className="w-full bg-transparent font-black text-primary-foreground data-[pressed]:bg-background data-[pressed]:text-primary"
          >
            Jogadores
          </ToggleGroupItem>
          <ToggleGroupItem
            value="pairs"
            className="w-full bg-transparent font-black text-primary-foreground data-[pressed]:bg-background data-[pressed]:text-primary"
          >
            Duplas
          </ToggleGroupItem>
        </ToggleGroup>
      </PageHeader>

      {tab === "players" ? (
        <>
          <div className="my-6 grid grid-cols-1 items-end gap-2 min-[520px]:grid-cols-[1fr_1.15fr_1fr]">
            {podium.map((entry) => {
              const player = players.find((item) => item.id === entry.playerId);
              return (
                <Link
                  key={entry.playerId}
                  href={`/players/${entry.playerId}?groupId=${groupId}`}
                  className={
                    entry.position === 1
                      ? "grid min-h-[180px] justify-items-center gap-1.5 rounded-lg bg-[color-mix(in_oklch,var(--pmb-gold),white_48%)] p-3 text-center"
                      : "grid min-h-[150px] justify-items-center gap-1.5 rounded-lg bg-muted p-3 text-center"
                  }
                >
                  {entry.position === 1 && <Crown className="size-5" />}
                  <PimbasAvatar
                    initials={player?.initials}
                    src={player?.avatarUrl}
                    alt={player?.displayName}
                  />
                  <strong>{player?.displayName}</strong>
                  <em className="font-black not-italic text-primary">{entry.points}</em>
                  <small className="text-muted-foreground">{entry.position}o</small>
                </Link>
              );
            })}
          </div>
          <div className="grid gap-2.5">
            {ranking.slice(3).map((entry) => {
              const player = players.find((item) => item.id === entry.playerId);
              const winRate = entry.stats.matches
                ? (entry.stats.wins / entry.stats.matches) * 100
                : 0;
              return (
                <Link
                  key={entry.playerId}
                  href={`/players/${entry.playerId}?groupId=${groupId}`}
                  className="flex min-w-0 items-center gap-2.5 rounded-lg border border-foreground/10 bg-card p-3 shadow-[0_12px_28px_rgba(42,33,19,0.06)]"
                >
                  <strong>{entry.position}</strong>
                  <PimbasAvatar
                    initials={player?.initials}
                    src={player?.avatarUrl}
                    alt={player?.displayName}
                    size="sm"
                  />
                  <div className="grid min-w-0 flex-1 gap-1">
                    <span>{player?.displayName}</span>
                    <small className="text-muted-foreground">
                      {percent(winRate)} aproveit. - {entry.stats.goals} gols
                    </small>
                  </div>
                  <em className="font-black not-italic text-primary">{entry.points}</em>
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <div className="grid gap-2.5">
          {(pairStatsQuery.data ?? []).map((entry, index) => {
            const winRate = entry.matches ? (entry.wins / entry.matches) * 100 : 0;
            return (
              <div
                key={entry.pairKey}
                className="flex min-w-0 items-center gap-2.5 rounded-lg border border-foreground/10 bg-card p-3 shadow-[0_12px_28px_rgba(42,33,19,0.06)]"
              >
                <strong>{index + 1}</strong>
                <div className="grid min-w-0 flex-1 gap-1">
                  <span>
                    {playerName(players, entry.playerIds[0])} +{" "}
                    {playerName(players, entry.playerIds[1])}
                  </span>
                  <small className="text-muted-foreground">
                    {entry.wins} vitórias - {percent(winRate)} aproveit.
                  </small>
                </div>
                <em className="font-black not-italic text-primary">
                  {entry.goalsFor - entry.goalsAgainst}
                </em>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
