import { prisma } from '@/lib/prisma';

export async function getUserClan(userId: string) {
  const membership = await prisma.clanMember.findUnique({
    where: { clanId_userId: { clanId: '', userId } },
  });

  if (!membership) {
    // Try with proper relation query
    const member = await prisma.clanMember.findFirst({
      where: { userId },
      include: { clan: true },
    });
    return member
      ? { membership: member, clan: member.clan }
      : null;
  }

  const clan = await prisma.clan.findUnique({ where: { id: membership.clanId } });
  return clan ? { membership, clan } : null;
}

export async function addWeeklyXP(clanId: string, amount: number) {
  await prisma.clan.update({
    where: { id: clanId },
    data: { weeklyXP: { increment: amount } },
  });
}

export async function getMemberCount(clanId: string): Promise<number> {
  return prisma.clanMember.count({ where: { clanId } });
}

export const CHEST_REWARD_LEVELS = [
  { xpRequired: 0, tokens: 10, description: 'Palier 1 : 10 tokens' },
  { xpRequired: 50, tokens: 25, description: 'Palier 2 : 25 tokens' },
  { xpRequired: 150, tokens: 50, description: 'Palier 3 : 50 tokens' },
  { xpRequired: 300, tokens: 100, description: 'Palier 4 : 100 tokens' },
  { xpRequired: 500, tokens: 200, description: 'Palier 5 : 200 tokens' },
];

export function getChestReward(weeklyXP: number): number {
  let best = 0;
  for (const level of CHEST_REWARD_LEVELS) {
    if (weeklyXP >= level.xpRequired) {
      best = level.tokens;
    }
  }
  return best;
}
