"use client";

import { ArrowLeft, CalendarClock, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Eyebrow, KindBadge, Page, PageHeader, SectionCard } from "@/components/PimbasLayout";
import { ScoreBadge } from "@/components/ScoreBadge";
import { buttonVariants } from "@/components/ui/button";
import { getScore } from "@/lib/domain";
import { shortDate } from "@/lib/format";
import { useGroup, useMatches } from "@/lib/hooks";

export default function HistoryPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId || "group-trampo";

  const groupQuery = useGroup(groupId);
  const matchesQuery = useMatches(groupId);
  const group = groupQuery.data;
  const matches = (matchesQuery.data || [])
    .filter((match) => match.status === "finished")
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const tournamentMatches = matches.filter((match) => match.kind === "tournament").length;
  const friendlyMatches = matches.length - tournamentMatches;
  const lastMatch = matches[0];

  return (
    <Page>
      <PageHeader>
        <Eyebrow>{group?.name ?? "Grupo"}</Eyebrow>
        <h1 className="font-display text-4xl uppercase leading-none">Histórico</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          Partidas finalizadas da mais recente para a mais antiga, com placar e vencedor em
          destaque.
        </p>
      </PageHeader>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <SectionCard title="Partidas finalizadas" className="mt-0">
          {matches.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
              Sem partidas finalizadas neste grupo.
            </div>
          )}
          <div className="grid gap-2.5">
            {matches.map((match) => {
              const [scoreA, scoreB] = getScore(match);
              const winner =
                scoreA === scoreB
                  ? "Empate"
                  : scoreA > scoreB
                    ? match.pairA.name
                    : match.pairB.name;
              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}/live`}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-foreground/10 bg-card p-3 shadow-[0_8px_0_rgba(23,73,56,0.06)] transition-transform hover:-translate-y-0.5 max-[520px]:grid-cols-1"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <KindBadge kind={match.kind} />
                      <small className="inline-flex items-center gap-1 text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        {shortDate(match.startedAt)}
                      </small>
                    </div>
                    <strong className="block [overflow-wrap:anywhere]">
                      {match.pairA.name} vs {match.pairB.name}
                    </strong>
                    <small className="text-muted-foreground">Resultado: {winner}</small>
                  </div>
                  <ScoreBadge match={match} />
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <aside className="rounded-lg border border-foreground/10 bg-card p-4 shadow-[0_14px_0_rgba(23,73,56,0.08),0_18px_34px_rgba(42,33,19,0.08)] lg:sticky lg:top-6">
          <Eyebrow>Resumo</Eyebrow>
          <div className="grid gap-2.5">
            <HistoryMetric label="Total" value={matches.length} />
            <HistoryMetric label="Amistosos" value={friendlyMatches} />
            <HistoryMetric label="Torneios" value={tournamentMatches} />
          </div>
          {lastMatch && (
            <div className="mt-4 rounded-lg bg-muted p-3">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Trophy className="size-4" />
                <strong>Última partida</strong>
              </div>
              <p className="text-sm [overflow-wrap:anywhere]">
                {lastMatch.pairA.name} vs {lastMatch.pairB.name}
              </p>
              <small className="text-muted-foreground">{shortDate(lastMatch.startedAt)}</small>
            </div>
          )}
          <Link
            href={`/groups/${groupId}`}
            className={buttonVariants({
              variant: "secondary",
              className: "mt-4 w-full",
            })}
          >
            <ArrowLeft data-icon="inline-start" />
            Voltar para o grupo
          </Link>
        </aside>
      </div>
    </Page>
  );
}

function HistoryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="font-display text-3xl leading-none text-primary">{value}</strong>
    </div>
  );
}
