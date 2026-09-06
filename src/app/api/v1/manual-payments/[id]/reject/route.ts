import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../core/security/permission.guard';
import { PaymentService } from '../../../../../../features/finance/services/payment.service';

// POST /api/v1/manual-payments/[id]/reject
async function rejectManualPaymentHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const transactionId = params.id;
    const body = await request.json();
    const { rejectedReason } = body;
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

    if (!rejectedReason) {
      return NextResponse.json({ success: false, message: 'Le motif de rejet est requis' }, { status: 400 });
    }

    const transaction = await PaymentService.rejectManualPayment(transactionId, rejectedReason, userId);

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const POST = requirePermission('finance.contributions.confirm', rejectManualPaymentHandler);
