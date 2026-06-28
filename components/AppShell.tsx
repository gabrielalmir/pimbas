"use client";

import { BarChart3, Home, Plus, Trophy, User } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCurrentPlayerId, useGroups, useMatch, useTournament } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{
    groupId?: string;
    matchId?: string;
    tournamentId?: string;
    playerId?: string;
  }>();
  const groupsQuery = useGroups();
  const matchQuery = useMatch(params.matchId ?? "");
  const tournamentQuery = useTournament(params.tournamentId ?? "");
  const currentPlayerIdQuery = useCurrentPlayerId();

  const derivedGroupId =
    params.groupId ??
    matchQuery.data?.groupId ??
    tournamentQuery.data?.groupId ??
    groupsQuery.data?.[0]?.id;
  const _currentPlayerId = params.playerId ?? currentPlayerIdQuery.data;
  const homeHref = derivedGroupId ? `/groups/${derivedGroupId}` : "/groups";
  const tournamentsHref = derivedGroupId ? `/groups/${derivedGroupId}/tournaments` : "/groups";
  const newMatchHref = derivedGroupId ? `/groups/${derivedGroupId}/friendly/new` : "/groups";
  const rankingHref = derivedGroupId ? `/groups/${derivedGroupId}/ranking` : "/groups";
  const profileHref = "/profile";

  const isHome =
    pathname.includes("/groups/") &&
    !pathname.includes("ranking") &&
    !pathname.includes("tournaments") &&
    !pathname.includes("settings");
  const isTournaments = pathname.includes("tournaments");
  const isRanking = pathname.includes("ranking");
  const isProfile = pathname === "/profile";

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-background">
      <main className="min-h-screen max-w-[100vw] overflow-x-hidden pb-[92px] md:pb-24 lg:pb-0 lg:pl-[104px]">
        {children}
      </main>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] h-20 bg-gradient-to-t from-[var(--pmb-paper-strong)] to-transparent lg:hidden"
        aria-hidden="true"
      />
      <nav
        className="fixed inset-x-0 bottom-0 z-10 grid min-h-[74px] grid-cols-5 border-t border-border bg-card/95 px-1 py-2 pb-[calc(8px+env(safe-area-inset-bottom))] backdrop-blur-md md:inset-x-6 md:bottom-[18px] md:mx-auto md:min-h-[70px] md:max-w-[760px] md:rounded-[18px] md:border md:shadow-[0_18px_42px_rgba(32,32,24,0.18)] lg:inset-y-0 lg:left-0 lg:right-auto lg:bottom-0 lg:m-0 lg:min-h-screen lg:w-[88px] lg:grid-cols-1 lg:content-center lg:rounded-none lg:border-y-0 lg:border-l-0 lg:px-2.5 lg:py-6"
        aria-label="Navegação principal"
      >
        <Link
          href={homeHref}
          className={navLinkClass(isHome)}
          aria-current={isHome ? "page" : undefined}
        >
          <Home className="size-5" />
          <span>Início</span>
        </Link>
        <Link
          href={tournamentsHref}
          className={navLinkClass(isTournaments)}
          aria-current={isTournaments ? "page" : undefined}
        >
          <Trophy className="size-5" />
          <span>Torneios</span>
        </Link>
        <Link
          href={newMatchHref}
          className="grid min-h-14 min-w-0 -translate-y-[22px] place-items-center gap-1 text-xs font-extrabold text-muted-foreground lg:translate-y-0 lg:min-h-[72px]"
        >
          <Plus className="size-14 rounded-full border-4 border-card bg-[var(--pmb-clay)] p-4 text-card shadow-[0_8px_16px_rgba(207,86,45,0.36)] lg:size-[52px]" />
          <span>Novo</span>
        </Link>
        <Link
          href={rankingHref}
          className={navLinkClass(isRanking)}
          aria-current={isRanking ? "page" : undefined}
        >
          <BarChart3 className="size-5" />
          <span>Ranking</span>
        </Link>
        <Link
          href={profileHref}
          className={navLinkClass(isProfile)}
          aria-current={isProfile ? "page" : undefined}
        >
          <User className="size-5" />
          <span>Perfil</span>
        </Link>
      </nav>
    </div>
  );
}

function navLinkClass(active: boolean) {
  return cn(
    "grid min-h-14 min-w-0 place-items-center gap-1 text-center text-xs font-extrabold text-muted-foreground transition-colors lg:min-h-[72px]",
    "max-[520px]:text-[0.62rem] max-[520px]:[&>span]:sr-only",
    active && "text-primary",
  );
}
