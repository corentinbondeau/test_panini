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

    const requester = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { name, rarity, number, collectionSlug, imageUrl, category, firstName, lastName } = body;

    if (!name || !rarity || number === undefined || !collectionSlug) {
      return NextResponse.json(
        { error: 'Les champs name, rarity, number et collectionSlug sont requis' },
        { status: 400 }
      );
    }

    const validRarities = ['COMMUNE', 'RARE', 'LEGENDAIRE'];
    if (!validRarities.includes(rarity)) {
      return NextResponse.json({ error: 'Rareté invalide' }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({ where: { slug: collectionSlug } });
    if (!collection) {
      return NextResponse.json({ error: 'Collection introuvable' }, { status: 404 });
    }

    const parsedNumber = parseInt(number, 10);
    if (isNaN(parsedNumber)) {
      return NextResponse.json({ error: 'Numéro invalide' }, { status: 400 });
    }

    const card = await prisma.customCard.create({
      data: {
        name,
        rarity,
        number: parsedNumber,
        collectionSlug,
        imageUrl: imageUrl || null,
        category: category || 'Custom',
        firstName: firstName || name.split(' ')[0] || name,
        lastName: lastName || name.split(' ').slice(1).join(' ') || '',
        createdBy: decoded.userId,
      },
    });

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    console.error('Admin create card error:', error);
    return NextResponse.json({ error: "Erreur lors de la création de la carte" }, { status: 500 });
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

    const requester = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const cards = await prisma.customCard.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error('Admin get cards error:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des cartes' }, { status: 500 });
  }
}
