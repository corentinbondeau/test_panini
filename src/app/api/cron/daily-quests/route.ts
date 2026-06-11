import { NextResponse } from 'next/server';
import { ObjectId } from 'bson';
import { prisma } from '@/lib/prisma';
import { FALLBACK_QUESTS } from '@/data/fallbackQuests';

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export async function GET() {
  try {
    const pool = await prisma.questPool.findMany();
    const dateKey = formatDateKey(new Date());

    let questTemplates: Array<{
      questId: string;
      description: string;
      type: string;
      target: number;
    }>;

    if (!pool || pool.length === 0) {
      // Fallback codé en dur si la collection QuestPool est inaccessible
      questTemplates = FALLBACK_QUESTS.map((fq) => ({
        questId: fq.id,
        description: fq.description,
        type: fq.type,
        target: fq.target,
      }));
    } else {
      questTemplates = pool.map((q) => ({
        questId: `${q.key}_${dateKey}`,
        description: q.description,
        type: q.type,
        target: q.target,
      }));
    }

    // Mélanger et prendre exactement 5 quêtes
    const shuffled = questTemplates.sort(() => 0.5 - Math.random()).slice(0, 5);

    const dailyQuests = shuffled.map((q) => ({
      questId: q.questId,
      description: q.description,
      type: q.type,
      target: q.target,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    }));

    const users = await prisma.user.findMany({ select: { id: true } });

    for (const u of users) {
      const userObjectId = new ObjectId(u.id);

      // $set atomique — remplace intégralement le champ dailyQuests
      // par un tableau contenant strictement 5 quêtes
      await prisma.$runCommandRaw({
        update: 'User',
        updates: [
          {
            q: { _id: userObjectId },
            u: { $set: { dailyQuests } },
          },
        ],
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Daily quests reset — ${dailyQuests.length} quests assigned to ${users.length} users via $set`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
