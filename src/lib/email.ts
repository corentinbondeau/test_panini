import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST || '';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpFrom = process.env.SMTP_FROM || 'ECC Panini <noreply@ecc-panini.fr>';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('[Email] SMTP non configuré. Les emails ne seront pas envoyés.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.warn(`[Email] Simulation : email à ${params.to} — sujet: "${params.subject}"`);
    return false;
  }

  try {
    const info = await t.sendMail({
      from: smtpFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]*>/g, ''),
    });
    console.log(`[Email] Envoyé à ${params.to} — messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email] Échec d'envoi à ${params.to}:`, error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const resetLink = `${siteUrl}/reset-password?token=${token}`;

  return sendEmail({
    to: email,
    subject: 'Réinitialisation de votre mot de passe ECC Panini',
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;background:#0a0a1a;color:#e0e0e0;padding:40px 24px;border-radius:12px;border:1px solid #c8a84e;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#c8a84e;margin:0;font-size:24px;">ECC Panini</h1>
          <p style="color:#8899aa;margin:4px 0 0;">Album de collection</p>
        </div>
        <p style="margin:0 0 16px;">Bonjour,</p>
        <p style="margin:0 0 24px;">
          Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${resetLink}" style="display:inline-block;padding:12px 32px;background:#c8a84e;color:#0a0a1a;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="margin:0 0 8px;font-size:14px;color:#8899aa;">Ou copiez ce lien dans votre navigateur :</p>
        <p style="margin:0 0 24px;font-size:13px;color:#c8a84e;word-break:break-all;">${resetLink}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#8899aa;">Ce lien expire dans 1 heure.</p>
        <p style="margin:0;font-size:14px;color:#8899aa;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        <hr style="border:none;border-top:1px solid #1a2a3a;margin:24px 0;" />
        <p style="margin:0;font-size:12px;color:#667788;">ECC Panini — Étoile Club Cœlacanthe</p>
      </div>
    `,
  });
}
