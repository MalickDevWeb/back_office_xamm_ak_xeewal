import { prisma } from '@/core/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export interface ChannelPreference {
  channel: string;
  enabled: boolean;
  priority: number;
}

export class PreferenceService {
  /**
   * Récupérer les préférences d'un adhérent
   */
  async getPreferences(memberId: string) {
    const prefs = await prisma.notificationPreference.findMany({
      where: { memberId },
    });

    // Si pas de préférences, on crée les défauts (IN_APP)
    if (prefs.length === 0) {
      await this.setPreferences(memberId, [
        { channel: 'IN_APP', enabled: true, priority: 1 }
      ]);
      return await prisma.notificationPreference.findMany({
        where: { memberId },
      });
    }

    return prefs;
  }

  /**
   * Mettre à jour les préférences d'un adhérent
   */
  async setPreferences(memberId: string, channels: ChannelPreference[]) {
    // Dans un cas réel, on vérifie que le member existe
    const member = await prisma.adherent.findUnique({ where: { id: memberId } });
    if (!member) throw new Error('Adherent not found');

    const operations = channels.map(c => {
      return prisma.notificationPreference.upsert({
        where: {
          memberId_channel: {
            memberId: memberId,
            channel: c.channel
          }
        },
        create: {
          id: `pref-${uuidv4()}`,
          memberId,
          channel: c.channel,
          enabled: c.enabled,
          priority: c.priority,
          updatedAt: new Date()
        },
        update: {
          enabled: c.enabled,
          priority: c.priority,
          updatedAt: new Date()
        }
      });
    });

    await prisma.$transaction(operations);

    return this.getPreferences(memberId);
  }
}
