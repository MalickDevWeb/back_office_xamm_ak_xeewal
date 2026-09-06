import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../core/security/permission.guard';
import { prisma } from '../../../../../../core/lib/prisma';

// POST /api/v1/payments/[id]/cancel
async function cancelPaymentHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const userId = request.headers.get('x-user-id') || 'UNKNOWN';

    const transaction = await prisma.paymentTransaction.findFirst({
      where: { id: params.id, organizationId }
    });

    if (!transaction) {
      return NextResponse.json({ success: false, message: 'Transaction non trouvée' }, { status: 404 });
    }

    // Seules les transactions PENDING ou CREATED peuvent être annulées
    const cancellableStatuses = ['CREATED', 'PENDING', 'PENDING_CONFIRMATION'];
    if (!cancellableStatuses.includes(transaction.status)) {
      return NextResponse.json({
        success: false,
        message: `Impossible d'annuler une transaction en statut ${transaction.status}`
      }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.paymentTransaction.update({
        where: { id: params.id },
        data: { status: 'CANCELLED' }
      });

      // Annuler aussi le ContributionPayment lié si présent
      await tx.contributionPayment.updateMany({
        where: { paymentTransactionId: params.id, status: 'PENDING' },
        data: { status: 'CANCELLED' }
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorId: userId,
          action: 'PAYMENT_CANCELLED',
          entityType: 'PaymentTransaction',
          entityId: params.id,
        }
      });

      return result;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const POST = requirePermission('finance.payments.cancel', cancelPaymentHandler);
