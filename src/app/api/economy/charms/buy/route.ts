import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const COST = 20; // tokens

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    if ((user.tokens ?? 0) < COST) return NextResponse.json({ error: 'Tokens insuffisants' }, { status: 400 });

    await prisma.user.update({ where: { id: decoded.userId }, data: { tokens: { decrement: COST }, charms: { increment: 1 } } });

    return NextResponse.json({ ok: true, message: 'Amulette achetée', cost: COST });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
