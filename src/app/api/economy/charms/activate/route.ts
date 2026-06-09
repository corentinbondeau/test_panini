import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get('authorization') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    if ((user.charms ?? 0) < 1) return NextResponse.json({ error: 'Pas d\'amulette disponible' }, { status: 400 });

    // Reserve one charm for the next booster open (will be consumed on open)
    await prisma.user.update({ where: { id: decoded.userId }, data: { charmReserved: true } });

    return NextResponse.json({ ok: true, message: 'Amulette réservée pour le prochain tirage' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
