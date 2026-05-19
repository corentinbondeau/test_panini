import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendResetPasswordEmail } from '@/lib/mail';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // On cherche l'utilisateur SANS révéler son existence
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      try {
        // 1. Générer un token unique
        const resetToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 3_600_000); // 1 heure

        // 2. Supprimer les anciens tokens pour cet email
        await prisma.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

        // 3. Sauvegarder le nouveau token
        await prisma.passwordResetToken.create({
          data: {
            email: normalizedEmail,
            token: resetToken,
            expiresAt,
          },
        });

        console.log(`[PASSWORD-RESET] Token généré pour ${normalizedEmail} — expire à ${expiresAt.toISOString()}`);

        // 4. Envoyer l'email (avec try/catch pour ne pas fuir d'info)
        await sendResetPasswordEmail(normalizedEmail, resetToken);
        console.log(`[PASSWORD-RESET] ✅ Email envoyé avec succès à ${normalizedEmail}`);
      } catch (mailError: unknown) {
        const err = mailError as Error & { code?: string; response?: string };
        console.error(`❌ [MAIL ERROR] Échec d'envoi du mot de passe oublié pour ${normalizedEmail}:`);
        console.error(`   · Message    : ${err.message || 'inconnu'}`);
        console.error(`   · Code       : ${err.code || 'N/A'}`);
        if (err.response) console.error(`   · Réponse    : ${err.response}`);
        console.error(`   · Stack      : ${err.stack || 'N/A'}`);
        // On continue — on ne révèle PAS l'échec à l'utilisateur
      }
    } else {
      console.log(`[PASSWORD-RESET] Aucun compte trouvé pour ${normalizedEmail} — message masqué`);
    }

    // Toujours retourner 200 — sécurité anti-énumération
    return NextResponse.json(
      { message: 'Si ce compte existe, un e-mail a été envoyé.' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`❌ [PASSWORD-RESET] Erreur générale :`, err.message || err);
    // On retourne 200 même en cas d'erreur serveur (sécurité)
    return NextResponse.json(
      { message: 'Si ce compte existe, un e-mail a été envoyé.' },
      { status: 200 }
    );
  }
}
