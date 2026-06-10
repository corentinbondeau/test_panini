import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { incrementTradeCount } from '@/lib/quota';
import { updateQuestProgress } from '@/lib/quests';
import { checkAndUnlockBadges } from '@/lib/badges';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['accepted', 'rejected', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Find exchange
    const exchange = await prisma.exchange.findUnique({
      where: { id },
    });

    if (!exchange) {
      return NextResponse.json(
        { error: 'Exchange not found' },
        { status: 404 }
      );
    }

    // Only recipient can accept/reject, both can mark as completed
    if (status !== 'completed' && exchange.recipientId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Only recipient can update this exchange' },
        { status: 403 }
      );
    }

    // Increment trade counter for both parties when accepted or completed
    if (status === 'accepted' || status === 'completed') {
      const otherUserId = exchange.requesterId === decoded.userId ? exchange.recipientId : exchange.requesterId;

      await Promise.all([
        incrementTradeCount(decoded.userId),
        incrementTradeCount(otherUserId),
        prisma.user.update({ where: { id: decoded.userId }, data: { totalTrades: { increment: 1 } } }),
        prisma.user.update({ where: { id: otherUserId }, data: { totalTrades: { increment: 1 } } }),
      ]);

      // Fire-and-forget quest + badge triggers
      Promise.all([
        updateQuestProgress(decoded.userId, 'trade_count', 1),
        updateQuestProgress(otherUserId, 'trade_count', 1),
        checkAndUnlockBadges(decoded.userId),
        checkAndUnlockBadges(otherUserId),
      ]).catch((e) => console.error('[exchange] quest/badge error:', e));
    }

    const updatedExchange = await prisma.exchange.update({
      where: { id },
      data: { status },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        recipient: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ exchange: updatedExchange }, { status: 200 });
  } catch (error) {
    console.error('Update exchange error:', error);
    return NextResponse.json(
      { error: 'Failed to update exchange' },
      { status: 500 }
    );
  }
}
