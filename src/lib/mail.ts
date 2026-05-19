import nodemailer from 'nodemailer';

/* ─────────── Configuration ─────────── */

const config = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'ECC Panini <noreply@ecc-panini.fr>',
  siteUrl: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
};

/* ─────────── Transporteur (Singleton) ─────────── */

let transporter: nodemailer.Transporter | null = null;
let mailEnabled = true;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (!config.host || !config.user || !config.pass) {
    console.warn('⚠️  [MAIL] SMTP non configuré — les emails seront simulés (console).');
    mailEnabled = false;
    transporter = nodemailer.createTransport({ jsonTransport: true }) as unknown as nodemailer.Transporter;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });

  return transporter;
}

/* ─────────── Template HTML (sombre / TCG) ─────────── */

function buildResetEmailHtml(resetLink: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Réinitialisation mot de passe</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background-color:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
          <tr>
            <td style="padding:40px 32px 32px;text-align:center;">
              <!-- Logo / Titre -->
              <h1 style="color:#fbbf24;margin:0 0 4px;font-size:26px;font-weight:800;letter-spacing:1px;">
                ECC PANINI
              </h1>
              <p style="color:#94a3b8;margin:0 0 32px;font-size:14px;">
                Album de collection · Étoile Club Camphin
              </p>

              <!-- Séparateur -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,#fbbf24,transparent);margin-bottom:32px;"></div>

              <!-- Texte principal -->
              <p style="color:#e2e8f0;margin:0 0 12px;font-size:16px;line-height:1.6;">
                Bonjour,
              </p>
              <p style="color:#cbd5e1;margin:0 0 28px;font-size:15px;line-height:1.6;">
                Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau&nbsp;:
              </p>

              <!-- Bouton -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#fbbf24,#f59e0b);padding:1px;">
                    <a href="${resetLink}"
                       style="display:inline-block;padding:14px 40px;border-radius:10px;
                              background:#1e293b;color:#fbbf24;font-size:16px;font-weight:700;
                              text-decoration:none;letter-spacing:0.5px;
                              transition:all 0.2s;">
                      ⚡ Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Lien texte (secours) -->
              <p style="color:#64748b;margin:0 0 6px;font-size:13px;">
                Ou copiez ce lien dans votre navigateur :
              </p>
              <p style="color:#fbbf24;margin:0 0 28px;font-size:12px;word-break:break-all;line-height:1.5;">
                ${resetLink}
              </p>

              <!-- Infos sécurité -->
              <div style="background:#0f172a;border-radius:10px;padding:16px 20px;margin-bottom:28px;border:1px solid #334155;">
                <p style="color:#94a3b8;margin:0;font-size:13px;line-height:1.5;">
                  🔒 Ce lien expire dans <strong style="color:#fbbf24;">1 heure</strong>.<br />
                  Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
                </p>
              </div>

              <!-- Footer -->
              <div style="height:1px;background:linear-gradient(90deg,transparent,#334155,transparent);margin-bottom:24px;"></div>
              <p style="color:#475569;margin:0;font-size:12px;">
                ECC Panini — Étoile Club Camphin<br />
                Cet email est généré automatiquement, merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─────────── Envoi générique ─────────── */

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const t = getTransporter();

  try {
    if (!mailEnabled) {
      console.log(`[MAIL] ✅ Simulation — destinataire: ${options.to} | sujet: "${options.subject}"`);
      console.log(`[MAIL] 📧 Contenu HTML : ${options.html.length} caractères`);
      return true;
    }

    const info = await t.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });

    console.log(`[MAIL] ✅ Envoyé avec succès — ${options.to} (messageId: ${info.messageId})`);
    return true;
  } catch (error: unknown) {
    const err = error as Error & { code?: string; response?: string };
    console.error(`❌ [MAIL ERROR] Échec d'envoi vers ${options.to}:`);
    console.error(`   · Message    : ${err.message || 'inconnu'}`);
    console.error(`   · Code       : ${err.code || 'N/A'}`);
    if (err.response) console.error(`   · Réponse    : ${err.response}`);
    console.error(`   · Stack      : ${err.stack || 'N/A'}`);
    throw error;
  }
}

/* ─────────── Email de réinitialisation ─────────── */

export async function sendResetPasswordEmail(email: string, token: string): Promise<boolean> {
  const resetLink = `${config.siteUrl}/reset-password?token=${encodeURIComponent(token)}`;

  console.log(`[MAIL] 📨 Préparation de l'email de réinitialisation pour ${email}`);

  return sendMail({
    to: email,
    subject: '🔐 Réinitialisation de votre mot de passe — ECC Panini',
    html: buildResetEmailHtml(resetLink),
    text: `Réinitialisation de votre mot de passe ECC Panini\n\n` +
          `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${resetLink}\n\n` +
          `Ce lien expire dans 1 heure.\n` +
          `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
  });
}
