import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken, getTokenFromHeader } from '../../../../src/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || undefined;
    const token = getTokenFromHeader(auth);
    const decoded = token ? verifyToken(token) : null;
    if (!decoded) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { userQuestId } = body;
    if (!userQuestId) return NextResponse.json({ ok: false, error: 'Missing userQuestId' }, { status: 400 });

    const uq = await prisma.userQuest.findUnique({ where: { id: userQuestId } });
    if (!uq) return NextResponse.json({ ok: false, error: 'Quest not found' }, { status: 404 });
    if (uq.userId !== decoded.userId) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    if (!uq.completed) return NextResponse.json({ ok: false, error: 'Quest not completed' }, { status: 400 });
    if (uq.rewardClaimed) return NextResponse.json({ ok: false, error: 'Reward already claimed' }, { status: 400 });

    // award 5 tokens
    await prisma.user.update({ where: { id: decoded.userId }, data: { tokens: { increment: 5 } } });

    await prisma.userQuest.update({ where: { id: userQuestId }, data: { rewardClaimed: true } });

    return NextResponse.json({ ok: true, message: 'Reward claimed', reward: { tokens: 5 } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { claimQuestReward } from '@/lib/quests';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const body = await request.json();
    const { questId } = body;

    if (!questId) {
      return NextResponse.json({ error: 'questId requis' }, { status: 400 });
    }

    const result = await claimQuestReward(decoded.userId, questId);

    // Add weekly XP to clan for quest completion
    const clanMember = await prisma.clanMember.findFirst({ where: { userId: decoded.userId } });
    if (clanMember) {
      await prisma.clan.update({
        where: { id: clanMember.clanId },
        data: { weeklyXP: { increment: 10 } },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la réclamation';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
