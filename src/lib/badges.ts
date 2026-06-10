import { prisma } from '@/lib/prisma';
import { BADGE_DEFINITIONS, UserStats } from '@/data/badges';

export async function checkAndUnlockBadges(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      totalBoostersOpened: true,
      totalRecycles: true,
      totalLegendaries: true,
      totalCardsObtained: true,
      totalTrades: true,
      badges: true,
    },
  });

  if (!user) return [];

  const existingBadges = new Set((user.badges as string[]) || []);
  const stats: UserStats = {
    totalBoostersOpened: user.totalBoostersOpened,
    totalRecycles: user.totalRecycles,
    totalLegendaries: user.totalLegendaries,
    totalCardsObtained: user.totalCardsObtained,
    currentStreak: user.currentStreak,
    totalTrades: user.totalTrades,
  };

  const newlyUnlocked: string[] = [];

  for (const def of BADGE_DEFINITIONS) {
    if (!existingBadges.has(def.id) && def.condition(stats)) {
      newlyUnlocked.push(def.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    const updatedBadges = [...existingBadges, ...newlyUnlocked];
    await prisma.user.update({
      where: { id: userId },
      data: { badges: updatedBadges },
    });
  }

  return newlyUnlocked;
}

export async function getUserBadges(userId: string): Promise<{ id: string; name: string; description: string; icon: string }[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { badges: true },
  });

  const userBadgeIds = new Set((user?.badges as string[]) || []);
  return BADGE_DEFINITIONS
    .filter((b) => userBadgeIds.has(b.id))
    .map((b) => ({ id: b.id, name: b.name, description: b.description, icon: b.icon }));
}

export async function getUserBadgeIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { badges: true },
  });
  return (user?.badges as string[]) || [];
}
