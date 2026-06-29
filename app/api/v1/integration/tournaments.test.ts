import { describe, expect, it } from "vitest";
import {
  createGroup,
  createTournament,
  ctx,
  getInvite,
  getRequest,
  getTournament,
  joinGroup,
  jsonRequest,
  listTournaments,
  registerGoal,
  signupWithProfile,
  startMatchup,
} from "./setup";

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
    expect(updatedTournament.championPairId).toBe(finalMatchup.pairAId);
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
    expect(finishedTournament.championPairId).toBe(final.pairAId);
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
