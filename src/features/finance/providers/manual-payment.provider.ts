import { PaymentProviderConfig, PaymentTransaction } from '@prisma/client';
import { PaymentProviderInterface, PaymentRequest, PaymentResponse, WebhookVerificationResult } from './payment-provider.interface';

export class ManualPaymentProvider extends PaymentProviderInterface {
  
  async createPayment(request: PaymentRequest, config: PaymentProviderConfig): Promise<PaymentResponse> {
    // Le paiement manuel est instantanément mis en attente de confirmation par le trésorier
    return {
      success: true,
      status: 'PENDING_CONFIRMATION',
      providerTransactionId: `MANUAL-${request.idempotencyKey}` // Simulation
    };
  }

  async getPaymentStatus(transaction: PaymentTransaction, config: PaymentProviderConfig): Promise<PaymentResponse> {
    // Pour le paiement manuel, le statut est géré en interne via le dashboard, pas d'API externe à appeler
    return {
      success: true,
      status: transaction.status as any,
    };
  }

  async cancelPayment(transaction: PaymentTransaction, config: PaymentProviderConfig): Promise<boolean> {
    // Un paiement manuel peut être annulé avant sa confirmation
    return true; 
  }

  async refundPayment(transaction: PaymentTransaction, amount: number, config: PaymentProviderConfig): Promise<boolean> {
    // Le remboursement est manuel aussi
    return true;
  }

  verifyWebhook(rawPayload: any, signature: string, config: PaymentProviderConfig): WebhookVerificationResult {
    // Pas de webhooks pour les paiements manuels
    return { isValid: false };
  }
}
