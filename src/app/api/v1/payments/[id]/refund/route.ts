import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../core/security/permission.guard';
import { RefundService } from '../../../../../../features/finance/services/refund.service';
import { prisma } from '../../../../../../core/lib/prisma';

// POST /api/v1/payments/[id]/refund
async function refundPaymentHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const userId = request.headers.get('x-user-id') || 'UNKNOWN';
    const body = await request.json();

    const { amount, reason, accountId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Montant invalide' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ success: false, message: 'La raison du remboursement est obligatoire' }, { status: 400 });
    }

    // Si accountId non fourni, chercher le compte par défaut de l'organisation
    let resolvedAccountId = accountId;
    if (!resolvedAccountId) {
      const defaultAccount = await prisma.financialAccount.findFirst({
        where: { organizationId, status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      });
      if (!defaultAccount) {
        return NextResponse.json({ success: false, message: 'Aucun compte financier actif trouvé' }, { status: 400 });
      }
      resolvedAccountId = defaultAccount.id;
    }

    const refund = await RefundService.refundPayment(
      params.id,
      organizationId,
      Math.round(amount),
      reason,
      userId,
      resolvedAccountId
    );

    return NextResponse.json({ success: true, data: refund }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const POST = requirePermission('finance.payments.refund', refundPaymentHandler);
