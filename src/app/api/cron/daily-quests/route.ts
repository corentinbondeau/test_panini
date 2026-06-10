import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export async function GET() {
  try {
    const pool = await prisma.questPool.findMany();
    if (!pool || pool.length === 0) {
      return NextResponse.json({ ok: false, message: 'No quest pool' }, { status: 500 });
    }

    const users = await prisma.user.findMany({ select: { id: true } });
    const dateKey = formatDateKey(new Date());

    for (const u of users) {
      // 1. Delete ALL old daily quests (those with a _YYYYMMDD suffix) for this user
      const allUserQuests = await prisma.userQuest.findMany({
        where: { userId: u.id },
        select: { id: true, questId: true },
      });

      const oldDailyIds = allUserQuests
        .filter((q) => q.questId.includes('_') && q.questId.split('_').pop()?.length === 8)
        .map((q) => q.id);

      if (oldDailyIds.length > 0) {
        await prisma.userQuest.deleteMany({
          where: { id: { in: oldDailyIds } },
        });
      }

      // 2. Pick exactly 5 random quests from the pool
      const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 5);

      // 3. Insert the 5 new daily quests
      for (const q of shuffled) {
        await prisma.userQuest.create({
          data: {
            userId: u.id,
            questId: `${q.id}_${dateKey}`,
            progress: 0,
            target: q.target,
            completed: false,
            rewardClaimed: false,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, message: 'Daily quests reset and distributed' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
