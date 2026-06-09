import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const boosterCount = await prisma.boosterLog.count({ where: { userId: decoded.userId, createdAt: { gte: since } } });
    const logs = await prisma.boosterLog.findMany({ where: { userId: decoded.userId, createdAt: { gte: since } } });

    let biggestRarity = 'COMMUNE';
    const rarityRank: Record<string, number> = { COMMUNE: 1, RARE: 2, LEGENDAIRE: 3 };
    for (const l of logs) {
      const counts = (l.rarityCounts as Record<string, number>) || {};
      for (const r of Object.keys(counts)) {
        if (rarityRank[r] > rarityRank[biggestRarity]) biggestRarity = r;
      }
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    return NextResponse.json({ ok: true, data: { boostersOpened: boosterCount, biggestDrop: biggestRarity, totalRecycles: user?.totalRecycles ?? 0, streakMax: user?.currentStreak ?? 0 } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
