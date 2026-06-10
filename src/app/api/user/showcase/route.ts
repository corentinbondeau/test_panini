import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';
import { CLUB_CARDS } from '@/data/clubCards';

export async function PUT(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const body = await req.json();
    let { cardIds } = body;

    if (!Array.isArray(cardIds)) {
      return NextResponse.json({ error: 'cardIds doit être un tableau' }, { status: 400 });
    }

    // Max 5 cards
    cardIds = cardIds.slice(0, 5);

    // Validate each cardId exists in the club cards
    for (const cardId of cardIds) {
      const card = CLUB_CARDS.find((c) => c.id === cardId);
      if (!card) {
        return NextResponse.json({ error: `Carte introuvable: ${cardId}` }, { status: 400 });
      }
    }

    // Ensure the user actually owns these cards
    const userCollections = await prisma.userCollection.findMany({
      where: { userId: decoded.userId },
    });

    const ownedCardIds = new Set<string>();
    for (const uc of userCollections) {
      const cards = uc.cards as Record<string, number>;
      for (const [cardId, qty] of Object.entries(cards)) {
        if (qty > 0) ownedCardIds.add(cardId);
      }
    }

    for (const cardId of cardIds) {
      if (!ownedCardIds.has(cardId)) {
        return NextResponse.json({ error: `Vous ne possédez pas la carte: ${cardId}` }, { status: 400 });
      }
    }

    // Update atomically
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { showcase: cardIds },
    });

    return NextResponse.json({ ok: true, showcase: cardIds });
  } catch (err) {
    console.error('Showcase update error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
