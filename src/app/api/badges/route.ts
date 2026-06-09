import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { getUserBadges } from '@/lib/badges';

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

    const badges = await getUserBadges(decoded.userId);
    return NextResponse.json({ badges });
  } catch (error) {
    console.error('Badges error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des badges' }, { status: 500 });
  }
}
