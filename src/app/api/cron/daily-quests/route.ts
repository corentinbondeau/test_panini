import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function formatDateKey(d: Date) {
  return d.toISOString().slice(0,10).replace(/-/g,'');
}

export async function GET() {
  try {
    const pool = await prisma.questPool.findMany();
    if (!pool || pool.length === 0) return NextResponse.json({ ok: false, message: 'No quest pool' }, { status: 500 });

    const users = await prisma.user.findMany({ select: { id: true } });
    const dateKey = formatDateKey(new Date());

    for (const u of users) {
      // pick 5 random distinct quests
      const shuffled = pool.sort(() => 0.5 - Math.random()).slice(0,5);
      for (const q of shuffled) {
        const questId = `${q.id}_${dateKey}`;
        // create if not exists
        await prisma.userQuest.upsert({
          where: { userId_questId: { userId: u.id, questId } },
          update: {},
          create: {
            userId: u.id,
            questId,
            progress: 0,
            target: q.target,
            completed: false,
            rewardClaimed: false
          }
        });
      }
    }

    return NextResponse.json({ ok: true, message: 'Daily quests distributed' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
