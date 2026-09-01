export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import webpush from 'web-push';

// Configurer web-push avec précaution pour éviter les erreurs lors du build Next.js (sur Vercel)
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

export async function POST(req: Request) {
  try {
    const { title, body, icon, url } = await req.json();

    const subscriptions = await (prisma.pushSubscription as any).findMany();

    const payload = JSON.stringify({
      notification: {
        title: title || 'Mouvement JÀMM AK XÉEWAL',
        body: body || 'Vous avez une nouvelle notification',
        icon: icon || 'https://www.jammakxeewal.sn/assets/icons/icon-192x192.png',
        badge: 'https://www.jammakxeewal.sn/assets/icons/icon-72x72.png',
        vibrate: [100, 50, 100],
        // Le "sound" par défaut (ting) est généralement géré par le système, 
        // mais on peut le spécifier pour les navigateurs qui le supportent encore.
        sound: 'default',
        data: {
          url: url || '/'
        }
      }
    });

    const sendPromises = subscriptions.map((sub: any) => 
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys as any },
        payload
      ).catch(error => {
        // En cas d'erreur 410 ou 404, l'abonnement n'est plus valide, on le supprime
        if (error.statusCode === 410 || error.statusCode === 404) {
          return (prisma.pushSubscription as any).delete({ where: { id: sub.id } }).catch(() => {});
        }
      })
    );

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, message: `Sent to ${subscriptions.length} subscribers` });
  } catch (error) {
    console.error('Push send error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
