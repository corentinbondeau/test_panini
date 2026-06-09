import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { checkAndUpdateStreak, getStreak } from '@/lib/streak';

export const dynamic = 'force-dynamic';

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

    const streak = await getStreak(decoded.userId);
    return NextResponse.json(streak);
  } catch (error) {
    console.error('Streak error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération de la streak' }, { status: 500 });
  }
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

    const result = await checkAndUpdateStreak(decoded.userId);

    // If reward, auto-credit a premium booster (just log it for now)
    if (result.reward) {
      console.log(`User ${decoded.userId} earned streak reward: ${result.reward}`);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Streak update error:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la streak' }, { status: 500 });
  }
}
