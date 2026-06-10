import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { getUserBadgeIds } from '@/lib/badges';
import { BADGE_DEFINITIONS } from '@/data/badges';

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

    const unlockedIds = await getUserBadgeIds(decoded.userId);
    const unlockedSet = new Set(unlockedIds);

    const allBadges = BADGE_DEFINITIONS.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      unlocked: unlockedSet.has(b.id),
    }));

    return NextResponse.json({ badges: allBadges });
  } catch (error) {
    console.error('Badges error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des badges' }, { status: 500 });
  }
}
