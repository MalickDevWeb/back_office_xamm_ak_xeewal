import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../core/security/permission.guard';
import { prisma } from '../../../../../core/lib/prisma';

/**
 * GET /api/v1/financial/movements
 * Journal des mouvements financiers avec pagination et filtres.
 *
 * Query params:
 * - type        : COTISATION | DEPENSE | REMBOURSEMENT | AUTRE_ENCAISSEMENT | ANNULATION | AJUSTEMENT
 * - direction   : CREDIT | DEBIT
 * - accountId   : filtre par compte financier
 * - from        : date ISO (createdAt >= from)
 * - to          : date ISO (createdAt <= to)
 * - page, limit : pagination (défaut 1, 50)
 */
async function listMovementsHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') || undefined;
    const direction = searchParams.get('direction') || undefined;
    const accountId = searchParams.get('accountId') || undefined;
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined;
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (type) where.type = type;
    if (direction) where.direction = direction;
    if (accountId) where.financialAccountId = accountId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [data, total] = await Promise.all([
      prisma.financialMovement.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.financialMovement.count({ where }),
    ]);

    // Calcul du sous-total de la page (utile pour les rapports partiels)
    const pageCredit = data
      .filter((m) => m.direction === 'CREDIT')
      .reduce((s, m) => s + m.amount, 0);
    const pageDebit = data
      .filter((m) => m.direction === 'DEBIT')
      .reduce((s, m) => s + m.amount, 0);

    return NextResponse.json({
      success: true,
      data,
      meta: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        pageCredit,
        pageDebit,
        pageNet: pageCredit - pageDebit,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.movements.read', listMovementsHandler);
