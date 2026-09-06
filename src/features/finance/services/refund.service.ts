import { prisma } from '../../../core/lib/prisma';
import { Prisma } from '@prisma/client';
import { FinancialMovementService } from './financial-movement.service';

export class RefundService {
  /**
   * Effectue un remboursement (partiel ou total) sur une transaction confirmée.
   * Crée un mouvement DEBIT et un enregistrement Refund.
   *
   * Règles :
   * - La transaction doit être SUCCESS ou PARTIALLY_REFUNDED.
   * - Le montant remboursé ne peut pas dépasser le montant net non encore remboursé.
   * - Crée un FinancialMovement DEBIT atomiquement.
   */
  static async refundPayment(
    transactionId: string,
    organizationId: string,
    amount: number,
    reason: string,
    refundedBy: string,
    accountId: string
  ) {
    if (amount <= 0) {
      throw new Error('Le montant du remboursement doit être strictement positif');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Charger la transaction avec les remboursements existants
      const transaction = await tx.paymentTransaction.findFirst({
        where: { id: transactionId, organizationId },
        include: { refunds: { where: { status: 'COMPLETED' } } }
      });

      if (!transaction) {
        throw new Error('Transaction non trouvée');
      }

      if (!['SUCCESS', 'PARTIALLY_REFUNDED'].includes(transaction.status)) {
        throw new Error(`Impossible de rembourser une transaction en statut ${transaction.status}`);
      }

      // 2. Calculer le montant déjà remboursé
      const alreadyRefunded = transaction.refunds.reduce((sum, r) => sum + r.amount, 0);
      const refundable = transaction.amount - alreadyRefunded;

      if (amount > refundable) {
        throw new Error(
          `Montant demandé (${amount}) dépasse le montant remboursable (${refundable}). Déjà remboursé : ${alreadyRefunded}`
        );
      }

      // 3. Créer le mouvement DEBIT (remboursement = argent qui sort)
      const movement = await FinancialMovementService.createMovement(
        {
          organizationId,
          financialAccountId: accountId,
          type: 'REMBOURSEMENT',
          direction: 'DEBIT',
          amount,
          currency: transaction.currency,
          sourceType: 'REFUND',
          sourceId: transactionId,
          externalReference: transaction.providerTransactionId || undefined,
          createdBy: refundedBy,
        },
        tx
      );

      // 4. Enregistrer le Refund
      const refund = await tx.refund.create({
        data: {
          organizationId,
          paymentTransactionId: transactionId,
          amount,
          currency: transaction.currency,
          reason,
          status: 'COMPLETED',
          financialMovementId: movement.id,
          createdBy: refundedBy,
        }
      });

      // 5. Mettre à jour le statut de la transaction
      const newRefundedTotal = alreadyRefunded + amount;
      const newStatus = newRefundedTotal >= transaction.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      await tx.paymentTransaction.update({
        where: { id: transactionId },
        data: { status: newStatus }
      });

      // 6. Si la transaction est liée à un paiement de cotisation, mettre à jour son statut
      const contribPayment = await tx.contributionPayment.findUnique({
        where: { paymentTransactionId: transactionId }
      });
      if (contribPayment) {
        await tx.contributionPayment.update({
          where: { id: contribPayment.id },
          data: { status: newStatus === 'REFUNDED' ? 'REFUNDED' : 'PARTIALLY_REFUNDED' }
        });
      }

      // 7. Audit
      await tx.auditLog.create({
        data: {
          organizationId,
          actorId: refundedBy,
          action: 'PAYMENT_REFUNDED',
          entityType: 'PaymentTransaction',
          entityId: transactionId,
          metadata: { amount, reason, refundId: refund.id, newStatus } as any
        }
      });

      return refund;
    });
  }

  /**
   * Liste les remboursements d'une organisation.
   */
  static async getRefunds(organizationId: string) {
    return prisma.refund.findMany({
      where: { organizationId },
      include: {
        paymentTransaction: { select: { id: true, provider: true, amount: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
