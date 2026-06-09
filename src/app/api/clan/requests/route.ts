import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Create a donation request */
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
    const { cardIdRequested } = body;

    if (!cardIdRequested) {
      return NextResponse.json({ error: 'ID de carte requis' }, { status: 400 });
    }

    // Find user's clan
    const membership = await prisma.clanMember.findFirst({
      where: { userId: decoded.userId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Vous devez être dans un clan' }, { status: 400 });
    }

    // Check for existing open request for same card
    const existing = await prisma.clanRequest.findFirst({
      where: { clanId: membership.clanId, userId: decoded.userId, cardIdRequested, status: 'open' },
    });

    if (existing) {
      return NextResponse.json({ error: 'Vous avez déjà une demande ouverte pour cette carte' }, { status: 400 });
    }

    const request_ = await prisma.clanRequest.create({
      data: {
        clanId: membership.clanId,
        userId: decoded.userId,
        cardIdRequested,
      },
    });

    return NextResponse.json({ request: request_ }, { status: 201 });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}

/** Get open requests for current user's clan */
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const membership = await prisma.clanMember.findFirst({
      where: { userId: decoded.userId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Vous devez être dans un clan' }, { status: 400 });
    }

    const requests = await prisma.clanRequest.findMany({
      where: { clanId: membership.clanId, status: 'open' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
