import webPush from 'web-push';
import { prisma } from '@/core/lib/prisma';
import { IPushProvider } from '@/core/interfaces/notification-providers.interface';

// Configuration VAPID. Ces clés devraient venir de l'environnement
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BM2x_...';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '...';

webPush.setVapidDetails(
  'mailto:contact@jamm-ak-xeewal.sn',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export class PushService implements IPushProvider {
  /**
   * Envoie une notification PUSH à un membre
   * Retourne true si au moins une souscription a réussi, false sinon (ou si aucune souscription)
   */
  async sendPushToMember(memberId: string, payload: any): Promise<boolean> {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { adherentId: memberId } // Le champ s'appelle adherentId ou memberId ? Je vérifierai adherentId.
    });

    if (subscriptions.length === 0) {
      return false; // Pas d'appareil abonné
    }

    let successCount = 0;

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: sub.keys as any
        };

        await webPush.sendNotification(pushSubscription, JSON.stringify(payload));
        successCount++;
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          // L'abonnement a expiré ou n'est plus valide, on nettoie
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        }
      }
    }

    return successCount > 0;
  }
}
