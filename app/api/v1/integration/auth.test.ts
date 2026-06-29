import { describe, expect, it } from "vitest";
import {
  createGroup,
  createMatch,
  ctx,
  getInvite,
  getRequest,
  joinGroup,
  jsonRequest,
  listMatches,
  listPlayers,
  liveMatch,
  login,
  me,
  pairStats,
  ranking,
  refresh,
  registerGoal,
  signup,
  signupWithProfile,
  undoGoal,
} from "./setup";

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
