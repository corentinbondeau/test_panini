import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

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

    const { endpoint } = await request.json();

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: decoded.userId, endpoint },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { userId: decoded.userId },
      });
    }

    return NextResponse.json({ message: 'Désabonnement réussi' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: "Erreur lors du désabonnement" }, { status: 500 });
  }
}

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

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: decoded.userId },
      select: { id: true, endpoint: true, createdAt: true },
    });

    return NextResponse.json({ subscribed: subs.length > 0, subscriptions: subs });
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
