import { NextResponse } from 'next/server';
import { PaymentService } from '../../../../../../../features/finance/services/payment.service';
import { requirePermission } from '../../../../../../../core/security/permission.guard';

async function handler(request: Request, { params }: { params: { id: string } }) {
  const actorId = request.headers.get('x-user-id') || 'ADMIN';
  const body = await request.json();
  
  try {
    const data = await PaymentService.rejectManualPayment(params.id, body.reason, actorId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const POST = requirePermission('finance.payments.reject', handler);
