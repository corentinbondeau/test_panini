import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { code } = await params;

    const session = await prisma.tradeSession.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!session) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 404 });
    }

    // Check expiration
    const age = Date.now() - session.createdAt.getTime();
    if (age > 60 * 60 * 1000 && session.status === 'OPEN') {
      await prisma.tradeSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({
        error: 'Code expiré',
        status: 'EXPIRED',
        session: { code: session.code, status: 'EXPIRED' },
      }, { status: 410 });
    }

    return NextResponse.json({
      session: {
        code: session.code,
        cardOfferedId: session.cardOfferedId,
        creatorId: session.creatorId,
        status: session.status,
        createdAt: session.createdAt,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Get trade session error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la session' },
      { status: 500 }
    );
  }
}
