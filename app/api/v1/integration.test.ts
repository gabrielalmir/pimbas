import { beforeEach, describe, expect, it, vi } from "vitest";

type MockRow = Record<string, unknown> & {
  id: string;
  userId?: string;
  email?: string;
  displayName?: string;
  tokenVersion: number;
};

function createDbMock() {
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

let db: ReturnType<typeof createDbMock>;

vi.mock("@/lib/server/prisma", () => ({
  getDb: () => db,
  withDbUser: async (_userId: string, run: (client: typeof db) => Promise<unknown>) => run(db),
}));

// Rate limiting is exercised in its own unit test; mocked out here so it doesn't
// interfere with tests that legitimately sign up many players against a shared
// "unknown" test IP.
vi.mock("@/lib/server/rate-limit", () => ({
  isRateLimited: () => false,
}));

const { POST: signup } = await import("./auth/signup/route");
const { POST: login } = await import("./auth/login/route");
const { POST: refresh } = await import("./auth/refresh/route");
const { GET: me } = await import("./me/route");
const { GET: listPlayers } = await import("./players/route");
const { POST: createProfile } = await import("./players/me/route");
const { GET: listGroups, POST: createGroup } = await import("./groups/route");
const { POST: joinGroup } = await import("./groups/join/route");
const { GET: getGroup, PATCH: patchGroup } = await import("./groups/[groupId]/route");
const { GET: getInvite } = await import("./groups/[groupId]/invite/route");
const { GET: listMembers } = await import("./groups/[groupId]/members/route");
const { DELETE: removeMember } = await import("./groups/[groupId]/members/[memberId]/route");
const { GET: listMatches } = await import("./groups/[groupId]/matches/route");
const { GET: liveMatch } = await import("./groups/[groupId]/matches/live/route");
const { GET: ranking } = await import("./groups/[groupId]/ranking/route");
const { GET: pairStats } = await import("./groups/[groupId]/pair-stats/route");
const { POST: createMatch } = await import("./matches/route");
const { POST: registerGoal } = await import("./matches/[matchId]/goals/route");
const { DELETE: undoGoal } = await import("./matches/[matchId]/goals/[goalId]/route");
const { GET: listTournaments, POST: createTournament } = await import(
  "./groups/[groupId]/tournaments/route"
);
const { GET: getTournament } = await import("./tournaments/[tournamentId]/route");
const { POST: startMatchup } = await import(
  "./tournaments/[tournamentId]/matchups/[matchupId]/start/route"
);

function jsonRequest(body?: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function getRequest(headers?: Record<string, string>) {
  return new Request("http://localhost/test", { headers });
}

function ctx<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

async function signupWithProfile(email: string, name: string) {
  const signupRes = await signup(jsonRequest({ email, password: "super-secret", name }));
  const session = await signupRes.json();
  const auth = { authorization: `Bearer ${session.accessToken}` };
  const profileRes = await createProfile(
    jsonRequest(
      {
        displayName: name,
        initials: name.slice(0, 2),
        shirtNumber: 10,
        favoritePosition: "attacker",
        style: "Classico",
        nationality: "BR",
        bio: "Jogador do grupo",
      },
      auth,
    ),
  );
  expect(profileRes.status).toBe(201);
  const profile = (await profileRes.json()).playerProfile;
  return { auth, profile };
}

beforeEach(() => {
  db = createDbMock();
});

describe("auth and player routes", () => {
  it("supports signup, login, authenticated me and refresh rotation", async () => {
    const signupRes = await signup(
      jsonRequest({
        email: "Ana@example.com",
        password: "super-secret",
        name: "Ana",
      }),
    );
    expect(signupRes.status).toBe(201);
    const created = await signupRes.json();
    expect(created.user.email).toBe("ana@example.com");

    const loginRes = await login(
      jsonRequest({ email: "ana@example.com", password: "super-secret" }),
    );
    expect(loginRes.status).toBe(200);
    const session = await loginRes.json();

    const meRes = await me(getRequest({ authorization: `Bearer ${session.accessToken}` }));
    expect(meRes.status).toBe(200);
    expect((await meRes.json()).user.name).toBe("Ana");

    const refreshRes = await refresh(jsonRequest({ refreshToken: session.refreshToken }));
    expect(refreshRes.status).toBe(200);
    const refreshed = await refreshRes.json();
    expect(typeof refreshed.refreshToken).toBe("string");

    const reusedRefresh = await refresh(jsonRequest({ refreshToken: session.refreshToken }));
    expect(reusedRefresh.status).toBe(401);
  });

  it("protects player profile endpoints", async () => {
    const unauthorized = await listPlayers(getRequest());
    expect(unauthorized.status).toBe(401);
  });

  it("lists only players from groups the authenticated user belongs to", async () => {
    const owner = await signupWithProfile("scope-owner@example.com", "Owner");
    const teammate = await signupWithProfile("scope-mate@example.com", "Mate");
    const outsider = await signupWithProfile("scope-outsider@example.com", "Outsider");

    const createdRes = await createGroup(
      jsonRequest({ name: "Grupo Escopo", description: "Mesa" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;
    const inviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId }));
    const invite = await inviteRes.json();
    await joinGroup(jsonRequest({ inviteCode: invite.inviteCode }, teammate.auth));

    const playersRes = await listPlayers(getRequest(owner.auth));
    expect(playersRes.status).toBe(200);
    const { players } = await playersRes.json();
    expect(players.map((player: { id: string }) => player.id)).toEqual(
      expect.arrayContaining([owner.profile.id, teammate.profile.id]),
    );
    expect(players.map((player: { id: string }) => player.id)).not.toContain(outsider.profile.id);
  });

  it("lists players scoped to an authorized group when groupId is provided", async () => {
    const owner = await signupWithProfile("scope-by-group-owner@example.com", "Owner");
    const firstMate = await signupWithProfile("scope-by-group-first@example.com", "First");
    const secondMate = await signupWithProfile("scope-by-group-second@example.com", "Second");
    const outsider = await signupWithProfile("scope-by-group-outsider@example.com", "Outsider");

    const firstGroupRes = await createGroup(
      jsonRequest({ name: "Grupo Primeiro", description: "Mesa" }, owner.auth),
    );
    const firstGroupId = (await firstGroupRes.json()).group.id;
    const firstInviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId: firstGroupId }));
    const firstInvite = await firstInviteRes.json();
    await joinGroup(jsonRequest({ inviteCode: firstInvite.inviteCode }, firstMate.auth));

    const secondGroupRes = await createGroup(
      jsonRequest({ name: "Grupo Segundo", description: "Mesa" }, owner.auth),
    );
    const secondGroupId = (await secondGroupRes.json()).group.id;
    const secondInviteRes = await getInvite(
      getRequest(owner.auth),
      ctx({ groupId: secondGroupId }),
    );
    const secondInvite = await secondInviteRes.json();
    await joinGroup(jsonRequest({ inviteCode: secondInvite.inviteCode }, secondMate.auth));

    const playersRes = await listPlayers(
      new Request(`http://localhost/test?groupId=${firstGroupId}`, { headers: owner.auth }),
    );
    expect(playersRes.status).toBe(200);
    const { players } = await playersRes.json();
    const playerIds = players.map((player: { id: string }) => player.id);
    expect(playerIds).toEqual(expect.arrayContaining([owner.profile.id, firstMate.profile.id]));
    expect(playerIds).not.toContain(secondMate.profile.id);
    expect(playerIds).not.toContain(outsider.profile.id);

    const outsiderRes = await listPlayers(
      new Request(`http://localhost/test?groupId=${firstGroupId}`, { headers: outsider.auth }),
    );
    expect(outsiderRes.status).toBe(403);
  });

  it("creates, lists, scores and finishes a friendly match with server-side rules", async () => {
    const owner = await signupWithProfile("owner2@example.com", "Owner");
    const p2 = await signupWithProfile("p2@example.com", "P2");
    const p3 = await signupWithProfile("p3@example.com", "P3");
    const p4 = await signupWithProfile("p4@example.com", "P4");

    const createdRes = await createGroup(
      jsonRequest({ name: "Pimbas Arena", description: "Mesa" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;
    const inviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId }));
    const invite = await inviteRes.json();
    for (const player of [p2, p3, p4]) {
      await joinGroup(jsonRequest({ inviteCode: invite.inviteCode }, player.auth));
    }

    const friendlyRes = await createMatch(
      jsonRequest(
        {
          groupId,
          pairAName: "Dupla A",
          pairBName: "Dupla B",
          pairAGoalkeeperId: owner.profile.id,
          pairAAttackerId: p2.profile.id,
          pairBGoalkeeperId: p3.profile.id,
          pairBAttackerId: p4.profile.id,
          settings: { goalLimit: 2, timeLimitMinutes: 3, goldenGoal: true },
        },
        owner.auth,
      ),
    );
    expect(friendlyRes.status).toBe(201);
    const matchId = (await friendlyRes.json()).match.id;

    const firstGoal = await registerGoal(
      jsonRequest({ playerId: p2.profile.id }, owner.auth),
      ctx({ matchId }),
    );
    expect(firstGoal.status).toBe(200);
    expect((await firstGoal.json()).match.goals).toHaveLength(1);

    const winningGoal = await registerGoal(
      jsonRequest({ playerId: owner.profile.id }, owner.auth),
      ctx({ matchId }),
    );
    expect(winningGoal.status).toBe(200);
    const winningJson = await winningGoal.json();
    expect(winningJson.match.status).toBe("finished");
    expect(winningJson.match.winnerPairId).toBe(winningJson.match.pairA.id);

    const live = await liveMatch(getRequest(owner.auth), ctx({ groupId }));
    expect(live.status).toBe(200);
    expect((await live.json()).match).toBeNull();

    const history = await listMatches(getRequest(owner.auth), ctx({ groupId }));
    expect(history.status).toBe(200);
    expect((await history.json()).matches).toHaveLength(1);

    const rankingRes = await ranking(getRequest(owner.auth), ctx({ groupId }));
    expect(rankingRes.status).toBe(200);
    const rankingJson = await rankingRes.json();
    expect(rankingJson.ranking).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: owner.profile.id,
          points: 4,
          position: 1,
        }),
        expect.objectContaining({
          playerId: p2.profile.id,
          points: 4,
          position: 2,
        }),
        expect.objectContaining({ playerId: p3.profile.id, points: 0 }),
        expect.objectContaining({ playerId: p4.profile.id, points: 0 }),
      ]),
    );

    const pairStatsRes = await pairStats(getRequest(owner.auth), ctx({ groupId }));
    expect(pairStatsRes.status).toBe(200);
    const pairStatsJson = await pairStatsRes.json();
    expect(pairStatsJson.pairStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupId,
          playerIds: [owner.profile.id, p2.profile.id],
          matches: 1,
          wins: 1,
          goalsFor: 2,
          goalsAgainst: 0,
        }),
        expect.objectContaining({
          groupId,
          playerIds: [p3.profile.id, p4.profile.id],
          matches: 1,
          losses: 1,
          goalsFor: 0,
          goalsAgainst: 2,
        }),
      ]),
    );
  });

  it("registers and undoes a goal within the allowed window", async () => {
    const owner = await signupWithProfile("undo-owner@example.com", "Owner");
    const p2 = await signupWithProfile("undo-p2@example.com", "P2");
    const p3 = await signupWithProfile("undo-p3@example.com", "P3");
    const p4 = await signupWithProfile("undo-p4@example.com", "P4");

    const createdRes = await createGroup(
      jsonRequest({ name: "Undo Arena", description: "Mesa" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;
    const inviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId }));
    const invite = await inviteRes.json();
    for (const player of [p2, p3, p4]) {
      await joinGroup(jsonRequest({ inviteCode: invite.inviteCode }, player.auth));
    }

    const friendlyRes = await createMatch(
      jsonRequest(
        {
          groupId,
          pairAName: "A",
          pairBName: "B",
          pairAGoalkeeperId: owner.profile.id,
          pairAAttackerId: p2.profile.id,
          pairBGoalkeeperId: p3.profile.id,
          pairBAttackerId: p4.profile.id,
          settings: { goalLimit: 5, timeLimitMinutes: 3, goldenGoal: true },
        },
        owner.auth,
      ),
    );
    const matchId = (await friendlyRes.json()).match.id;
    const goalRes = await registerGoal(
      jsonRequest({ playerId: p2.profile.id }, owner.auth),
      ctx({ matchId }),
    );
    const goalJson = await goalRes.json();
    expect(goalJson.match.goals).toHaveLength(1);
    const goalId = goalJson.match.goals[0].id;

    const undoneRes = await undoGoal(getRequest(owner.auth), ctx({ matchId, goalId }));
    expect(undoneRes.status).toBe(200);
    const undoneJson = await undoneRes.json();
    expect(undoneJson.match.goals).toHaveLength(0);
    expect(undoneJson.match.status).toBe("live");
  });

  it("blocks non-members from creating or reading group matches", async () => {
    const owner = await signupWithProfile("owner3@example.com", "Owner");
    const outsider = await signupWithProfile("outsider3@example.com", "Outsider");
    const createdRes = await createGroup(
      jsonRequest({ name: "Pimbas Seguro", description: "Mesa" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;

    const forbidden = await listMatches(getRequest(outsider.auth), ctx({ groupId }));
    expect(forbidden.status).toBe(403);
    const rankingForbidden = await ranking(getRequest(outsider.auth), ctx({ groupId }));
    expect(rankingForbidden.status).toBe(403);
    const pairStatsForbidden = await pairStats(getRequest(outsider.auth), ctx({ groupId }));
    expect(pairStatsForbidden.status).toBe(403);
    const createForbidden = await createMatch(
      jsonRequest(
        {
          groupId,
          pairAName: "A",
          pairBName: "B",
          pairAGoalkeeperId: owner.profile.id,
          pairAAttackerId: owner.profile.id,
          pairBGoalkeeperId: outsider.profile.id,
          pairBAttackerId: outsider.profile.id,
          settings: { goalLimit: 2, timeLimitMinutes: 3, goldenGoal: true },
        },
        outsider.auth,
      ),
    );
    expect(createForbidden.status).toBe(403);
  });
});

describe("group membership and authorization", () => {
  it("creates groups, exposes invite data only to admins, and lets another profiled user join by code", async () => {
    const owner = await signupWithProfile("owner@example.com", "Owner");
    const guest = await signupWithProfile("guest@example.com", "Guest");

    const createdRes = await createGroup(
      jsonRequest({ name: "Pimbas Trampo", description: "Mesa do trabalho" }, owner.auth),
    );
    expect(createdRes.status).toBe(201);
    const created = await createdRes.json();
    expect(created.group.memberIds).toEqual([owner.profile.id]);
    expect(created.group.adminPlayerIds).toEqual([owner.profile.id]);

    const inviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId: created.group.id }));
    expect(inviteRes.status).toBe(200);
    const invite = await inviteRes.json();

    const joinedRes = await joinGroup(
      jsonRequest({ inviteCode: invite.inviteCode.toLowerCase() }, guest.auth),
    );
    expect(joinedRes.status).toBe(200);
    const joinedJson = await joinedRes.json();
    expect(joinedJson.group.memberIds).toEqual([owner.profile.id, guest.profile.id]);
    expect(joinedJson.group.inviteCode).toBeUndefined();

    const memberInviteRes = await getInvite(
      getRequest(guest.auth),
      ctx({ groupId: created.group.id }),
    );
    expect(memberInviteRes.status).toBe(403);

    const membersRes = await listMembers(
      getRequest(owner.auth),
      ctx({ groupId: created.group.id }),
    );
    expect(membersRes.status).toBe(200);
    const members = (await membersRes.json()).members;
    const guestMember = members.find(
      (member: { playerId: string }) => member.playerId === guest.profile.id,
    );
    expect(guestMember).toBeDefined();

    const removedRes = await removeMember(
      getRequest(owner.auth),
      ctx({ groupId: created.group.id, memberId: guestMember.id }),
    );
    expect(removedRes.status).toBe(204);
  });

  it("lists only the groups the authenticated user belongs to", async () => {
    const owner = await signupWithProfile("list-owner@example.com", "Owner");
    const other = await signupWithProfile("list-other@example.com", "Other");

    const ownerGroupRes = await createGroup(
      jsonRequest({ name: "Grupo do Owner", description: "A" }, owner.auth),
    );
    const ownerGroup = await ownerGroupRes.json();
    await createGroup(jsonRequest({ name: "Grupo do Other", description: "B" }, other.auth));

    const ownerListRes = await listGroups(getRequest(owner.auth));
    expect(ownerListRes.status).toBe(200);
    const ownerList = await ownerListRes.json();
    expect(ownerList.groups).toHaveLength(1);
    expect(ownerList.groups[0].id).toBe(ownerGroup.group.id);
  });

  it("blocks cross-group access and admin-only updates for regular members", async () => {
    const owner = await signupWithProfile("owner@example.com", "Owner");
    const guest = await signupWithProfile("guest@example.com", "Guest");
    const outsider = await signupWithProfile("outsider@example.com", "Outsider");

    const createdRes = await createGroup(
      jsonRequest({ name: "Pimbas Trampo", description: "Mesa do trabalho" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;
    const inviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId }));
    const invite = await inviteRes.json();
    await joinGroup(jsonRequest({ inviteCode: invite.inviteCode }, guest.auth));

    const outsiderRead = await getGroup(getRequest(outsider.auth), ctx({ groupId }));
    expect(outsiderRead.status).toBe(403);

    const memberPatch = await patchGroup(
      jsonRequest({ name: "Tentativa" }, guest.auth),
      ctx({ groupId }),
    );
    expect(memberPatch.status).toBe(403);

    const adminPatch = await patchGroup(
      jsonRequest({ name: "Pimbas Oficial" }, owner.auth),
      ctx({ groupId }),
    );
    expect(adminPatch.status).toBe(200);
    expect((await adminPatch.json()).group.name).toBe("Pimbas Oficial");
  });

  it("lets group admins update default match settings with domain validation", async () => {
    const owner = await signupWithProfile("settings-owner@example.com", "Owner");
    const createdRes = await createGroup(
      jsonRequest({ name: "Pimbas Settings", description: "Mesa" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;

    const patchRes = await patchGroup(
      jsonRequest(
        {
          defaultMatchSettings: {
            goalLimit: 7,
            timeLimitMinutes: 12,
            goldenGoal: false,
          },
        },
        owner.auth,
      ),
      ctx({ groupId }),
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).group.defaultMatchSettings).toEqual({
      goalLimit: 7,
      timeLimitMinutes: 12,
      goldenGoal: false,
    });

    const invalidPatchRes = await patchGroup(
      jsonRequest(
        {
          defaultMatchSettings: {
            goalLimit: 0,
            timeLimitMinutes: 12,
            goldenGoal: false,
          },
        },
        owner.auth,
      ),
      ctx({ groupId }),
    );
    expect(invalidPatchRes.status).toBe(400);
  });
});

