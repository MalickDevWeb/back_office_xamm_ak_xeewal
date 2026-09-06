import { prisma } from '../../../lib/prisma';
import { FinancialMovementService } from './financial-movement.service';

export class ExpenseService {
  
  static async createExpense(data: {
    organizationId: string;
    category: string;
    amount: number;
    currency?: string;
    beneficiary: string;
    reason: string;
    createdBy: string;
  }) {
    return await prisma.expense.create({
      data: {
        organizationId: data.organizationId,
        category: data.category,
        amount: data.amount,
        currency: data.currency || 'XOF',
        beneficiary: data.beneficiary,
        reason: data.reason,
        createdBy: data.createdBy,
        status: 'BROUILLON'
      }
    });
  }

  static async submitExpense(expenseId: string, submittedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id: expenseId, status: 'BROUILLON' },
        data: { status: 'EN_ATTENTE_DE_VALIDATION', submittedBy, submittedAt: new Date() }
      });
      
      await tx.expenseStatusHistory.create({
        data: { expenseId, fromStatus: 'BROUILLON', toStatus: 'EN_ATTENTE_DE_VALIDATION', changedBy: submittedBy }
      });

      return expense;
    });
  }

  static async approveExpense(expenseId: string, approvedBy: string) {
    return await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id: expenseId, status: 'EN_ATTENTE_DE_VALIDATION' },
        data: { status: 'VALIDEE', approvedBy, approvedAt: new Date() }
      });

      await tx.expenseStatusHistory.create({
        data: { expenseId, fromStatus: 'EN_ATTENTE_DE_VALIDATION', toStatus: 'VALIDEE', changedBy: approvedBy }
      });

      return expense;
    });
  }

  static async rejectExpense(expenseId: string, rejectedBy: string, reason: string) {
    return await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.update({
        where: { id: expenseId, status: 'EN_ATTENTE_DE_VALIDATION' },
        data: { status: 'BROUILLON', rejectedReason: reason } // Retourne en brouillon
      });

      await tx.expenseStatusHistory.create({
        data: { expenseId, fromStatus: 'EN_ATTENTE_DE_VALIDATION', toStatus: 'BROUILLON', reason, changedBy: rejectedBy }
      });

      return expense;
    });
  }

  static async payExpense(expenseId: string, accountId: string, paidBy: string) {
    return await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id: expenseId } });
      if (!expense) throw new Error("Dépense non trouvée");
      if (expense.status !== 'VALIDEE') throw new Error("La dépense doit être validée avant paiement");

      // Créer le mouvement de débit
      const movement = await FinancialMovementService.createMovement({
        organizationId: expense.organizationId,
        financialAccountId: accountId,
        type: 'DEPENSE',
        direction: 'DEBIT',
        amount: expense.amount,
        currency: expense.currency,
        sourceType: 'EXPENSE',
        sourceId: expense.id,
        createdBy: paidBy
      }, tx);

      // Mettre à jour la dépense
      const updatedExpense = await tx.expense.update({
        where: { id: expenseId },
        data: { 
          status: 'PAYEE', 
          paidBy, 
          paidAt: new Date(),
          financialAccountId: accountId,
          financialMovementId: movement.id 
        }
      });

      await tx.expenseStatusHistory.create({
        data: { expenseId, fromStatus: 'VALIDEE', toStatus: 'PAYEE', changedBy: paidBy }
      });

      await tx.auditLog.create({
        data: {
          organizationId: expense.organizationId,
          actorId: paidBy,
          action: 'EXPENSE_PAID',
          entityType: 'Expense',
          entityId: expense.id
        }
      });

      return updatedExpense;
    });
  }
}
