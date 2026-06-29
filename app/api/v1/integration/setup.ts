// Shared test harness for the API integration suites: wires the in-memory DB
// mock into the route handlers and exposes request helpers + route handlers.
import { beforeEach, expect, vi } from "vitest";
import { createDbMock } from "./db-mock";

export let db: ReturnType<typeof createDbMock>;

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

export const { POST: signup } = await import("../auth/signup/route");
export const { POST: login } = await import("../auth/login/route");
export const { POST: refresh } = await import("../auth/refresh/route");
export const { GET: me } = await import("../me/route");
export const { GET: listPlayers } = await import("../players/route");
export const { POST: createProfile } = await import("../players/me/route");
export const { GET: listGroups, POST: createGroup } = await import("../groups/route");
export const { POST: joinGroup } = await import("../groups/join/route");
export const { GET: getGroup, PATCH: patchGroup } = await import("../groups/[groupId]/route");
export const { GET: getInvite } = await import("../groups/[groupId]/invite/route");
export const { GET: listMembers } = await import("../groups/[groupId]/members/route");
export const { DELETE: removeMember } = await import(
  "../groups/[groupId]/members/[memberId]/route"
);
export const { GET: listMatches } = await import("../groups/[groupId]/matches/route");
export const { GET: liveMatch } = await import("../groups/[groupId]/matches/live/route");
export const { GET: ranking } = await import("../groups/[groupId]/ranking/route");
export const { GET: pairStats } = await import("../groups/[groupId]/pair-stats/route");
export const { POST: createMatch } = await import("../matches/route");
export const { POST: registerGoal } = await import("../matches/[matchId]/goals/route");
export const { DELETE: undoGoal } = await import("../matches/[matchId]/goals/[goalId]/route");
export const { GET: listTournaments, POST: createTournament } = await import(
  "../groups/[groupId]/tournaments/route"
);
export const { GET: getTournament } = await import("../tournaments/[tournamentId]/route");
export const { POST: startMatchup } = await import(
  "../tournaments/[tournamentId]/matchups/[matchupId]/start/route"
);

export function jsonRequest(body?: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/test", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function getRequest(headers?: Record<string, string>) {
  return new Request("http://localhost/test", { headers });
}

export function ctx<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export async function signupWithProfile(email: string, name: string) {
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
