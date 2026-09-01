export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { getCorsHeaders } from '../../../../../core/lib/cors';
import webpush from 'web-push';

// Configurer web-push avec les clés VAPID depuis les variables d'environnement
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:contact@jammakxeewal.sn',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err: any) {
    console.warn('Erreur lors de la configuration de web-push:', err.message);
  }
} else {
  console.warn('VAPID keys manquantes. Les notifications push ne fonctionneront pas.');
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const { title, body, icon, url } = await req.json();

    const subscriptions = await (prisma.pushSubscription as any).findMany();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun abonné', sent: 0 }, { headers: corsHeaders });
    }

    const payload = JSON.stringify({
      notification: {
        title: title || 'Mouvement JÀMM AK XÉEWAL',
        body: body || 'Vous avez une nouvelle notification',
        icon: icon || 'https://www.jammakxeewal.sn/assets/icons/icon-192x192.png',
        badge: 'https://www.jammakxeewal.sn/assets/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: { url: url || '/' }
      }
    });

    let sent = 0;
    const sendPromises = subscriptions.map(async (sub: any) => {
      try {
        // Les keys stockées en JSON Prisma peuvent être une string — on force l'objet
        const keys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
        await webpush.sendNotification({ endpoint: sub.endpoint, keys }, payload);
        sent++;
      } catch (error: any) {
        console.error(`Erreur push pour ${sub.endpoint}:`, error?.statusCode, error?.message);
        // Abonnement expiré : on supprime
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          await (prisma.pushSubscription as any).delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json(
      { success: true, message: `Envoyé à ${sent}/${subscriptions.length} abonné(s)`, sent, total: subscriptions.length },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('Push send error:', error);
    return NextResponse.json({ success: false, message: 'Server error', error: error?.message }, { status: 500, headers: corsHeaders });
  }
}
