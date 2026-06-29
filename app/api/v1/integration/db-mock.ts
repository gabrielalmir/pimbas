// Shared in-memory relational mock for the API integration tests.
// Mirrors the subset of Prisma behavior the route handlers rely on.

export type MockRow = Record<string, unknown> & {
  id: string;
  userId?: string;
  email?: string;
  displayName?: string;
  tokenVersion: number;
};

export function createDbMock() {
  const users = new Map<string, MockRow>();
  const profiles = new Map<string, MockRow>();
  const groups = new Map<string, MockRow>();
  const memberships = new Map<string, MockRow>();
  const matches = new Map<string, MockRow>();
  const pairs = new Map<string, MockRow>();
  const pairPlayers = new Map<string, MockRow>();
  const goals = new Map<string, MockRow>();
  const tournaments = new Map<string, MockRow>();
  let userSequence = 1;
  let profileSequence = 1;
  let groupSequence = 1;
  let membershipSequence = 1;
  let matchSequence = 1;
  let pairSequence = 1;
  let pairPlayerSequence = 1;
  let goalSequence = 1;
  let tournamentSequence = 1;

  function hydrateMatch(match: MockRow) {
    const matchPairs = [...pairs.values()]
      .filter((pair) => pair.matchId === match.id)
      .sort((a, b) => String(a.slot).localeCompare(String(b.slot)))
      .map((pair) => ({
        ...pair,
        players: [...pairPlayers.values()].filter((player) => player.matchPairId === pair.id),
      }));
    const matchGoals = [...goals.values()]
      .filter((goal) => goal.matchId === match.id)
      .sort((a, b) => String(a.scoredAt).localeCompare(String(b.scoredAt)));
    return { ...match, pairs: matchPairs, goals: matchGoals };
  }

  return {
    user: {
      async findUnique({
        where,
        include,
      }: {
        where: { id?: string; email?: string };
        include?: { profile?: boolean };
      }) {
        const user = where.email
          ? [...users.values()].find((item) => item.email === where.email)
          : where.id
            ? users.get(where.id)
            : undefined;
        if (!user) return null;
        return include?.profile
          ? {
              ...user,
              profile: [...profiles.values()].find((profile) => profile.userId === user.id) ?? null,
            }
          : user;
      },
      async create({
        data,
        select,
      }: {
        data: Record<string, unknown>;
        select?: Record<string, boolean>;
      }) {
        const user: MockRow = {
          id: `user-${userSequence++}`,
          tokenVersion: 0,
          avatarUrl: null,
          ...data,
        };
        users.set(user.id, user);
        if (!select) return user;
        return Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]));
      },
      async update({
        where,
        data,
      }: {
        where: { id: string };
        data: { tokenVersion?: { increment: number } };
      }) {
        const user = where.id ? users.get(where.id) : undefined;
        if (!user) throw new Error("User not found");
        if (data.tokenVersion?.increment) user.tokenVersion += data.tokenVersion.increment;
        users.set(user.id, user);
        return user;
      },
    },
    group: {
      async findUnique({ where }: { where: { id?: string; inviteCode?: string } }) {
        return where.inviteCode
          ? ([...groups.values()].find((group) => group.inviteCode === where.inviteCode) ?? null)
          : where.id
            ? (groups.get(where.id) ?? null)
            : null;
      },
      async findUniqueOrThrow({ where }: { where: { id: string } }) {
        const group = groups.get(where.id);
        if (!group) throw new Error("Group not found");
        return group;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        const group: MockRow = {
          id: `group-${groupSequence++}`,
          tokenVersion: 0,
          logoUrl: null,
          logoPresetId: null,
          ...data,
        };
        delete group.members;
        groups.set(group.id, group);
        const memberData = (data.members as { create?: Record<string, unknown> } | undefined)
          ?.create;
        if (memberData) {
          const membership: MockRow = {
            id: `member-${membershipSequence++}`,
            tokenVersion: 0,
            groupId: group.id,
            ...memberData,
          };
          memberships.set(membership.id, membership);
        }
        return group;
      },
      async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
        const group = groups.get(where.id);
        if (!group) throw new Error("Group not found");
        Object.assign(group, data);
        return group;
      },
    },
    groupMember: {
      async findMany({
        where,
      }: {
        where: { groupId?: string; userId?: string };
        include?: { group?: boolean; player?: boolean };
        orderBy?: unknown;
      }) {
        return [...memberships.values()]
          .filter(
            (m) =>
              (!where.groupId || m.groupId === where.groupId) &&
              (!where.userId || m.userId === where.userId),
          )
          .map((m) => ({
            ...m,
            group: groups.get(m.groupId as string),
            player: profiles.get(m.playerId as string),
          }));
      },
      async findFirst({ where }: { where: { id?: string; groupId?: string; userId?: string } }) {
        return (
          [...memberships.values()].find(
            (m) =>
              (!where.id || m.id === where.id) &&
              (!where.groupId || m.groupId === where.groupId) &&
              (!where.userId || m.userId === where.userId),
          ) ?? null
        );
      },
      async create({ data }: { data: Record<string, unknown> }) {
        const membership: MockRow = {
          id: `member-${membershipSequence++}`,
          tokenVersion: 0,
          ...data,
        };
        memberships.set(membership.id, membership);
        return membership;
      },
      async delete({ where }: { where: { id: string } }) {
        const membership = memberships.get(where.id);
        memberships.delete(where.id);
        return membership;
      },
    },
    match: {
      async findMany({
        where,
      }: {
        where: { groupId?: string; status?: { not?: string } };
        include?: unknown;
        orderBy?: unknown;
      }) {
        return [...matches.values()]
          .filter(
            (m) =>
              (!where.groupId || m.groupId === where.groupId) &&
              (!where.status?.not || m.status !== where.status.not),
          )
          .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)))
          .map((m) => hydrateMatch(m));
      },
      async findFirst({
        where,
      }: {
        where: { groupId?: string; status?: { not?: string } };
        include?: unknown;
        orderBy?: unknown;
      }) {
        return (await this.findMany({ where }))[0] ?? null;
      },
      async findUnique({ where }: { where: { id: string }; include?: unknown }) {
        const match = matches.get(where.id);
        return match ? hydrateMatch(match) : null;
      },
      async create({
        data,
      }: {
        data: Record<string, unknown> & {
          pairs: {
            create: Array<{
              slot: string;
              name: string;
              players: { create: Array<Record<string, unknown>> };
            }>;
          };
        };
      }) {
        const match: MockRow = {
          id: `match-${matchSequence++}`,
          tokenVersion: 0,
          tournamentId: null,
          finishedAt: null,
          winnerPairId: null,
          ...data,
        };
        delete match.pairs;
        matches.set(match.id, match);
        for (const pairData of data.pairs.create) {
          const pair: MockRow = {
            id: `pair-${pairSequence++}`,
            tokenVersion: 0,
            matchId: match.id,
            slot: pairData.slot,
            name: pairData.name,
          };
          pairs.set(pair.id, pair);
          for (const playerData of pairData.players.create) {
            const pairPlayer: MockRow = {
              id: `pair-player-${pairPlayerSequence++}`,
              tokenVersion: 0,
              matchPairId: pair.id,
              ...playerData,
            };
            pairPlayers.set(pairPlayer.id, pairPlayer);
          }
        }
        return hydrateMatch(match);
      },
      async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
        const match = matches.get(where.id);
        if (!match) throw new Error("Match not found");
        Object.assign(match, data);
        return hydrateMatch(match);
      },
    },
    goal: {
      async create({ data }: { data: Record<string, unknown> }) {
        const goal: MockRow = {
          id: `goal-${goalSequence++}`,
          tokenVersion: 0,
          ...data,
        };
        goals.set(goal.id, goal);
        return goal;
      },
      async delete({ where }: { where: { id: string } }) {
        const goal = goals.get(where.id);
        goals.delete(where.id);
        return goal;
      },
    },
    playerProfile: {
      async findMany() {
        return [...profiles.values()].sort((a, b) =>
          (a.displayName ?? "").localeCompare(b.displayName ?? ""),
        );
      },
      async findUnique({ where }: { where: { userId: string } }) {
        return [...profiles.values()].find((profile) => profile.userId === where.userId) ?? null;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        const profile: MockRow = {
          id: `profile-${profileSequence++}`,
          tokenVersion: 0,
          avatarUrl: null,
          avatarPresetId: null,
          ...data,
        };
        profiles.set(profile.id, profile);
        return profile;
      },
      async update({ where, data }: { where: { userId: string }; data: Record<string, unknown> }) {
        const profile = [...profiles.values()].find((item) => item.userId === where.userId);
        if (!profile) throw new Error("Profile not found");
        Object.assign(profile, data);
        return profile;
      },
    },
    tournament: {
      async findMany({ where }: { where: { groupId?: string } }) {
        return [...tournaments.values()].filter(
          (item) => !where.groupId || item.groupId === where.groupId,
        );
      },
      async findUnique({ where }: { where: { id: string } }) {
        return tournaments.get(where.id) ?? null;
      },
      async create({ data }: { data: Record<string, unknown> }) {
        const tournament: MockRow = {
          id: `tournament-${tournamentSequence++}`,
          tokenVersion: 0,
          championPairId: null,
          thirdPlaceMatchup: null,
          ...data,
        };
        tournaments.set(tournament.id, tournament);
        return tournament;
      },
      async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
        const tournament = tournaments.get(where.id);
        if (!tournament) throw new Error("Tournament not found");
        Object.assign(tournament, data);
        return tournament;
      },
    },
  };
}
