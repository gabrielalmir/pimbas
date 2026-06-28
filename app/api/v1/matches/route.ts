import { NextResponse } from "next/server";
import { createFriendlyInputSchema } from "@/domain";
import { requireAuth } from "@/lib/server/auth";
import { forbidden, validationError } from "@/lib/server/errors";
import { withDbUser } from "@/lib/server/prisma";
import { matchInclude, serializeMatch } from "./serialize";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("response" in auth) return auth.response;
  const parsed = createFriendlyInputSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return validationError(parsed.error);
  const input = parsed.data;

  return withDbUser(auth.authUser.id, async (db) => {
    const membership = await db.groupMember.findFirst({
      where: { groupId: input.groupId, userId: auth.authUser.id },
    });
    if (!membership) return forbidden("Group access denied");

    const members = await db.groupMember.findMany({
      where: { groupId: input.groupId },
    });
    const memberIds = new Set(members.map((member: { playerId: string }) => member.playerId));
    const selected = [
      input.pairAGoalkeeperId,
      input.pairAAttackerId,
      input.pairBGoalkeeperId,
      input.pairBAttackerId,
    ];
    if (new Set(selected).size !== 4 || selected.some((playerId) => !memberIds.has(playerId))) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "Friendly matches require four distinct group members",
        },
        { status: 400 },
      );
    }

    const match = await db.match.create({
      data: {
        groupId: input.groupId,
        kind: "friendly",
        status: "live",
        settings: input.settings,
        startedAt: new Date(),
        pairs: {
          create: [
            {
              slot: "A",
              name: input.pairAName,
              players: {
                create: [
                  { playerId: input.pairAGoalkeeperId, position: "goalkeeper" },
                  { playerId: input.pairAAttackerId, position: "attacker" },
                ],
              },
            },
            {
              slot: "B",
              name: input.pairBName,
              players: {
                create: [
                  { playerId: input.pairBGoalkeeperId, position: "goalkeeper" },
                  { playerId: input.pairBAttackerId, position: "attacker" },
                ],
              },
            },
          ],
        },
      },
      include: matchInclude,
    });
    return NextResponse.json({ match: serializeMatch(match) }, { status: 201 });
  });
}
