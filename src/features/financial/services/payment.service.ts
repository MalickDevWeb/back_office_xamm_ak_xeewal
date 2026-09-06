import { prisma } from '@/core/lib/prisma';
import { PaymentProviderInterface, PaymentProviderContext } from './payment-provider.interface';
import { ManualPaymentProvider } from './manual-payment.provider';
import { PaymentTransaction } from '@prisma/client';

export class PaymentService {
  private providers: Map<string, PaymentProviderInterface>;

  constructor() {
    this.providers = new Map();
    this.registerProvider(new ManualPaymentProvider());
    // TODO: Register WavePaymentProvider and OrangeMoneyPaymentProvider when ready
  }

  registerProvider(provider: PaymentProviderInterface) {
    this.providers.set(provider.getProviderId(), provider);
  }

  getProvider(providerId: string): PaymentProviderInterface {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Fournisseur de paiement non supporté : ${providerId}`);
    }
    return provider;
  }

  async initiatePayment(data: {
    organizationId: string;
    provider: string; // MANUAL, WAVE, ORANGE_MONEY
    amount: number;
    currency?: string;
    paymentMethod: string;
  }): Promise<{ transaction: PaymentTransaction; checkoutUrl?: string }> {
    const providerImpl = this.getProvider(data.provider);

    // Vérifier la configuration du provider pour cette organisation
    const config = await prisma.paymentProviderConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId: data.organizationId,
          provider: data.provider,
        },
      },
    });

    if (!config || !config.enabled) {
      throw new Error(`Le fournisseur de paiement ${data.provider} n'est pas activé.`);
    }

    const idempotencyKey = `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // 1. Créer la transaction locale
    const transaction = await prisma.paymentTransaction.create({
      data: {
        organizationId: data.organizationId,
        provider: data.provider,
        amount: data.amount,
        currency: data.currency || 'XOF',
        paymentMethod: data.paymentMethod,
        idempotencyKey,
        status: 'CREATED',
      },
    });

    const context: PaymentProviderContext = {
      organizationId: data.organizationId,
      transaction,
    };

    // 2. Initier auprès du provider externe
    const providerResponse = await providerImpl.createPayment(
      data.amount,
      data.currency || 'XOF',
      idempotencyKey,
      context
    );

    if (!providerResponse.success) {
      const failedTransaction = await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          failureMessage: providerResponse.error || 'Erreur inconnue',
        },
      });
      return { transaction: failedTransaction };
    }

    // 3. Mettre à jour avec la référence externe
    const updatedTransaction = await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: data.provider === 'MANUAL' ? 'PENDING_CONFIRMATION' : 'PENDING',
        externalReference: providerResponse.externalReference,
        providerTransactionId: providerResponse.providerTransactionId,
        checkoutUrl: providerResponse.checkoutUrl,
      },
    });

    return { transaction: updatedTransaction, checkoutUrl: providerResponse.checkoutUrl };
  }

  async confirmManualPayment(transactionId: string, confirmedBy: string) {
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction || transaction.provider !== 'MANUAL') {
      throw new Error('Transaction invalide pour une confirmation manuelle.');
    }

    if (transaction.status !== 'PENDING_CONFIRMATION') {
      throw new Error('La transaction n\'est pas en attente de confirmation.');
    }

    return await prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        status: 'SUCCESS',
        metadata: { confirmedBy, confirmedAt: new Date().toISOString() },
      },
    });
  }
}
