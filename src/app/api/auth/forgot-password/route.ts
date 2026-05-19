import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifie si l'utilisateur existe (sans révéler l'existence pour sécurité)
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Génère un token sécurisé
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure

      // Supprime les anciens tokens pour cet email
      await prisma.passwordResetToken.deleteMany({ where: { email } });

      // Crée le nouveau token
      await prisma.passwordResetToken.create({
        data: {
          email,
          token: resetToken,
          expiresAt,
        },
      });

      // Simulation d'envoi d'email
      console.log(`[Password Reset] Lien pour ${email}: http://localhost:3000/reset-password?token=${resetToken}`);
    }

    // Toujours retourner le même message (sécurité par obscurité)
    return NextResponse.json({
      message: 'Si cet email existe, un lien de réinitialisation vous a été envoyé.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
