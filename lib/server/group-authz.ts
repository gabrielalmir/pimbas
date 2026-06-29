import type { NextResponse } from "next/server";
import { forbidden } from "./errors";
import type { DatabaseClient } from "./prisma";

export async function findGroupMembership(db: DatabaseClient, groupId: string, userId: string) {
  return db.groupMember.findFirst({ where: { groupId, userId } });
}

type Membership = NonNullable<Awaited<ReturnType<typeof findGroupMembership>>>;

export type GroupAuthzResult = { membership: Membership } | { response: NextResponse };

export async function requireGroupMember(
  db: DatabaseClient,
  groupId: string,
  userId: string,
): Promise<GroupAuthzResult> {
  const membership = await findGroupMembership(db, groupId, userId);
  if (!membership) return { response: forbidden("Group access denied") };
  return { membership };
}

export async function requireGroupAdmin(
  db: DatabaseClient,
  groupId: string,
  userId: string,
): Promise<GroupAuthzResult> {
  const membership = await findGroupMembership(db, groupId, userId);
  if (membership?.role !== "admin") return { response: forbidden("Admin access required") };
  return { membership };
}
