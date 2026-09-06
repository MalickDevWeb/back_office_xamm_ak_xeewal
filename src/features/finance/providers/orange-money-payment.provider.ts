import { PaymentProviderConfig, PaymentTransaction } from '@prisma/client';
import { PaymentProviderInterface, PaymentRequest, PaymentResponse, WebhookVerificationResult } from './payment-provider.interface';

export class OrangeMoneyPaymentProvider extends PaymentProviderInterface {
  
  async createPayment(request: PaymentRequest, config: PaymentProviderConfig): Promise<PaymentResponse> {
    // Bouchon : Appel à l'API de Orange Money
    return {
      success: true,
      status: 'PENDING',
      providerTransactionId: `OM-TX-${Date.now()}`,
      checkoutUrl: `https://api.orangemoney.com/checkout/${request.idempotencyKey}` // URL fictive
    };
  }

  async getPaymentStatus(transaction: PaymentTransaction, config: PaymentProviderConfig): Promise<PaymentResponse> {
    return {
      success: true,
      status: transaction.status as any,
    };
  }

  async cancelPayment(transaction: PaymentTransaction, config: PaymentProviderConfig): Promise<boolean> {
    return true; 
  }

  async refundPayment(transaction: PaymentTransaction, amount: number, config: PaymentProviderConfig): Promise<boolean> {
    return true;
  }

  verifyWebhook(rawPayload: any, signature: string, config: PaymentProviderConfig): WebhookVerificationResult {
    return { 
      isValid: true,
      transactionId: rawPayload?.idempotencyKey || rawPayload?.transaction_id
    };
  }
}
