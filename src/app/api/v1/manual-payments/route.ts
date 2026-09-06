import { NextResponse } from 'next/server';
import { requirePermission } from '@/core/security/permission.guard';
import { PaymentService } from '@/features/finance/services/payment.service';
import { v4 as uuidv4 } from 'uuid';

// POST /api/v1/manual-payments
// Créer un paiement manuel
async function createManualPaymentHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const body = await request.json();
    const { amount, contributionId, reference } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: 'Le montant doit être supérieur à zéro' }, { status: 400 });
    }

    // L'idempotencyKey pour un paiement manuel est souvent générée par le front, ou on en génère une.
    const idempotencyKey = body.idempotencyKey || `MANUAL-${uuidv4()}`;

    const transaction = await PaymentService.createPaymentTransaction(
      organizationId,
      'MANUAL',
      amount,
      idempotencyKey,
      contributionId
    );

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// GET /api/v1/manual-payments/pending
// Lister les paiements manuels en attente de confirmation
async function getPendingManualPaymentsHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    
    const { prisma } = await import('@/core/lib/prisma');
    
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        organizationId,
        provider: 'MANUAL',
        status: 'PENDING_CONFIRMATION'
      },
      include: {
        contributionPayments: {
          include: {
            contribution: {
              include: {
                Adherent: true,
                contributionType: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const POST = requirePermission('finance.contributions.create', createManualPaymentHandler);
export const GET = requirePermission('finance.contributions.read', getPendingManualPaymentsHandler);
