import { prisma } from '@/lib/prisma';

export type StreakResult = {
  currentStreak: number;
  lastLoginDate: Date | null;
  reward: string | null;
};

export async function checkAndUpdateStreak(userId: string): Promise<StreakResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, lastLoginDate: true },
  });

  if (!user) {
    return { currentStreak: 0, lastLoginDate: null, reward: null };
  }

  const now = new Date();
  const lastDate = user.lastLoginDate;
  let newStreak = user.currentStreak;
  let reward: string | null = null;

  if (!lastDate) {
    newStreak = 1;
  } else {
    const diffMs = now.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, no change
      return {
        currentStreak: user.currentStreak,
        lastLoginDate: lastDate,
        reward: null,
      };
    } else if (diffDays === 1) {
      newStreak = user.currentStreak + 1;
    } else {
      newStreak = 1;
    }
  }

  // Reward every 7 days
  if (newStreak > 0 && newStreak % 7 === 0) {
    reward = 'premium_booster';
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      lastLoginDate: now,
    },
  });

  return { currentStreak: newStreak, lastLoginDate: now, reward };
}

export async function getStreak(userId: string): Promise<StreakResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, lastLoginDate: true },
  });

  return {
    currentStreak: user?.currentStreak ?? 0,
    lastLoginDate: user?.lastLoginDate ?? null,
    reward: null,
  };
}
