import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';
import { getCardsByCollection } from '@/data/clubCards';

export async function POST(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { cardId, collectionId } = body;
    if (!cardId) return NextResponse.json({ error: 'cardId required' }, { status: 400 });

    // Find card metadata
    const collectionSlug = collectionId || 's25-26';
    const cards = getCardsByCollection(collectionSlug);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    if (card.rarity === 'LEGENDAIRE') return NextResponse.json({ error: 'Cannot craft legendary cards' }, { status: 400 });

    const costByRarity: Record<string, number> = { COMMUNE: 5, RARE: 20 };
    const cost = costByRarity[card.rarity] ?? 10;

    const userCollection = await prisma.userCollection.findUnique({ where: { userId_collectionId: { userId: decoded.userId, collectionId: card.collectionId } } });
    let quantities = {} as Record<string, number>;
    if (userCollection) quantities = (userCollection.cards as Record<string, number>) || {};

    if ((quantities[card.id] ?? 0) > 0) return NextResponse.json({ error: 'Vous possédez déjà cette carte' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    if ((user.dust ?? 0) < cost) return NextResponse.json({ error: 'Poussière insuffisante', needed: cost, available: user.dust }, { status: 400 });

    // Deduct dust and add card
    await prisma.user.update({ where: { id: decoded.userId }, data: { dust: { decrement: cost } } });

    if (!userCollection) {
      await prisma.userCollection.create({ data: { userId: decoded.userId, collectionId: card.collectionId, cards: { [card.id]: 1 } } });
    } else {
      const next = (quantities[card.id] ?? 0) + 1;
      quantities[card.id] = next;
      const currentCardDates = (userCollection.cardDates as Record<string, string>) || {};
      if (!currentCardDates[card.id]) currentCardDates[card.id] = new Date().toISOString();
      await prisma.userCollection.update({ where: { id: userCollection.id }, data: { cards: quantities, cardDates: currentCardDates } });
    }

    return NextResponse.json({ ok: true, message: 'Carte créée', cost });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
