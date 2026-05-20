import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@ecc-panini.fr',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function GET(request: NextRequest) {
  try {
    // 1. Double Vérification de Sécurité
    let isAuthorized = false;

    // Sécurité A : Est-ce que c'est le Cron automatique de Vercel ?
    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      isAuthorized = true;
    }

    // Sécurité B : Si ce n'est pas Vercel, est-ce un Admin connecté manuellement ?
    if (!isAuthorized) {
      const token = getTokenFromHeader(authHeader || '');
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const requester = await prisma.user.findUnique({ where: { id: decoded.userId } });
          if (requester && requester.role === 'admin') {
            isAuthorized = true;
          }
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 });
    }

    // 2. Configuration du message de rappel
    const title = '⚡ ECC Panini';
    const message = "Rappel quotidien : Tes boosters du jour sont disponibles ! Viens les ouvrir. 🏆";

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys non configurées' }, { status: 500 });
    }

    // 3. Récupération des abonnements en base
    const subscriptions = await prisma.pushSubscription.findMany();

    let sent = 0;
    let failed = 0;

    // 4. Envoi groupé des notifications
    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({ 
              title, 
              body: message, 
              icon: '/logo-club.png', 
              data: { url: '/booster' } 
            })
          );
          sent++;
        } catch (err: unknown) {
          // Nettoyage automatique des abonnements périmés (ex: désinstallation de l'app)
          if (err && typeof err === 'object' && 'statusCode' in err) {
            const statusCode = (err as { statusCode: number }).statusCode;
            if (statusCode === 410 || statusCode === 404) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
          }
          failed++;
        }
      })
    );

    return NextResponse.json({ success: true, sent, failed, total: subscriptions.length });
  } catch (error) {
    console.error('Send reminders error:', error);
    return NextResponse.json({ error: "Erreur lors de l'envoi" }, { status: 500 });
  }
}