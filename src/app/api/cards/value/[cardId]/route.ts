import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { cardId: string } }) {
  try {
    const { cardId } = params;
    if (!cardId) return NextResponse.json({ error: 'cardId missing' }, { status: 400 });
    const rows = await prisma.cardValueHistory.findMany({ where: { cardId }, orderBy: { date: 'asc' } });
    return NextResponse.json({ ok: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
