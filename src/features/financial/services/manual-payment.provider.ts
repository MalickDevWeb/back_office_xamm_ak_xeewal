import { PaymentProviderInterface, PaymentProviderContext } from './payment-provider.interface';
import { PaymentTransaction } from '@prisma/client';

/**
 * Fournisseur de paiement Manuel.
 * Ne dépend d'aucune API externe. Un paiement manuel est créé avec le statut PENDING_CONFIRMATION
 * et attend l'approbation d'un trésorier.
 */
export class ManualPaymentProvider implements PaymentProviderInterface {
  
  getProviderId(): string {
    return 'MANUAL';
  }

  async createPayment(
    amount: number,
    currency: string,
    idempotencyKey: string,
    context: PaymentProviderContext
  ): Promise<{
    success: boolean;
    checkoutUrl?: string;
    externalReference?: string;
    providerTransactionId?: string;
    error?: string;
  }> {
    // Le paiement manuel crée simplement la transaction et attend confirmation
    return {
      success: true,
      externalReference: `MANUAL-${Date.now()}-${idempotencyKey.substring(0, 8)}`,
    };
  }

  async getPaymentStatus(
    transaction: PaymentTransaction,
    context: PaymentProviderContext
  ): Promise<{
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    providerTransactionId?: string;
    error?: string;
  }> {
    // Le statut dépend de ce qui est en base de données.
    // L'interface manuelle n'a pas de serveur externe à interroger.
    if (transaction.status === 'SUCCESS' || transaction.status === 'CONFIRMED') {
      return { status: 'SUCCESS' };
    }
    if (transaction.status === 'REJECTED' || transaction.status === 'FAILED') {
      return { status: 'FAILED' };
    }
    return { status: 'PENDING' };
  }

  async refundPayment(
    transaction: PaymentTransaction,
    amount: number,
    context: PaymentProviderContext
  ): Promise<{
    success: boolean;
    refundReference?: string;
    error?: string;
  }> {
    // Le remboursement manuel est validé automatiquement (sans appel API)
    return {
      success: true,
      refundReference: `REFUND-${Date.now()}-${transaction.id.substring(0, 8)}`,
    };
  }

  verifyWebhookSignature(payload: string, signature: string, webhookSecret: string): boolean {
    // Pas de webhooks pour les paiements manuels
    return false;
  }
}
