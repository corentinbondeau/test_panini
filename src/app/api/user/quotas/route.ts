import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import { checkAndResetQuota, MAX_BOOSTERS_PER_DAY, MAX_TRADES_PER_DAY } from '@/lib/quota';

export const dynamic = 'force-dynamic';

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

    const quota = await checkAndResetQuota(decoded.userId);

    return NextResponse.json({
      boostersOpenedToday: quota.boostersOpenedToday,
      tradesMadeToday: quota.tradesMadeToday,
      maxBoostersPerDay: MAX_BOOSTERS_PER_DAY,
      maxTradesPerDay: MAX_TRADES_PER_DAY,
      boostersRemainingToday: Math.max(0, MAX_BOOSTERS_PER_DAY - quota.boostersOpenedToday),
      tradesRemainingToday: Math.max(0, MAX_TRADES_PER_DAY - quota.tradesMadeToday),
    });
  } catch (error) {
    console.error('Get quotas error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des quotas' },
      { status: 500 }
    );
  }
}
