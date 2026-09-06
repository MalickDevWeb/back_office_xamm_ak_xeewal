import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../core/security/permission.guard';
import { prisma } from '../../../../../core/lib/prisma';

// GET /api/v1/payments/[id]
async function getPaymentHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';

    const transaction = await prisma.paymentTransaction.findFirst({
      where: { id: params.id, organizationId },
      include: {
        contributionPayments: {
          include: {
            contribution: {
              include: {
                Adherent: { select: { id: true, prenom: true, nom: true, email: true } },
                contributionType: { select: { id: true, name: true } }
              }
            }
          }
        },
        refunds: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction non trouvée' }, { status: 404 });
    }

    const totalRefunded = transaction.refunds.reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      success: true,
      data: { ...transaction, totalRefunded, refundableAmount: transaction.amount - totalRefunded }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.payments.read', getPaymentHandler);
