import { prisma } from '@/core/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  /**
   * Créer et planifier l'envoi d'une notification (MVP)
   * 1. Créer la notification
   * 2. Créer les cibles (targets)
   * 3. Récupérer tous les membres des groupes ciblés, dédupliquer (recipients)
   * 4. Créer les livraisons (deliveries) IN_APP pour les membres dont la préférence est activée
   */
  async createNotification(
    organizationId: string, 
    data: { title: string; message: string; groupIds: string[]; channels: string[]; createdBy?: string; scheduledAt?: Date }
  ) {
    const notificationId = `notif-${uuidv4()}`;
    const initialStatus = data.scheduledAt && new Date(data.scheduledAt) > new Date() ? 'SCHEDULED' : 'PENDING';

    return prisma.$transaction(async (tx) => {
      // 1. Créer la notification
      const notification = await tx.notification.create({
        data: {
          id: notificationId,
          organizationId,
          title: data.title,
          message: data.message,
          strategy: 'MULTI_CHANNEL',
          status: initialStatus,
          scheduledAt: data.scheduledAt,
          metadata: { channels: data.channels },
          createdBy: data.createdBy,
          updatedAt: new Date()
        }
      });

      // 2. Créer les targets (Groupes)
      if (data.groupIds.length > 0) {
        await tx.notificationTarget.createMany({
          data: data.groupIds.map(groupId => ({
            id: `nt-${uuidv4()}`,
            notificationId,
            groupId
          }))
        });
      }

      // 3. Les canaux sont enregistrés d'une manière ou d'une autre, 
      // pour l'instant le Worker regardera une logique ou on peut les stocker dans metadata
      // Mais le plus simple est d'ajouter un champ `channels` JSON dans Notification.
      // D'après le schéma, on n'a pas de champ channels. 
      // On le passera dans une autre table ou on considérera que le PUSH et IN_APP sont activés.
      // On va faire évoluer le schéma si besoin ou coder le Worker pour générer les channels par défaut.

      return notification;
    });
  }

  /**
   * Récupérer les notifications d'une organisation
   */
  async getNotifications(organizationId: string) {
    return prisma.notification.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { NotificationRecipient: true, NotificationTarget: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * (Espace Adhérent) Récupérer les notifications IN_APP d'un membre
   */
  async getMyNotifications(memberId: string) {
    const deliveries = await prisma.notificationDelivery.findMany({
      where: {
        channel: 'IN_APP',
        NotificationRecipient: {
          memberId: memberId
        }
      },
      include: {
        NotificationRecipient: {
          include: {
            Notification: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limite
    });

    // On map pour renvoyer un format facile à lire par le front
    return deliveries.map(d => ({
      deliveryId: d.id,
      notificationId: d.NotificationRecipient.Notification.id,
      title: d.NotificationRecipient.Notification.title,
      message: d.NotificationRecipient.Notification.message,
      isRead: d.status === 'READ',
      createdAt: d.NotificationRecipient.Notification.createdAt,
      readAt: d.readAt
    }));
  }

  /**
   * (Espace Adhérent) Marquer une notification comme lue
   */
  async markAsRead(deliveryId: string) {
    return prisma.notificationDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'READ',
        readAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * (Espace Adhérent) Obtenir le compteur de notifications non lues
   */
  async getUnreadCount(memberId: string) {
    return prisma.notificationDelivery.count({
      where: {
        channel: 'IN_APP',
        status: 'DELIVERED', // 'DELIVERED' signifie non lu pour IN_APP
        NotificationRecipient: {
          memberId: memberId
        }
      }
    });
  }
}
