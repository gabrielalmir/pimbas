import { apiFetch } from "./auth";
import type { Group, PlayerProfile } from "./domain";

export interface CreatePlayerProfileInput {
  displayName: string;
  initials: string;
  shirtNumber: number;
  favoritePosition: "goalkeeper" | "attacker" | "versatile";
  style: string;
  nationality: string;
  bio: string;
}

export async function createPlayerProfile(input: CreatePlayerProfileInput): Promise<PlayerProfile> {
  return (
    await apiFetch<{ playerProfile: PlayerProfile }>("/api/v1/players/me", {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).playerProfile;
}

export async function createGroup(input: { name: string; description: string }): Promise<Group> {
  return (
    await apiFetch<{ group: Group }>("/api/v1/groups", {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).group;
}

export async function joinGroup(inviteCode: string): Promise<Group> {
  return (
    await apiFetch<{ group: Group }>("/api/v1/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    })
  ).group;
}

export async function updateGroup(
  groupId: string,
  patch: Partial<Pick<Group, "name" | "description" | "defaultMatchSettings">>,
): Promise<Group> {
  return (
    await apiFetch<{ group: Group }>(`/api/v1/groups/${groupId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    })
  ).group;
}
