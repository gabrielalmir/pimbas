"use client";

import { History, type LucideIcon, Medal, Shirt, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/LoadingState";
import { KindBadge, Page, PimbasAvatar, SectionCard } from "@/components/PimbasLayout";
import { Badge } from "@/components/ui/badge";
import { calculatePairStats, getScore } from "@/lib/domain";
import { percent, playerName, shortDate } from "@/lib/format";
import { useGroup, useMatches, usePlayers, useRanking } from "@/lib/hooks";

export default function PlayerProfilePage() {
  const params = useParams<{ playerId: string }>();
  const searchParams = useSearchParams();
  const playerId = params.playerId;
  const groupId = searchParams.get("groupId") || "group-trampo";

  const playersQuery = usePlayers(groupId);
  const groupQuery = useGroup(groupId);
  const rankingQuery = useRanking(groupId);
  const matchesQuery = useMatches(groupId);

  if (
    playersQuery.isLoading ||
    rankingQuery.isLoading ||
    matchesQuery.isLoading ||
    groupQuery.isLoading
  )
    return <LoadingState />;

  const players = playersQuery.data ?? [];
  const player = players.find((item) => item.id === playerId) ?? players[0];
  if (!player) return <div className="p-8">Jogador nÃ£o encontrado.</div>;

  const ranking = rankingQuery.data?.find((entry) => entry.playerId === player.id);
  const stats = ranking?.stats;
  const pairStats = calculatePairStats(groupId, matchesQuery.data ?? [])
    .filter((entry) => entry.playerIds.includes(player.id))
    .slice(0, 2);
  const winRate = stats?.matches ? (stats.wins / stats.matches) * 100 : 0;
  const recentMatches = (matchesQuery.data ?? [])
    .filter(
      (match) =>
        match.status === "finished" &&
        [...match.pairA.players, ...match.pairB.players].some(
          (entry) => entry.playerId === player.id,
        ),
    )
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 5);
  const positionLabel =
    player.favoritePosition === "attacker"
      ? "Atacante"
      : player.favoritePosition === "goalkeeper"
        ? "Goleiro"
        : "Versátil";
  const positionCode =
    player.favoritePosition === "attacker"
      ? "ATA"
      : player.favoritePosition === "goalkeeper"
        ? "GLR"
        : "VERS";

  return (
    <Page>
      <div className="grid gap-3.5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <aside className="overflow-hidden rounded-lg border border-foreground/10 bg-primary text-primary-foreground shadow-[0_14px_0_rgba(23,73,56,0.08),0_18px_34px_rgba(42,33,19,0.08)] [background-image:linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%),var(--field-rods)] lg:sticky lg:top-6">
          <div className="grid justify-items-center border-b border-primary-foreground/15 px-5 py-6 text-center">
            <div className="mb-4 flex w-full items-start justify-between gap-3 text-[var(--pmb-gold)]">
              <div className="grid justify-items-start gap-0.5 text-left">
                <strong className="font-display text-5xl leading-none">
                  {ranking?.points ?? 0}
                </strong>
                <small className="font-black uppercase">pontos</small>
              </div>
              <Badge className="bg-[var(--pmb-gold)] text-foreground">{positionCode}</Badge>
            </div>
            <PimbasAvatar
              initials={player.initials}
              src={player.avatarUrl}
              alt={player.displayName}
              size="xl"
              className="text-3xl"
            />
            <h1 className="mt-4 font-display text-4xl uppercase leading-none">
              {player.displayName}
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/80">
              #{player.shirtNumber} - {positionLabel} - {player.nationality}
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-primary-foreground/65">
              {groupQuery.data?.name ?? "Grupo"}
            </p>
          </div>

          <div className="grid gap-2.5 p-4">
            <Metric icon={Target} label="Gols" value={stats?.goals ?? 0} />
            <Metric icon={Trophy} label="Aproveitamento" value={percent(winRate)} />
            <Metric icon={Medal} label="Sequência atual" value={stats?.currentStreak ?? 0} />
            <Metric icon={Shirt} label="Títulos" value={stats?.titles ?? 0} />
          </div>

          {player.bio && (
            <blockquote className="mx-4 mb-4 rounded-lg bg-primary-foreground/10 p-3 text-sm text-primary-foreground/86">
              {player.bio}
            </blockquote>
          )}
        </aside>

        <main className="min-w-0">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
            <SummaryTile
              label="Partidas"
              value={stats?.matches ?? 0}
              detail={`${stats?.wins ?? 0}V / ${stats?.losses ?? 0}D`}
            />
            <SummaryTile
              label="Gols por funÃ§Ã£o"
              value={`${stats?.attackerGoals ?? 0}/${stats?.goalkeeperGoals ?? 0}`}
              detail="ataque / gol"
            />
            <SummaryTile
              label="Melhor sequÃªncia"
              value={stats?.bestStreak ?? 0}
              detail="vitÃ³rias"
            />
          </div>

          <SectionCard title="Estilo de jogo">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Perfil declarado</p>
                <strong className="mt-1 block text-lg">
                  {player.style || "Estilo ainda nÃ£o informado"}
                </strong>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">PosiÃ§Ã£o favorita</p>
                <strong className="mt-1 block text-lg">{positionLabel}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Duplas frequentes">
            <div className="grid gap-2.5 md:grid-cols-2">
              {pairStats.map((entry) => {
                const partnerId = entry.playerIds.find((id) => id !== player.id) ?? player.id;
                const partner = players.find((item) => item.id === partnerId);
                const rate = entry.matches ? (entry.wins / entry.matches) * 100 : 0;
                return (
                  <div
                    key={entry.pairKey}
                    className="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted p-3"
                  >
                    <PimbasAvatar
                      initials={partner?.initials}
                      src={partner?.avatarUrl}
                      alt={partner?.displayName}
                      size="sm"
                    />
                    <div className="grid min-w-0 flex-1 gap-1">
                      <strong>com {playerName(players, partnerId)}</strong>
                      <small className="text-muted-foreground">
                        {entry.matches} jogos - {entry.wins} vitórias
                      </small>
                    </div>
                    <em className="font-black not-italic text-primary">{percent(rate)}</em>
                  </div>
                );
              })}
              {pairStats.length === 0 && (
                <p className="text-muted-foreground">Sem duplas frequentes ainda.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Histórico recente">
            <div className="grid gap-2.5">
              {recentMatches.length ? (
                recentMatches.map((match) => {
                  const [scoreA, scoreB] = getScore(match);
                  return (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}/live`}
                      className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-foreground/10 bg-card p-3 shadow-[0_8px_0_rgba(23,73,56,0.06)] max-[520px]:grid-cols-1"
                    >
                      <KindBadge kind={match.kind} />
                      <div className="min-w-0">
                        <strong className="block [overflow-wrap:anywhere]">
                          {match.pairA.name} {scoreA} - {scoreB} {match.pairB.name}
                        </strong>
                        <small className="inline-flex items-center gap-1 text-muted-foreground">
                          <History className="size-3.5" />
                          {shortDate(match.startedAt)}
                        </small>
                      </div>
                      <span className="font-display text-2xl text-[var(--pmb-gold)]">
                        {scoreA}-{scoreB}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <p className="text-muted-foreground">Ainda sem partidas registradas.</p>
              )}
            </div>
          </SectionCard>
        </main>
      </div>
    </Page>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-primary-foreground/10 p-3">
      <Icon className="size-4 text-[var(--pmb-gold)]" />
      <span className="text-sm text-primary-foreground/78">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-4 shadow-[0_10px_0_rgba(23,73,56,0.06)]">
      <strong className="font-display text-4xl leading-none text-primary">{value}</strong>
      <p className="mt-1 text-sm font-black">{label}</p>
      <small className="text-muted-foreground">{detail}</small>
    </div>
  );
}
