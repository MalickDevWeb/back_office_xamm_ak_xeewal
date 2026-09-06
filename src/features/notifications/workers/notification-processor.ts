import { prisma } from '@/core/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { NotificationProviderFactory } from '../factories/notification-provider.factory';

export class NotificationProcessor {
  
  async processPendingNotifications() {
    const notifications = await prisma.notification.findMany({
      where: { status: 'PENDING' },
      take: 10
    });

    for (const notif of notifications) {
      await this.processSingleNotification(notif);
    }
    return notifications.length;
  }

  private async processSingleNotification(notification: any) {
    try {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'PROCESSING', processingStartedAt: new Date() }
      });

      const targets = await prisma.notificationTarget.findMany({
        where: { notificationId: notification.id }
      });
      const groupIds = targets.map(t => t.groupId);

      if (groupIds.length === 0) {
        await this.markAsSent(notification.id);
        return;
      }

      const groupMembers = await prisma.groupMember.findMany({
        where: { groupId: { in: groupIds }, removedAt: null },
        select: { 
          memberId: true,
          Adherent: {
            select: { telephone: true, email: true }
          }
        }
      });

      // Déduplication avec conservation des données (email, telephone)
      const memberDataMap = new Map<string, { telephone: string | null; email: string | null }>();
      for (const gm of groupMembers) {
        if (!memberDataMap.has(gm.memberId)) {
          memberDataMap.set(gm.memberId, {
            telephone: gm.Adherent?.telephone || null,
            email: gm.Adherent?.email || null
          });
        }
      }

      const uniqueMemberIds = Array.from(memberDataMap.keys());
      if (uniqueMemberIds.length === 0) {
        await this.markAsSent(notification.id);
        return;
      }

      const recipientPayloads = uniqueMemberIds.map(memberId => ({
        id: `nr-${uuidv4()}`,
        notificationId: notification.id,
        memberId
      }));

      await prisma.notificationRecipient.createMany({
        data: recipientPayloads,
        skipDuplicates: true
      });

      const insertedRecipients = await prisma.notificationRecipient.findMany({
        where: { notificationId: notification.id }
      });

      const metadata = (notification.metadata as any) || {};
      const requestedChannels: string[] = metadata.channels || ['IN_APP'];

      const preferences = await prisma.notificationPreference.findMany({
        where: { memberId: { in: uniqueMemberIds }, channel: { in: requestedChannels } }
      });

      const prefMap = new Map<string, Map<string, boolean>>();
      for (const pref of preferences) {
        if (!prefMap.has(pref.memberId)) prefMap.set(pref.memberId, new Map());
        prefMap.get(pref.memberId)!.set(pref.channel, pref.enabled);
      }

      const pushProvider = await NotificationProviderFactory.getPushProvider();
      const emailProvider = await NotificationProviderFactory.getEmailProvider();
      const smsProvider = await NotificationProviderFactory.getSmsProvider();

      for (const recipient of insertedRecipients) {
        const memberPrefs = prefMap.get(recipient.memberId);
        const memberData = memberDataMap.get(recipient.memberId);
        
        for (const channel of requestedChannels) {
          const wantsChannel = memberPrefs ? (memberPrefs.has(channel) ? memberPrefs.get(channel) : true) : true;

          if (wantsChannel) {
            let deliveryStatus = 'PENDING';
            let deliveredAt = null;

            if (channel === 'IN_APP') {
              deliveryStatus = 'DELIVERED';
              deliveredAt = new Date();
            } else if (channel === 'PUSH') {
              const pushPayload = { title: notification.title, body: notification.message };
              const success = await pushProvider.sendPushToMember(recipient.memberId, pushPayload);
              if (success) {
                deliveryStatus = 'DELIVERED';
                deliveredAt = new Date();
              } else {
                deliveryStatus = 'FAILED';
              }
            } else if (channel === 'EMAIL') {
              if (memberData?.email && emailProvider) {
                const success = await emailProvider.sendEmail(memberData.email, notification.title, notification.message);
                if (success) {
                  deliveryStatus = 'DELIVERED';
                  deliveredAt = new Date();
                } else {
                  deliveryStatus = 'FAILED';
                }
              } else {
                deliveryStatus = 'FAILED'; 
              }
            } else if (channel === 'SMS') {
              if (memberData?.telephone && smsProvider) {
                const success = await smsProvider.sendSms(memberData.telephone, notification.title + ": " + notification.message);
                if (success) {
                  deliveryStatus = 'DELIVERED';
                  deliveredAt = new Date();
                } else {
                  deliveryStatus = 'FAILED';
                }
              } else {
                deliveryStatus = 'FAILED'; 
              }
            }

            await prisma.notificationDelivery.create({
              data: {
                id: `nd-${uuidv4()}`,
                notificationRecipientId: recipient.id,
                channel: channel,
                status: deliveryStatus,
                deliveredAt: deliveredAt,
                updatedAt: new Date()
              }
            });
          }
        }
      }

      await this.markAsSent(notification.id);
      
    } catch (error) {
      console.error(`Error processing notification ${notification.id}`, error);
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED', updatedAt: new Date() }
      });
    }
  }

  private async markAsSent(notificationId: string) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENT', sentAt: new Date(), completedAt: new Date(), updatedAt: new Date() }
    });
  }
}
