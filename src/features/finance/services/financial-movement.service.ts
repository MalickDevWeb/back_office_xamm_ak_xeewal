import { prisma } from '../../../lib/prisma';
import { FinancialMovement, Prisma } from '@prisma/client';

export class FinancialMovementService {
  /**
   * Crée un mouvement financier de façon transactionnelle.
   * Doit généralement être appelé à l'intérieur d'une transaction Prisma parente.
   */
  static async createMovement(
    data: {
      organizationId: string;
      financialAccountId: string;
      type: string;
      direction: 'CREDIT' | 'DEBIT';
      amount: number;
      currency?: string;
      sourceType: string;
      sourceId: string;
      internalReference?: string;
      externalReference?: string;
      reversalOfId?: string;
      notes?: string;
      createdBy?: string;
    },
    tx?: Omit<Prisma.TransactionClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
  ): Promise<FinancialMovement> {
    const db = tx || prisma;
    
    // Si c'est un renversement, on vérifie que le mouvement original existe
    if (data.reversalOfId) {
      const original = await db.financialMovement.findUnique({
        where: { id: data.reversalOfId }
      });
      if (!original) throw new Error('Mouvement original non trouvé pour le reversement');
    }

    return await db.financialMovement.create({
      data: {
        organizationId: data.organizationId,
        financialAccountId: data.financialAccountId,
        type: data.type,
        direction: data.direction,
        amount: data.amount,
        currency: data.currency || 'XOF',
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        internalReference: data.internalReference,
        externalReference: data.externalReference,
        reversalOfId: data.reversalOfId,
        notes: data.notes,
        createdBy: data.createdBy,
      }
    });
  }

  /**
   * Calcule le solde d'un compte.
   * Somme(CREDIT) - Somme(DEBIT)
   */
  static async getAccountBalance(accountId: string, organizationId: string): Promise<number> {
    const movements = await prisma.financialMovement.groupBy({
      by: ['direction'],
      where: {
        financialAccountId: accountId,
        organizationId: organizationId,
      },
      _sum: {
        amount: true,
      },
    });

    let credit = 0;
    let debit = 0;

    for (const mov of movements) {
      if (mov.direction === 'CREDIT') credit = mov._sum.amount || 0;
      if (mov.direction === 'DEBIT') debit = mov._sum.amount || 0;
    }

    return credit - debit;
  }

  static async getOrganizationBalance(organizationId: string): Promise<number> {
    const movements = await prisma.financialMovement.groupBy({
      by: ['direction'],
      where: {
        organizationId: organizationId,
        account: {
          status: 'ACTIVE' // Uniquement les comptes actifs
        }
      },
      _sum: {
        amount: true,
      },
    });

    let credit = 0;
    let debit = 0;

    for (const mov of movements) {
      if (mov.direction === 'CREDIT') credit = mov._sum.amount || 0;
      if (mov.direction === 'DEBIT') debit = mov._sum.amount || 0;
    }

    return credit - debit;
  }
}
