import { prisma } from '@/core/lib/prisma';
import { CryptoUtil } from '@/core/utils/crypto.util';
import { IEmailProvider, ISmsProvider, IPushProvider } from '@/core/interfaces/notification-providers.interface';
import { SmtpProvider } from '../providers/email/smtp.provider';
import { MockSmsProvider } from '../providers/sms/mock-sms.provider';
import { PushService } from '../services/push.service';

export class NotificationProviderFactory {
  
  /**
   * Retourne le fournisseur d'email actif configuré en BDD
   * Retourne null si aucun fournisseur n'est configuré
   */
  static async getEmailProvider(): Promise<IEmailProvider | null> {
    const configRecord = await (prisma as any).providerConfiguration.findUnique({
      where: { provider: 'SMTP' }
    });

    if (!configRecord || !configRecord.isActive) {
      return null;
    }

    try {
      const configObjStr = typeof configRecord.config === 'string' ? configRecord.config : JSON.stringify(configRecord.config);
      // Le json est stocké sous forme de string (qui est le résultat chiffré)
      // Prisma stocke JsonValue, donc si on a stocké une string, on récupère une string (avec des guillemets potentiellement)
      const cleanStr = configObjStr.replace(/^"|"$/g, '');
      const config = CryptoUtil.decryptConfig(cleanStr);
      
      return new SmtpProvider(config);
    } catch (e) {
      console.error('[NotificationProviderFactory] Failed to instantiate SMTP Provider', e);
      return null;
    }
  }

  /**
   * Retourne le fournisseur SMS actif configuré en BDD
   */
  static async getSmsProvider(): Promise<ISmsProvider | null> {
    const configRecord = await (prisma as any).providerConfiguration.findUnique({
      where: { provider: 'ORANGE_SMS' } // ou MOCK_SMS, etc. On cherche SMS générique
    });

    // S'il y a une vraie config SMS, on pourrait instancier OrangeSmsProvider.
    // Pour l'instant, on fallback sur le Mock si la config MOCK_SMS est présente ou on renvoie Mock par défaut si on veut
    
    // Check for MOCK config or fallback
    const mockRecord = await (prisma as any).providerConfiguration.findUnique({
      where: { provider: 'MOCK_SMS' }
    });

    if (mockRecord && mockRecord.isActive) {
      try {
        const configObjStr = typeof mockRecord.config === 'string' ? mockRecord.config : JSON.stringify(mockRecord.config);
        const cleanStr = configObjStr.replace(/^"|"$/g, '');
        const config = CryptoUtil.decryptConfig(cleanStr);
        return new MockSmsProvider(config);
      } catch (e) {
        return new MockSmsProvider();
      }
    }
    
    // Fallback default mock
    return new MockSmsProvider();
  }

  /**
   * Retourne le fournisseur Web Push actif (actuellement PushService)
   */
  static async getPushProvider(): Promise<IPushProvider> {
    // Le PushService actuel lit depuis process.env. 
    // Idéalement, il lirait de la config VAPID en BDD, mais on garde le PushService existant pour l'instant.
    return new PushService();
  }
}
