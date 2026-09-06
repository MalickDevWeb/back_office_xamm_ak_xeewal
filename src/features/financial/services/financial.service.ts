import { prisma } from '@/core/lib/prisma';
import { FinancialMovement, FinancialAccount } from '@prisma/client';

export class FinancialService {
  /**
   * Calcule le solde courant d'un compte financier
   */
  async getAccountBalance(accountId: string): Promise<number> {
    const movements = await prisma.financialMovement.findMany({
      where: { financialAccountId: accountId },
    });

    return movements.reduce((balance, movement) => {
      if (movement.direction === 'CREDIT') {
        return balance + movement.amount;
      } else {
        return balance - movement.amount;
      }
    }, 0);
  }

  /**
   * Crée un nouveau mouvement financier
   */
  async createMovement(data: {
    organizationId: string;
    financialAccountId: string;
    type: string;
    direction: 'CREDIT' | 'DEBIT';
    amount: number;
    currency?: string;
    sourceType: string;
    sourceId: string;
    externalReference?: string;
    internalReference?: string;
    createdBy: string;
  }): Promise<FinancialMovement> {
    if (data.amount <= 0) {
      throw new Error('Le montant du mouvement doit être strictement positif');
    }

    const account = await prisma.financialAccount.findUnique({
      where: { id: data.financialAccountId },
    });

    if (!account) {
      throw new Error('Compte financier introuvable');
    }

    if (account.organizationId !== data.organizationId) {
      throw new Error("Le compte n'appartient pas à cette organisation");
    }

    return await prisma.financialMovement.create({
      data: {
        organizationId: data.organizationId,
        financialAccountId: data.financialAccountId,
        type: data.type,
        direction: data.direction,
        amount: data.amount,
        currency: data.currency || 'XOF',
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        externalReference: data.externalReference,
        internalReference: data.internalReference,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Annule un mouvement financier existant
   */
  async reverseMovement(
    movementId: string,
    reason: string,
    createdBy: string
  ): Promise<FinancialMovement> {
    return await prisma.$transaction(async (tx) => {
      const originalMovement = await tx.financialMovement.findUnique({
        where: { id: movementId },
      });

      if (!originalMovement) {
        throw new Error('Mouvement introuvable');
      }

      const existingReversal = await tx.financialMovement.findFirst({
        where: { reversalOfId: originalMovement.id },
      });

      if (existingReversal) {
        throw new Error('Ce mouvement a déjà été annulé');
      }

      return await tx.financialMovement.create({
        data: {
          organizationId: originalMovement.organizationId,
          financialAccountId: originalMovement.financialAccountId,
          type: 'ANNULATION',
          direction: originalMovement.direction === 'CREDIT' ? 'DEBIT' : 'CREDIT',
          amount: originalMovement.amount,
          currency: originalMovement.currency,
          sourceType: originalMovement.sourceType,
          sourceId: originalMovement.sourceId,
          internalReference: `REVERSAL-${originalMovement.id.substring(0, 8)}`,
          externalReference: reason,
          reversalOfId: originalMovement.id,
          createdBy,
        },
      });
    });
  }
}
