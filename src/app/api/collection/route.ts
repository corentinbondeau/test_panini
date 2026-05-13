import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { DEFAULT_COLLECTION_ID } from '@/data/cards';

export const dynamic = 'force-dynamic';

function getCollectionId(request: NextRequest): string {
  const url = new URL(request.url);
  return url.searchParams.get('collectionId') || DEFAULT_COLLECTION_ID;
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const collectionId = getCollectionId(request);

    const userCollection = await prisma.userCollection.findUnique({
      where: { userId_collectionId: { userId: decoded.userId, collectionId } },
    });

    if (!userCollection) {
      return NextResponse.json(
        { collection: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ collection: userCollection }, { status: 200 });
  } catch (error) {
    console.error('Get collection error:', error);
    return NextResponse.json(
      { error: 'Failed to get collection' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, quantity, collectionId: bodyCollectionId } = body;
    const collectionId = bodyCollectionId || DEFAULT_COLLECTION_ID;

    if (!cardId || quantity === undefined) {
      return NextResponse.json(
        { error: 'cardId and quantity are required' },
        { status: 400 }
      );
    }

    let userCollection = await prisma.userCollection.findUnique({
      where: { userId_collectionId: { userId: decoded.userId, collectionId } },
    });

    // Create collection record if it doesn't exist
    if (!userCollection) {
      const collection = await prisma.collection.findUnique({
        where: { slug: collectionId },
      });

      if (!collection) {
        return NextResponse.json(
          { error: 'Collection not found' },
          { status: 404 }
        );
      }

      userCollection = await prisma.userCollection.create({
        data: {
          userId: decoded.userId,
          collectionId: collection.id,
          cards: {},
        },
      });
    }

    const currentCards = (userCollection.cards as Record<string, number>) || {};

    if (quantity <= 0) {
      delete currentCards[cardId];
    } else {
      currentCards[cardId] = quantity;
    }

    const updated = await prisma.userCollection.update({
      where: { id: userCollection.id },
      data: { cards: currentCards },
    });

    return NextResponse.json({ collection: updated }, { status: 200 });
  } catch (error) {
    console.error('Update collection error:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}
