import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import { PrismaClient } from "../generated/prisma/client";

// Seed de desenvolvimento. Cria usuarios cadastrados com senha, fichas de jogador, um grupo com membros e
// uma partida amistosa ja finalizada para o ranking aparecer com dados reais.
// Idempotente: usa upsert por e-mail e recria membros/partidas do grupo seed.

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new (
  PrismaClient as unknown as new (
    options: object,
  ) => InstanceType<typeof PrismaClient>
)({
  adapter: new PrismaPg({ connectionString }),
});

const SEED_PASSWORD = "pimbas123";
const GROUP_INVITE_CODE = "PIMBAS01";

const seedPlayers = [
  {
    email: "ze.trovao@pimbas.local",
    name: "Zé Trovão",
    initials: "ZT",
    shirtNumber: 10,
    favoritePosition: "attacker",
    style: "Canhota pesada",
    admin: true,
  },
  {
    email: "magrao@pimbas.local",
    name: "Magrão",
    initials: "MG",
    shirtNumber: 7,
    favoritePosition: "goalkeeper",
    style: "Muralha",
    admin: false,
  },
  {
    email: "biscoito@pimbas.local",
    name: "Biscoito",
    initials: "BS",
    shirtNumber: 99,
    favoritePosition: "attacker",
    style: "Finalizador",
    admin: false,
  },
  {
    email: "russo@pimbas.local",
    name: "Russo",
    initials: "RU",
    shirtNumber: 8,
    favoritePosition: "goalkeeper",
    style: "Seguro",
    admin: false,
  },
];

async function main() {
  const passwordHash = await argon2.hash(SEED_PASSWORD, {
    type: argon2.argon2id,
  });

  const profiles = [];
  for (const player of seedPlayers) {
    const user = await prisma.user.upsert({
      where: { email: player.email },
      update: { name: player.name, passwordHash },
      create: { email: player.email, name: player.name, passwordHash },
    });
    const profile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: { displayName: player.name, initials: player.initials },
      create: {
        userId: user.id,
        displayName: player.name,
        initials: player.initials,
        shirtNumber: player.shirtNumber,
        favoritePosition: player.favoritePosition,
        style: player.style,
        nationality: "BRA",
        bio: "Jogador do grupo de exemplo.",
        isAnonymous: false,
      },
    });
    profiles.push({ ...player, userId: user.id, profileId: profile.id });
  }

  // Recria o grupo seed do zero para manter o estado deterministico.
  const existing = await prisma.group.findUnique({
    where: { inviteCode: GROUP_INVITE_CODE },
  });
  if (existing) {
    const matches = await prisma.match.findMany({
      where: { groupId: existing.id },
      include: { pairs: true },
    });
    for (const match of matches) {
      await prisma.goal.deleteMany({ where: { matchId: match.id } });
      for (const pair of match.pairs)
        await prisma.pairPlayer.deleteMany({ where: { matchPairId: pair.id } });
      await prisma.matchPair.deleteMany({ where: { matchId: match.id } });
    }
    await prisma.match.deleteMany({ where: { groupId: existing.id } });
    await prisma.tournament.deleteMany({ where: { groupId: existing.id } });
    await prisma.groupMember.deleteMany({ where: { groupId: existing.id } });
    await prisma.group.delete({ where: { id: existing.id } });
  }

  const defaultMatchSettings = {
    goalLimit: 3,
    timeLimitMinutes: 3,
    goldenGoal: true,
  };
  const group = await prisma.group.create({
    data: {
      name: "Pimbas do Trampo",
      description: "Liga de pimbolim do almoço",
      inviteCode: GROUP_INVITE_CODE,
      defaultMatchSettings,
      members: {
        create: profiles.map((player) => ({
          playerId: player.profileId,
          userId: player.userId,
          role: player.admin ? "admin" : "member",
        })),
      },
    },
  });

  const [zt, mg, bs, ru] = profiles;
  const now = Date.now();
  // Partida amistosa finalizada 3x1 (dupla A vence): da dados ao ranking real.
  const match = await prisma.match.create({
    data: {
      groupId: group.id,
      kind: "friendly",
      status: "finished",
      settings: defaultMatchSettings,
      startedAt: new Date(now - 600_000),
      finishedAt: new Date(now - 360_000),
      pairs: {
        create: [
          {
            slot: "A",
            name: "Os Cafofo",
            players: {
              create: [
                { playerId: mg.profileId, position: "goalkeeper" },
                { playerId: zt.profileId, position: "attacker" },
              ],
            },
          },
          {
            slot: "B",
            name: "Os Perna",
            players: {
              create: [
                { playerId: ru.profileId, position: "goalkeeper" },
                { playerId: bs.profileId, position: "attacker" },
              ],
            },
          },
        ],
      },
    },
    include: { pairs: true },
  });
  const pairA = match.pairs.find((pair) => pair.slot === "A");
  const pairB = match.pairs.find((pair) => pair.slot === "B");
  if (!pairA || !pairB) {
    throw new Error("Seed match must include pairs for slots A and B");
  }
  await prisma.goal.createMany({
    data: [
      {
        matchId: match.id,
        matchPairId: pairA.id,
        playerId: zt.profileId,
        position: "attacker",
        scoredAt: new Date(now - 540_000),
      },
      {
        matchId: match.id,
        matchPairId: pairB.id,
        playerId: bs.profileId,
        position: "attacker",
        scoredAt: new Date(now - 510_000),
      },
      {
        matchId: match.id,
        matchPairId: pairA.id,
        playerId: mg.profileId,
        position: "goalkeeper",
        scoredAt: new Date(now - 480_000),
      },
      {
        matchId: match.id,
        matchPairId: pairA.id,
        playerId: zt.profileId,
        position: "attacker",
        scoredAt: new Date(now - 450_000),
      },
    ],
  });
  await prisma.match.update({
    where: { id: match.id },
    data: { winnerPairId: pairA.id },
  });

  console.log(`Seed pronto. Grupo "${group.name}" (convite ${GROUP_INVITE_CODE}).`);
  console.log(`Usuarios seed prontos: ${seedPlayers.map((player) => player.email).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
