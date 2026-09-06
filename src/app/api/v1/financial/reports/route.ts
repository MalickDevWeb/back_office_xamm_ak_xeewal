import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../core/security/permission.guard';
import { FinancialDashboardService } from '../../../../../features/finance/services/financial-dashboard.service';

/**
 * GET /api/v1/financial/reports
 * Rapport financier périodique (mensuel ou annuel).
 *
 * Query params:
 * - period : 'month' (défaut) | 'year'
 * - year   : année (défaut : année en cours). Ex: 2026
 * - month  : mois 1-12 (défaut : mois en cours, ignoré si period=year)
 *
 * Retourne :
 * - Mouvements groupés par type et direction
 * - Dépenses par catégorie et statut
 * - Cotisations créées dans la période
 * - Total des remboursements
 */
async function handler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const { searchParams } = new URL(request.url);

    const period = (searchParams.get('period') || 'month') as 'month' | 'year';
    if (!['month', 'year'].includes(period)) {
      return NextResponse.json({
        success: false,
        message: "Le paramètre period doit être 'month' ou 'year'"
      }, { status: 400 });
    }

    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ success: false, message: 'Année invalide' }, { status: 400 });
    }
    if (period === 'month' && (isNaN(month) || month < 1 || month > 12)) {
      return NextResponse.json({ success: false, message: 'Mois invalide (1-12)' }, { status: 400 });
    }

    // Construire la date de référence
    const refDate = period === 'month'
      ? new Date(year, month - 1, 1)
      : new Date(year, 0, 1);

    const data = await FinancialDashboardService.getReport(organizationId, period, refDate);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.reports.read', handler);
