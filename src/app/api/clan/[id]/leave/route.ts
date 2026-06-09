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

    const membership = await prisma.clanMember.findUnique({
      where: { clanId_userId: { clanId: id, userId: decoded.userId } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Vous ne faites pas partie de ce clan' }, { status: 400 });
    }

    // If leader, transfer leadership or delete clan
    if (membership.role === 'leader') {
      const otherMember = await prisma.clanMember.findFirst({
        where: { clanId: id, userId: { not: decoded.userId } },
        orderBy: { joinedAt: 'asc' },
      });

      if (otherMember) {
        await prisma.clanMember.update({
          where: { id: otherMember.id },
          data: { role: 'leader' },
        });
      } else {
        // Delete clan if no members left
        await prisma.clan.delete({ where: { id } });
        return NextResponse.json({ success: true, clanDeleted: true });
      }
    }

    await prisma.clanMember.delete({ where: { id: membership.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave clan error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
