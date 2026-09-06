import { prisma } from '../../../core/lib/prisma';

export class FinancialDashboardService {
  /**
   * Calcule le tableau de bord financier complet pour une organisation.
   * Toutes les valeurs monétaires sont en entiers (XOF, pas de float).
   */
  static async getDashboard(organizationId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // ─── Requêtes parallèles ────────────────────────────────────────────────
    const [
      // Mouvements par direction (solde global)
      movementsByDirection,
      // Mouvements du mois en cours
      monthlyMovements,
      // Comptes financiers avec leur solde calculé
      accounts,
      // Cotisations par statut
      contributionStats,
      // Dépenses en attente de validation
      pendingExpenses,
      // Paiements manuels en attente de confirmation
      pendingManualPayments,
      // Remboursements en cours
      recentRefunds,
      // Activité récente (derniers 30 mouvements)
      recentMovements,
    ] = await Promise.all([
      // 1. Solde global (tous les mouvements confirmés)
      prisma.financialMovement.groupBy({
        by: ['direction'],
        where: { organizationId, account: { status: 'ACTIVE' } },
        _sum: { amount: true },
      }),

      // 2. Mouvements du mois
      prisma.financialMovement.groupBy({
        by: ['direction'],
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
          account: { status: 'ACTIVE' }
        },
        _sum: { amount: true },
      }),

      // 3. Comptes actifs avec mouvements pour calculer solde par compte
      prisma.financialAccount.findMany({
        where: { organizationId, status: 'ACTIVE' },
        include: {
          movements: {
            select: { direction: true, amount: true }
          }
        }
      }),

      // 4. Stats cotisations
      prisma.contribution.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { id: true },
        _sum: { expectedAmount: true },
      }),

      // 5. Dépenses en attente de validation
      prisma.expense.findMany({
        where: { organizationId, status: 'EN_ATTENTE_DE_VALIDATION' },
        select: { id: true, amount: true, category: true, beneficiary: true, createdAt: true }
      }),

      // 6. Paiements manuels en attente
      prisma.paymentTransaction.count({
        where: { organizationId, provider: 'MANUAL', status: 'PENDING_CONFIRMATION' }
      }),

      // 7. Remboursements récents (30 derniers jours)
      prisma.refund.findMany({
        where: {
          organizationId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        select: { id: true, amount: true, status: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // 8. Mouvements récents pour le feed d'activité
      prisma.financialMovement.findMany({
        where: { organizationId },
        select: {
          id: true, type: true, direction: true, amount: true, currency: true,
          sourceType: true, createdAt: true,
          account: { select: { id: true, name: true, type: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    // ─── Calculs ────────────────────────────────────────────────────────────

    // Solde global
    let totalCredit = 0;
    let totalDebit = 0;
    for (const m of movementsByDirection) {
      if (m.direction === 'CREDIT') totalCredit = m._sum.amount ?? 0;
      if (m.direction === 'DEBIT') totalDebit = m._sum.amount ?? 0;
    }
    const globalBalance = totalCredit - totalDebit;

    // Solde du mois
    let monthlyCredit = 0;
    let monthlyDebit = 0;
    for (const m of monthlyMovements) {
      if (m.direction === 'CREDIT') monthlyCredit = m._sum.amount ?? 0;
      if (m.direction === 'DEBIT') monthlyDebit = m._sum.amount ?? 0;
    }

    // Solde par compte
    const accountBalances = accounts.map((acc) => {
      const credit = acc.movements
        .filter((m) => m.direction === 'CREDIT')
        .reduce((s, m) => s + m.amount, 0);
      const debit = acc.movements
        .filter((m) => m.direction === 'DEBIT')
        .reduce((s, m) => s + m.amount, 0);
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        currency: acc.currency,
        balance: credit - debit,
      };
    });

    // Stats cotisations
    const contributionSummary = {
      total: 0,
      totalExpectedAmount: 0,
      byStatus: {} as Record<string, { count: number; expectedAmount: number }>,
    };
    for (const stat of contributionStats) {
      contributionSummary.total += stat._count.id;
      contributionSummary.totalExpectedAmount += stat._sum.expectedAmount ?? 0;
      contributionSummary.byStatus[stat.status] = {
        count: stat._count.id,
        expectedAmount: stat._sum.expectedAmount ?? 0,
      };
    }

    // Dépenses en attente : montant total
    const pendingExpensesTotal = pendingExpenses.reduce((s, e) => s + e.amount, 0);

    // Solde projeté (spec §35) : solde disponible - dépenses validées non payées
    const validatedButUnpaidExpenses = await prisma.expense.aggregate({
      where: { organizationId, status: 'VALIDEE' },
      _sum: { amount: true }
    });
    const projectedBalance = globalBalance - (validatedButUnpaidExpenses._sum.amount ?? 0);

    return {
      currency: 'XOF',
      // Soldes
      globalBalance,
      projectedBalance,
      totalCredit,
      totalDebit,
      // Mois en cours
      monthly: {
        credit: monthlyCredit,
        debit: monthlyDebit,
        net: monthlyCredit - monthlyDebit,
      },
      // Par compte
      accounts: accountBalances,
      // Cotisations
      contributions: contributionSummary,
      // Actions en attente
      pending: {
        manualPayments: pendingManualPayments,
        expenses: pendingExpenses.length,
        expensesTotal: pendingExpensesTotal,
        pendingExpensesList: pendingExpenses,
      },
      // Activité récente
      recentMovements,
      recentRefunds,
      // Meta
      generatedAt: now.toISOString(),
    };
  }

  /**
   * Rapport mensuel ou annuel.
   */
  static async getReport(organizationId: string, period: 'month' | 'year', date?: Date) {
    const ref = date || new Date();
    let from: Date;
    let to: Date;

    if (period === 'month') {
      from = new Date(ref.getFullYear(), ref.getMonth(), 1);
      to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
    } else {
      from = new Date(ref.getFullYear(), 0, 1);
      to = new Date(ref.getFullYear(), 11, 31, 23, 59, 59);
    }

    const [movementsByType, expensesByCategory, contributionsByType, totalRefunds] = await Promise.all([
      // Mouvements groupés par type et direction
      prisma.financialMovement.groupBy({
        by: ['type', 'direction'],
        where: { organizationId, createdAt: { gte: from, lte: to } },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Dépenses par catégorie
      prisma.expense.groupBy({
        by: ['category', 'status'],
        where: {
          organizationId,
          createdAt: { gte: from, lte: to },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Cotisations créées dans la période
      prisma.contribution.groupBy({
        by: ['status'],
        where: { organizationId, createdAt: { gte: from, lte: to } },
        _sum: { expectedAmount: true },
        _count: { id: true },
      }),

      // Remboursements
      prisma.refund.aggregate({
        where: { organizationId, createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      period,
      from: from.toISOString(),
      to: to.toISOString(),
      currency: 'XOF',
      movements: movementsByType,
      expensesByCategory,
      contributions: contributionsByType,
      refunds: {
        count: totalRefunds._count.id,
        total: totalRefunds._sum.amount ?? 0,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
