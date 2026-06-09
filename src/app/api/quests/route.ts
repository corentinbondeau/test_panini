import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { getUserQuests } from '@/lib/quests';

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

    const { searchParams } = new URL(request.url);
    const collectionSlug = searchParams.get('collectionId') || undefined;

    const quests = await getUserQuests(decoded.userId, collectionSlug);

    return NextResponse.json({ quests });
  } catch (error) {
    console.error('Quests error:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des quêtes' }, { status: 500 });
  }
}
