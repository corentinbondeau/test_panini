import { ObjectId } from 'bson';
import { prisma } from '@/lib/prisma';
import { BADGE_DEFINITIONS } from '@/data/badges';
import { updateQuestProgress } from '@/lib/quests';

export type ActionType = 'OPEN_BOOSTER' | 'FUSE_CARD' | 'RECYCLE_CARD' | 'BUY_MARKETPLACE' | 'TRADE_CARD' | 'MARKET_PURCHASE';

type ActionMapping = {
  statField: keyof UserStatSelect | null;
  questType: string | null;
};

type UserStatSelect = {
  totalBoostersOpened: true;
  totalRecycles: true;
  totalLegendaries: true;
  totalCardsObtained: true;
  totalTrades: true;
  totalFusionsDone: true;
  totalMarketPurchases: true;
};

const ACTION_MAP: Record<ActionType, ActionMapping> = {
  OPEN_BOOSTER: { statField: 'totalBoostersOpened', questType: 'booster_count' },
  FUSE_CARD: { statField: 'totalFusionsDone', questType: null },
  RECYCLE_CARD: { statField: 'totalRecycles', questType: 'recycle_count' },
  BUY_MARKETPLACE: { statField: 'totalCardsObtained', questType: null },
  TRADE_CARD: { statField: 'totalTrades', questType: 'trade_count' },
  MARKET_PURCHASE: { statField: 'totalMarketPurchases', questType: null },
};

const STAT_SELECT: UserStatSelect = {
  totalBoostersOpened: true,
  totalRecycles: true,
  totalLegendaries: true,
  totalCardsObtained: true,
  totalTrades: true,
  totalFusionsDone: true,
  totalMarketPurchases: true,
};

/**
 * Centralised progress tracker.
 *
 * 1. Converts `userId` to a BSON ObjectId (equivalent to `mongoose.Types.ObjectId`).
 * 2. Atomically increments the matching lifetime stat via a raw MongoDB `$inc`.
 * 3. Fetches the full stat snapshot and evaluates every badge condition.
 * 4. Persists any newly unlocked badges.
 * 5. Fires-and-forgets quest progress for the action type.
 *
 * Returns the array of newly unlocked badge IDs.
 */
export async function trackUserActivity(
  userId: string,
  actionType: ActionType,
  incrementValue: number,
): Promise<string[]> {
  const mapping = ACTION_MAP[actionType];
  if (!mapping) return [];

  const userObjectId = new ObjectId(userId);

  // 1. Atomically increment the lifetime stat via raw MongoDB $inc
  if (mapping.statField) {
    await prisma.$runCommandRaw({
      update: 'User',
      updates: [
        {
          q: { _id: userObjectId },
          u: { $inc: { [mapping.statField]: incrementValue } },
        },
      ],
    });
  }

  // 2. Fetch full stat snapshot
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...STAT_SELECT, badges: true },
  });

  if (!user) return [];

  const stats = {
    totalBoostersOpened: user.totalBoostersOpened,
    totalRecycles: user.totalRecycles,
    totalLegendaries: user.totalLegendaries,
    totalCardsObtained: user.totalCardsObtained,
    totalTrades: user.totalTrades,
    totalFusionsDone: user.totalFusionsDone,
    totalMarketPurchases: user.totalMarketPurchases,
    currentStreak: 0,
  };

  // 3. Evaluate badge conditions
  const existingBadges = new Set<string>((user.badges as string[]) ?? []);
  const newlyUnlocked: string[] = [];

  for (const def of BADGE_DEFINITIONS) {
    if (!existingBadges.has(def.id) && def.condition(stats)) {
      newlyUnlocked.push(def.id);
    }
  }

  // 4. Persist new badges
  if (newlyUnlocked.length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { badges: [...existingBadges, ...newlyUnlocked] },
    });
  }

  // 5. Fire-and-forget quest progress
  if (mapping.questType) {
    updateQuestProgress(userId, mapping.questType, incrementValue).catch((e) =>
      console.error('[tracking] quest error:', e),
    );
  }

  return newlyUnlocked;
}
