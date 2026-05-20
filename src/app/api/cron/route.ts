import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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
    // 1. Vérification de la clé secrète (Comme dans la doc Vercel)
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'VAPID keys non configurées' }, { status: 500 });
    }

    // 2. Récupération des abonnés aux notifications
    const subscriptions = await prisma.pushSubscription.findMany();
    
    const title = '⚡ ECC Panini';
    const message = "Rappel quotidien : Tes boosters du jour sont disponibles ! Viens les ouvrir. 🏆";
    
    let sent = 0;
    let failed = 0;

    // 3. Envoi des notifications push
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
        } catch (err) {
          // Nettoyage si l'abonnement a expiré
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
    console.error('Cron job error:', error);
    return NextResponse.json({ error: "Erreur lors de l'exécution du cron" }, { status: 500 });
  }
}