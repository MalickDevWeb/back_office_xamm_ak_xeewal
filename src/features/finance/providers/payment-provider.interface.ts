import { PaymentTransaction, PaymentProviderConfig } from '@prisma/client';

export interface PaymentRequest {
  organizationId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  externalReference?: string;
  metadata?: any;
}

export interface PaymentResponse {
  success: boolean;
  providerTransactionId?: string;
  checkoutUrl?: string;
  status: 'PENDING' | 'PENDING_CONFIRMATION' | 'SUCCESS' | 'FAILED' | 'CREATED';
  failureCode?: string;
  failureMessage?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  transactionId?: string; // idempotencyKey ou providerTransactionId
  rawEvent?: any;
}

export abstract class PaymentProviderInterface {
  /**
   * Initialise le paiement avec l'API du provider
   */
  abstract createPayment(request: PaymentRequest, config: PaymentProviderConfig): Promise<PaymentResponse>;

  /**
   * Vérifie le statut d'un paiement en appelant l'API du provider
   */
  abstract getPaymentStatus(transaction: PaymentTransaction, config: PaymentProviderConfig): Promise<PaymentResponse>;

  /**
   * Annule un paiement non encore finalisé
   */
  abstract cancelPayment(transaction: PaymentTransaction, config: PaymentProviderConfig): Promise<boolean>;

  /**
   * Effectue un remboursement
   */
  abstract refundPayment(transaction: PaymentTransaction, amount: number, config: PaymentProviderConfig): Promise<boolean>;

  /**
   * Vérifie la signature et l'authenticité d'un webhook
   */
  abstract verifyWebhook(rawPayload: any, signature: string, config: PaymentProviderConfig): WebhookVerificationResult;
}
