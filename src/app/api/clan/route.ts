import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Create a new clan */
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
    const { name, description, avatar } = body;

    if (!name || name.trim().length < 3) {
      return NextResponse.json({ error: 'Le nom doit contenir au moins 3 caractères' }, { status: 400 });
    }

    // Check if user is already in a clan
    const existing = await prisma.clanMember.findFirst({ where: { userId: decoded.userId } });
    if (existing) {
      return NextResponse.json({ error: 'Vous êtes déjà dans un clan' }, { status: 400 });
    }

    const clan = await prisma.clan.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        avatar: avatar || null,
        members: {
          create: {
            userId: decoded.userId,
            role: 'leader',
          },
        },
      },
    });

    return NextResponse.json({ clan }, { status: 201 });
  } catch (error) {
    console.error('Create clan error:', error);
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Ce nom de clan est déjà pris' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erreur lors de la création du clan' }, { status: 500 });
  }
}
