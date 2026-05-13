import { prisma } from "@/lib/prisma";

export const MAX_BOOSTERS_PER_DAY = 25;
export const MAX_TRADES_PER_DAY = 5;

export async function checkAndResetQuota(userId: string): Promise<{
  boostersOpenedToday: number;
  tradesMadeToday: number;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { boostersOpenedToday: 0, tradesMadeToday: 0 };
  }

  const today = new Date();
  const lastReset = user.lastResetDate;

  const isSameDay =
    lastReset &&
    lastReset.getFullYear() === today.getFullYear() &&
    lastReset.getMonth() === today.getMonth() &&
    lastReset.getDate() === today.getDate();

  if (!isSameDay) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        boostersOpenedToday: 0,
        tradesMadeToday: 0,
        lastResetDate: today,
      },
    });
    return { boostersOpenedToday: 0, tradesMadeToday: 0 };
  }

  return {
    boostersOpenedToday: user.boostersOpenedToday,
    tradesMadeToday: user.tradesMadeToday,
  };
}

export async function incrementBoosterCount(userId: string): Promise<number> {
  const { boostersOpenedToday } = await checkAndResetQuota(userId);
  const newCount = boostersOpenedToday + 1;
  await prisma.user.update({
    where: { id: userId },
    data: { boostersOpenedToday: newCount },
  });
  return newCount;
}

export async function incrementTradeCount(userId: string): Promise<number> {
  const { tradesMadeToday } = await checkAndResetQuota(userId);
  const newCount = tradesMadeToday + 1;
  await prisma.user.update({
    where: { id: userId },
    data: { tradesMadeToday: newCount },
  });
  return newCount;
}

export async function getCollectionObjectId(slug: string): Promise<string | null> {
  const collection = await prisma.collection.findUnique({ where: { slug } });
  return collection ? collection.id : null;
}
