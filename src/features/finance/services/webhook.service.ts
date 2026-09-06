import crypto from 'crypto';
import { prisma } from '../../../core/lib/prisma';
import { CryptoUtil } from '../../../core/utils/crypto.util';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { PaymentService } from './payment.service';

/**
 * Service centralisé de traitement des webhooks de paiement.
 * Gère la vérification de signature, l'idempotence et la confirmation
 * pour tous les providers (Wave, Orange Money, etc.)
 */
export class WebhookService {
  /**
   * Point d'entrée unique pour traiter un webhook entrant.
   *
   * @param provider  - Nom du provider (ex: 'WAVE', 'ORANGE_MONEY')
   * @param rawBody   - Corps brut (texte) de la requête, avant parsing
   * @param signature - Valeur de l'en-tête de signature (ex: wave-signature)
   */
  static async processWebhook(provider: string, rawBody: string, signature: string): Promise<{ success: boolean; message: string }> {
    const providerUpper = provider.toUpperCase();

    // 1. Parser le payload
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return { success: false, message: 'Payload JSON invalide' };
    }

    // 2. Retrouver l'organisation via l'ID dans le payload (multi-tenant)
    const organizationId = event.organizationId || event.client_reference?.split(':')[0];
    if (!organizationId) {
      return { success: false, message: 'organizationId introuvable dans le payload du webhook' };
    }

    // 3. Charger la config du provider pour cette organisation
    const config = await prisma.paymentProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider: providerUpper } }
    });

    if (!config || !config.enabled) {
      return { success: false, message: `Provider ${providerUpper} non configuré ou désactivé pour cette organisation` };
    }

    // 4. Déchiffrer le secret webhook et vérifier la signature HMAC
    if (config.webhookSecretEncrypted) {
      const decrypted = CryptoUtil.decryptConfig(config.webhookSecretEncrypted);
      const webhookSecret: string = typeof decrypted === 'string' ? decrypted : decrypted?.secret;

      if (!webhookSecret) {
        return { success: false, message: 'Secret webhook invalide ou non configuré' };
      }

      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSig);

      // timingSafeEqual exige que les deux buffers aient la même longueur
      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { success: false, message: 'Signature du webhook invalide' };
      }
    }

    // 5. Vérification via l'abstraction du provider
    const providerInstance = PaymentProviderFactory.getProvider(providerUpper);
    const verification = providerInstance.verifyWebhook(event, signature, config);

    if (!verification.isValid || !verification.transactionId) {
      return { success: false, message: 'Webhook rejeté par le provider' };
    }

    // 6. Idempotence — un même événement webhook ne doit être traité qu'une seule fois
    const eventId = event.id || verification.transactionId;
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider: providerUpper, eventId } }
    });

    if (existingEvent?.status === 'PROCESSED') {
      return { success: true, message: 'Événement déjà traité (idempotent)' };
    }

    // Enregistrer/mettre à jour l'événement webhook
    await prisma.paymentWebhookEvent.upsert({
      where: { provider_eventId: { provider: providerUpper, eventId } },
      update: { status: 'RECEIVED' },
      create: {
        provider: providerUpper,
        eventId,
        payloadHash,
        status: 'RECEIVED',
      }
    });

    // 7. Retrouver la transaction interne correspondante
    const transaction = await prisma.paymentTransaction.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId,
          idempotencyKey: verification.transactionId
        }
      }
    });

    if (!transaction) {
      // Enregistrer comme ignoré mais répondre 200 pour ne pas bloquer le provider
      await prisma.paymentWebhookEvent.update({
        where: { provider_eventId: { provider: providerUpper, eventId } },
        data: { status: 'IGNORED', processedAt: new Date(), errorMessage: 'Transaction introuvable' }
      });
      return { success: true, message: 'Transaction non trouvée, événement ignoré' };
    }

    // 8. Ne traiter que si la transaction n'est pas déjà en succès
    if (transaction.status === 'SUCCESS') {
      await prisma.paymentWebhookEvent.update({
        where: { provider_eventId: { provider: providerUpper, eventId } },
        data: { status: 'PROCESSED', processedAt: new Date() }
      });
      return { success: true, message: 'Transaction déjà confirmée' };
    }

    // 9. Confirmer le paiement via le compte financier correspondant au provider
    const accountTypeMap: Record<string, string> = {
      WAVE: 'WAVE',
      ORANGE_MONEY: 'ORANGE_MONEY',
    };
    const accountType = accountTypeMap[providerUpper] || 'AUTRE';

    const financialAccount = await prisma.financialAccount.findFirst({
      where: { organizationId, type: accountType, status: 'ACTIVE' }
    });

    if (!financialAccount) {
      await prisma.paymentWebhookEvent.update({
        where: { provider_eventId: { provider: providerUpper, eventId } },
        data: { status: 'ERROR', processedAt: new Date(), errorMessage: `Compte financier ${accountType} introuvable ou inactif` }
      });
      return { success: false, message: `Compte financier ${accountType} introuvable pour cette organisation` };
    }

    try {
      await PaymentService.confirmPayment(transaction.id, financialAccount.id, `WEBHOOK_${providerUpper}`);

      await prisma.paymentWebhookEvent.update({
        where: { provider_eventId: { provider: providerUpper, eventId } },
        data: { status: 'PROCESSED', processedAt: new Date() }
      });

      return { success: true, message: 'Paiement confirmé avec succès' };
    } catch (error: any) {
      await prisma.paymentWebhookEvent.update({
        where: { provider_eventId: { provider: providerUpper, eventId } },
        data: { status: 'ERROR', processedAt: new Date(), errorMessage: error.message }
      });
      throw error;
    }
  }
}
