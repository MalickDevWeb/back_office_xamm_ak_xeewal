import { prisma } from '../../../lib/prisma';
import { PaymentProviderFactory } from '../providers/payment-provider.factory';
import { FinancialMovementService } from './financial-movement.service';

export class PaymentService {
  /**
   * Crée une transaction de paiement avec le provider sélectionné
   */
  static async createPaymentTransaction(
    organizationId: string,
    provider: string,
    amount: number,
    idempotencyKey: string,
    contributionId?: string
  ) {
    // 1. Vérification Idempotence
    const existing = await prisma.paymentTransaction.findUnique({
      where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } }
    });
    if (existing) return existing;

    // 2. Vérifier si le provider est activé
    const config = await prisma.paymentProviderConfig.findUnique({
      where: { organizationId_provider: { organizationId, provider } }
    });
    
    if (!config || !config.enabled) {
      throw new Error(`Provider ${provider} non configuré ou désactivé.`);
    }

    // 3. Obtenir l'abstraction du provider
    const providerInstance = PaymentProviderFactory.getProvider(provider);
    const response = await providerInstance.createPayment({
      organizationId,
      amount,
      currency: 'XOF',
      idempotencyKey
    }, config);

    // 4. Créer la transaction en BD
    return await prisma.paymentTransaction.create({
      data: {
        organizationId,
        provider,
        amount,
        currency: 'XOF',
        status: response.status,
        idempotencyKey,
        providerTransactionId: response.providerTransactionId,
        checkoutUrl: response.checkoutUrl,
        failureCode: response.failureCode,
        failureMessage: response.failureMessage,
        contributionPayments: contributionId ? {
          create: {
            organizationId,
            contributionId,
            amount,
            currency: 'XOF',
            paymentMethod: provider,
            reference: idempotencyKey,
            status: response.status,
          }
        } : undefined
      }
    });
  }

  /**
   * Confirme une transaction (ex: suite à un webhook ou validation manuelle)
   */
  static async confirmPayment(transactionId: string, accountId: string, confirmedBy?: string) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.findUnique({
        where: { id: transactionId },
        include: { contributionPayments: true }
      });

      if (!transaction) throw new Error("Transaction non trouvée");
      if (transaction.status === 'SUCCESS') throw new Error("Transaction déjà confirmée");

      // 1. Mettre à jour la transaction
      const updatedTx = await tx.paymentTransaction.update({
        where: { id: transactionId },
        data: { status: 'SUCCESS' }
      });

      // 2. Mettre à jour le paiement de cotisation lié
      let updatedPayment = null;
      if (transaction.contributionPayments) {
        updatedPayment = await tx.contributionPayment.update({
          where: { id: transaction.contributionPayments.id },
          data: { status: 'CONFIRMED', confirmedBy, confirmedAt: new Date() }
        });

        // 3. Mettre à jour le statut global de la contribution
        const contrib = await tx.contribution.findUnique({
          where: { id: updatedPayment.contributionId },
          include: { payments: true }
        });
        
        if (contrib) {
          const totalPaid = contrib.payments
            .filter(p => p.status === 'CONFIRMED' || p.id === updatedPayment!.id)
            .reduce((sum, p) => sum + p.amount, 0);
            
          const newStatus = totalPaid >= contrib.expectedAmount ? 'PAYEE' : 'PARTIELLEMENT_PAYEE';
          
          await tx.contribution.update({
            where: { id: contrib.id },
            data: { status: newStatus }
          });
        }
      }

      // 4. Créer le mouvement financier atomique
      const movement = await FinancialMovementService.createMovement({
        organizationId: transaction.organizationId,
        financialAccountId: accountId,
        type: updatedPayment ? 'COTISATION' : 'AUTRE_ENCAISSEMENT',
        direction: 'CREDIT',
        amount: transaction.amount,
        currency: transaction.currency,
        sourceType: 'PAYMENT_TRANSACTION',
        sourceId: transaction.id,
        externalReference: transaction.providerTransactionId || undefined,
        createdBy: confirmedBy
      }, tx);

      // 5. Lier le mouvement au paiement
      if (updatedPayment) {
        await tx.contributionPayment.update({
          where: { id: updatedPayment.id },
          data: { financialMovementId: movement.id }
        });
      }

      // 6. AuditLog
      await tx.auditLog.create({
        data: {
          organizationId: transaction.organizationId,
          actorId: confirmedBy,
          action: 'PAYMENT_CONFIRMED',
          entityType: 'PaymentTransaction',
          entityId: transaction.id,
        }
      });

      return updatedTx;
    });
  }

  /**
   * Rejeter un paiement manuel
   */
  static async rejectManualPayment(transactionId: string, rejectedReason: string, rejectedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED', failureMessage: rejectedReason },
        include: { contributionPayments: true }
      });

      if (transaction.contributionPayments) {
        await tx.contributionPayment.update({
          where: { id: transaction.contributionPayments.id },
          data: { status: 'REJECTED', rejectedReason, confirmedBy: rejectedBy, confirmedAt: new Date() }
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: transaction.organizationId,
          actorId: rejectedBy,
          action: 'PAYMENT_REJECTED',
          entityType: 'PaymentTransaction',
          entityId: transaction.id,
          metadata: { rejectedReason }
        }
      });

      return transaction;
    });
  }
}
