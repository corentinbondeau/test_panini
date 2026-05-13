import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { checkAndResetQuota, MAX_TRADES_PER_DAY } from '@/lib/quota';

export const dynamic = 'force-dynamic';

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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

    const { cardOfferedId } = await request.json();
    if (!cardOfferedId) {
      return NextResponse.json({ error: 'cardOfferedId requis' }, { status: 400 });
    }

    const quota = await checkAndResetQuota(decoded.userId);
    if (quota.tradesMadeToday >= MAX_TRADES_PER_DAY) {
      return NextResponse.json(
        { error: 'Limite quotidienne d\'échanges atteinte (5/jour)' },
        { status: 429 }
      );
    }

    // Clean up expired sessions
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.tradeSession.updateMany({
      where: { status: 'OPEN', createdAt: { lt: oneHourAgo } },
      data: { status: 'EXPIRED' },
    });

    // Generate unique code
    let code: string;
    let existing = true;
    do {
      code = generateSessionCode();
      existing = !!(await prisma.tradeSession.findUnique({ where: { code } }));
    } while (existing);

    const session = await prisma.tradeSession.create({
      data: {
        code,
        creatorId: decoded.userId,
        cardOfferedId,
        status: 'OPEN',
      },
    });

    return NextResponse.json(
      { code: session.code, id: session.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create trade session error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session' },
      { status: 500 }
    );
  }
}
