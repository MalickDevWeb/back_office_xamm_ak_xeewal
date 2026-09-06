import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../core/security/permission.guard';
import { FinancialDashboardService } from '../../../../../features/finance/services/financial-dashboard.service';

/**
 * GET /api/v1/financial/dashboard
 * Tableau de bord financier complet de l'organisation.
 *
 * Retourne :
 * - Solde global et projeté
 * - Solde mensuel (crédit / débit / net)
 * - Solde par compte financier actif
 * - Stats cotisations par statut
 * - Actions en attente (paiements manuels, dépenses)
 * - Activité récente (30 derniers mouvements)
 * - Remboursements récents
 */
async function handler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const data = await FinancialDashboardService.getDashboard(organizationId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.dashboard.read', handler);
