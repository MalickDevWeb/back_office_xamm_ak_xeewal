import { NextResponse } from 'next/server';
import { PaymentService } from '../../../../../features/finance/services/payment.service';
import { requirePermission } from '../../../../../core/security/permission.guard';

async function createPaymentHandler(request: Request) {
  const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
  const body = await request.json();
  
  try {
    const transaction = await PaymentService.createPaymentTransaction(
      organizationId,
      body.provider,
      body.amount,
      body.idempotencyKey,
      body.contributionId
    );

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erreur lors de la création du paiement' 
    }, { status: 400 });
  }
}

// Protéger la route
export const POST = requirePermission('finance.payments.create', createPaymentHandler);
