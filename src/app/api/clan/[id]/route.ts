import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const clan = await prisma.clan.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true, requests: { where: { status: 'open' } } } },
      },
    });

    if (!clan) {
      return NextResponse.json({ error: 'Clan introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      ...clan,
      memberCount: clan._count.members,
      openRequestsCount: clan._count.requests,
      _count: undefined,
    });
  } catch (error) {
    console.error('Clan detail error:', error);
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
