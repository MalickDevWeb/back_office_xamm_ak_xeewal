import { PaymentTransaction, Organization } from '@prisma/client';

export interface PaymentProviderContext {
  organizationId: string;
  transaction: PaymentTransaction;
  metadata?: Record<string, any>;
}

export interface PaymentProviderInterface {
  /**
   * Identifiant unique du provider (WAVE, ORANGE_MONEY, MANUAL)
   */
  getProviderId(): string;

  /**
   * Crée un nouveau paiement auprès du provider.
   * Doit retourner une URL de redirection (checkoutUrl) si applicable,
   * ou une référence de transaction externe.
   */
  createPayment(
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
  }>;

  /**
   * Interroge le provider pour obtenir le statut réel d'un paiement.
   */
  getPaymentStatus(
    transaction: PaymentTransaction,
    context: PaymentProviderContext
  ): Promise<{
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    providerTransactionId?: string;
    error?: string;
  }>;

  /**
   * Rembourse partiellement ou totalement un paiement.
   */
  refundPayment(
    transaction: PaymentTransaction,
    amount: number,
    context: PaymentProviderContext
  ): Promise<{
    success: boolean;
    refundReference?: string;
    error?: string;
  }>;

  /**
   * Vérifie la validité cryptographique d'un webhook entrant.
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    webhookSecret: string
  ): boolean;
}
