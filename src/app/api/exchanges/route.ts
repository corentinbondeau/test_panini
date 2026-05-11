import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

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

    const exchanges = await prisma.exchange.findMany({
      where: {
        OR: [
          { requesterId: decoded.userId },
          { recipientId: decoded.userId },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ exchanges }, { status: 200 });
  } catch (error) {
    console.error('Get exchanges error:', error);
    return NextResponse.json(
      { error: 'Failed to get exchanges' },
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
    const { recipientId, offeredCards, requestedCards } = body;

    if (!recipientId || !offeredCards || !requestedCards) {
      return NextResponse.json(
        { error: 'recipientId, offeredCards, and requestedCards are required' },
        { status: 400 }
      );
    }

    // Check if recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    const exchange = await prisma.exchange.create({
      data: {
        requesterId: decoded.userId,
        recipientId,
        offeredCards,
        requestedCards,
      },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ exchange }, { status: 201 });
  } catch (error) {
    console.error('Create exchange error:', error);
    return NextResponse.json(
      { error: 'Failed to create exchange' },
      { status: 500 }
    );
  }
}