describe("tournaments", () => {
  async function setupGroupWithPlayers(count: number) {
    const players = [];
    for (let i = 0; i < count; i += 1) {
      players.push(await signupWithProfile(`tournament-p${i}@example.com`, `Player ${i}`));
    }
    const owner = players[0];
    const createdRes = await createGroup(
      jsonRequest({ name: "Torneio Arena", description: "Mesa" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;
    const inviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId }));
    const invite = await inviteRes.json();
    for (const player of players.slice(1)) {
      await joinGroup(jsonRequest({ inviteCode: invite.inviteCode }, player.auth));
    }
    return { groupId, players };
  }

  it("creates a tournament with random pairs and crowns a champion after the final", async () => {
    const { groupId, players } = await setupGroupWithPlayers(4);
    const owner = players[0];

    const createdRes = await createTournament(
      jsonRequest(
        {
          groupId,
          name: "Copa Teste",
          settings: { goalLimit: 1, timeLimitMinutes: 3, goldenGoal: false },
          playerIds: players.map((p) => p.profile.id),
        },
        owner.auth,
      ),
      ctx({ groupId }),
    );
    expect(createdRes.status).toBe(201);
    const tournament = (await createdRes.json()).tournament;
    expect(tournament.pairs).toHaveLength(2);
    expect(tournament.matchups).toHaveLength(1);
    const finalMatchup = tournament.matchups[0];
    expect(finalMatchup.pairAId).toBeDefined();
    expect(finalMatchup.pairBId).toBeDefined();

    const startRes = await startMatchup(
      jsonRequest(undefined, owner.auth),
      ctx({ tournamentId: tournament.id, matchupId: finalMatchup.id }),
    );
    expect(startRes.status).toBe(201);
    const match = (await startRes.json()).match;
    expect(match.kind).toBe("tournament");

    const goalRes = await registerGoal(
      jsonRequest({ playerId: match.pairA.players[0].playerId }, owner.auth),
      ctx({ matchId: match.id }),
    );
    expect(goalRes.status).toBe(200);
    const finishedMatch = (await goalRes.json()).match;
    expect(finishedMatch.status).toBe("finished");

    const tournamentRes = await getTournament(
      getRequest(owner.auth),
      ctx({ tournamentId: tournament.id }),
    );
    expect(tournamentRes.status).toBe(200);
    const updatedTournament = (await tournamentRes.json()).tournament;
    expect(updatedTournament.status).toBe("finished");
    expect(updatedTournament.championPairId).toBe(finishedMatch.winnerPairId);
  });

  it("creates a tournament with manual pairs using the given names", async () => {
    const { groupId, players } = await setupGroupWithPlayers(4);
    const owner = players[0];

    const createdRes = await createTournament(
      jsonRequest(
        {
          groupId,
          name: "Copa Manual",
          settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
          manualPairs: [
            {
              name: "Dupla Goleiro1+Atacante1",
              goalkeeperId: players[0].profile.id,
              attackerId: players[1].profile.id,
            },
            {
              name: "Dupla Goleiro2+Atacante2",
              goalkeeperId: players[2].profile.id,
              attackerId: players[3].profile.id,
            },
          ],
        },
        owner.auth,
      ),
      ctx({ groupId }),
    );
    expect(createdRes.status).toBe(201);
    const tournament = (await createdRes.json()).tournament;
    expect(tournament.pairs.map((pair: { name: string }) => pair.name)).toEqual([
      "Dupla Goleiro1+Atacante1",
      "Dupla Goleiro2+Atacante2",
    ]);
  });

  it("walks a 4-pair bracket through semifinals, third place, and the final", async () => {
    const { groupId, players } = await setupGroupWithPlayers(8);
    const owner = players[0];

    const createdRes = await createTournament(
      jsonRequest(
        {
          groupId,
          name: "Copa Grande",
          settings: { goalLimit: 1, timeLimitMinutes: 3, goldenGoal: false },
          playerIds: players.map((p) => p.profile.id),
        },
        owner.auth,
      ),
      ctx({ groupId }),
    );
    const tournament = (await createdRes.json()).tournament;
    expect(tournament.pairs).toHaveLength(4);
    expect(tournament.matchups).toHaveLength(3);
    expect(tournament.thirdPlaceMatchup).toBeDefined();

    const semifinals = tournament.matchups.filter((m: { round: number }) => m.round === 1);
    expect(semifinals).toHaveLength(2);

    for (const semifinal of semifinals) {
      const startRes = await startMatchup(
        jsonRequest(undefined, owner.auth),
        ctx({ tournamentId: tournament.id, matchupId: semifinal.id }),
      );
      expect(startRes.status).toBe(201);
      const match = (await startRes.json()).match;
      const goalRes = await registerGoal(
        jsonRequest({ playerId: match.pairA.players[0].playerId }, owner.auth),
        ctx({ matchId: match.id }),
      );
      expect((await goalRes.json()).match.status).toBe("finished");
    }

    const afterSemis = await getTournament(
      getRequest(owner.auth),
      ctx({ tournamentId: tournament.id }),
    );
    const tournamentAfterSemis = (await afterSemis.json()).tournament;
    const final = tournamentAfterSemis.matchups.find((m: { round: number }) => m.round === 2);
    expect(final.pairAId).toBeDefined();
    expect(final.pairBId).toBeDefined();
    expect(tournamentAfterSemis.thirdPlaceMatchup.pairAId).toBeDefined();
    expect(tournamentAfterSemis.thirdPlaceMatchup.pairBId).toBeDefined();

    const finalStartRes = await startMatchup(
      jsonRequest(undefined, owner.auth),
      ctx({ tournamentId: tournament.id, matchupId: final.id }),
    );
    expect(finalStartRes.status).toBe(201);
    const finalMatch = (await finalStartRes.json()).match;
    const finalGoalRes = await registerGoal(
      jsonRequest({ playerId: finalMatch.pairA.players[0].playerId }, owner.auth),
      ctx({ matchId: finalMatch.id }),
    );
    const finishedFinal = (await finalGoalRes.json()).match;
    expect(finishedFinal.status).toBe("finished");

    const thirdPlaceStartRes = await startMatchup(
      jsonRequest(undefined, owner.auth),
      ctx({ tournamentId: tournament.id, matchupId: "third-place" }),
    );
    expect(thirdPlaceStartRes.status).toBe(201);
    const thirdPlaceMatch = (await thirdPlaceStartRes.json()).match;
    const thirdPlaceFinishRes = await registerGoal(
      jsonRequest({ playerId: thirdPlaceMatch.pairA.players[0].playerId }, owner.auth),
      ctx({ matchId: thirdPlaceMatch.id }),
    );
    expect(thirdPlaceFinishRes.status).toBe(200);
    expect((await thirdPlaceFinishRes.json()).match.status).toBe("finished");

    const finalState = await getTournament(
      getRequest(owner.auth),
      ctx({ tournamentId: tournament.id }),
    );
    const finishedTournament = (await finalState.json()).tournament;
    expect(finishedTournament.status).toBe("finished");
    expect(finishedTournament.championPairId).toBe(finishedFinal.winnerPairId);
    expect(finishedTournament.thirdPlaceMatchup.status).toBe("finished");
  });

  it("lists tournaments scoped to the group", async () => {
    const { groupId, players } = await setupGroupWithPlayers(4);
    const owner = players[0];
    await createTournament(
      jsonRequest(
        {
          groupId,
          name: "Copa Listada",
          settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
          playerIds: players.map((p) => p.profile.id),
        },
        owner.auth,
      ),
      ctx({ groupId }),
    );

    const listRes = await listTournaments(getRequest(owner.auth), ctx({ groupId }));
    expect(listRes.status).toBe(200);
    const { tournaments } = await listRes.json();
    expect(tournaments).toHaveLength(1);
    expect(tournaments[0].name).toBe("Copa Listada");
  });

  it("blocks non-members from creating or reading tournaments", async () => {
    const { groupId, players } = await setupGroupWithPlayers(4);
    const outsider = await signupWithProfile("tournament-outsider@example.com", "Outsider");

    const forbiddenCreate = await createTournament(
      jsonRequest(
        {
          groupId,
          name: "Copa Negada",
          settings: { goalLimit: 3, timeLimitMinutes: 3, goldenGoal: true },
          playerIds: players.map((p) => p.profile.id),
        },
        outsider.auth,
      ),
      ctx({ groupId }),
    );
    expect(forbiddenCreate.status).toBe(403);

    const forbiddenList = await listTournaments(getRequest(outsider.auth), ctx({ groupId }));
    expect(forbiddenList.status).toBe(403);
  });
});
