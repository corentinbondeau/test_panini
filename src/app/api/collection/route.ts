import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization') || '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const collection = await prisma.userCollection.findUnique({
      where: { userId: decoded.userId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ collection }, { status: 200 });
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cardId, quantity } = body;

    if (!cardId || quantity === undefined) {
      return NextResponse.json(
        { error: 'cardId and quantity are required' },
        { status: 400 }
      );
    }

    const collection = await prisma.userCollection.findUnique({
      where: { userId: decoded.userId },
    });

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    const currentCards = (collection.cards as Record<string, number>) || {};

    if (quantity <= 0) {
      delete currentCards[cardId];
    } else {
      currentCards[cardId] = quantity;
    }

    const updatedCollection = await prisma.userCollection.update({
      where: { userId: decoded.userId },
      data: { cards: currentCards },
    });

    return NextResponse.json({ collection: updatedCollection }, { status: 200 });
  } catch (error) {
    console.error('Update collection error:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}
