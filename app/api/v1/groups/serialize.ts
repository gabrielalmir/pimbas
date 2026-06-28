import { randomBytes } from "node:crypto";
import type { DatabaseClient } from "@/lib/server/prisma";

type GroupMemberRow = { id: string; playerId: string; role: string };
type SerializeGroupOptions = {
  includeInviteCode?: boolean;
};

export async function serializeGroup(
  db: DatabaseClient,
  group: Record<string, unknown>,
  options: SerializeGroupOptions = {},
) {
  const members = await db.groupMember.findMany({
    where: { groupId: group.id as string },
    orderBy: { id: "asc" },
  });
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    logoUrl: group.logoUrl ?? undefined,
    logoPresetId: group.logoPresetId ?? undefined,
    inviteCode: options.includeInviteCode ? (group.inviteCode as string) : undefined,
    defaultMatchSettings: group.defaultMatchSettings,
    memberIds: members.map((member: GroupMemberRow) => member.playerId),
    adminPlayerIds: members
      .filter((member: GroupMemberRow) => member.role === "admin")
      .map((member: GroupMemberRow) => member.playerId),
  };
}

export async function generateInviteCode(db: DatabaseClient) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = randomBytes(4).toString("hex").toUpperCase();
    const existing = await db.group.findUnique({ where: { inviteCode } });
    if (!existing) return inviteCode;
  }
  throw new Error("Unable to generate unique invite code");
}
