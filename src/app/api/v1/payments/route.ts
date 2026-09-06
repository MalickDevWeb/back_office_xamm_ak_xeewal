import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../core/security/permission.guard';
import { prisma } from '../../../../core/lib/prisma';

// GET /api/v1/payments — liste des transactions de paiement
async function getPaymentsHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const provider = searchParams.get('provider') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (provider) where.provider = provider;

    const [data, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        include: {
          contributionPayments: {
            include: {
              contribution: {
                select: {
                  id: true,
                  expectedAmount: true,
                  Adherent: { select: { id: true, prenom: true, nom: true } }
                }
              }
            }
          },
          refunds: { select: { id: true, amount: true, status: true, createdAt: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentTransaction.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.payments.read', getPaymentsHandler);
