import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Check if already in a clan
    const existing = await prisma.clanMember.findFirst({ where: { userId: decoded.userId } });
    if (existing) {
      return NextResponse.json({ error: 'Vous êtes déjà dans un clan' }, { status: 400 });
    }

    // Check clan exists and has room
    const clan = await prisma.clan.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });

    if (!clan) {
      return NextResponse.json({ error: 'Clan introuvable' }, { status: 404 });
    }

    if (clan._count.members >= clan.maxMembers) {
      return NextResponse.json({ error: 'Ce clan est complet (20/20)' }, { status: 400 });
    }

    await prisma.clanMember.create({
      data: { clanId: id, userId: decoded.userId, role: 'member' },
    });

    return NextResponse.json({ success: true, clanId: id });
  } catch (error) {
    console.error('Join clan error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
