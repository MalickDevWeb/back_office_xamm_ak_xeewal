import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../core/security/permission.guard';
import { prisma } from '../../../../../../core/lib/prisma';

// POST /api/v1/contributions/[id]/cancel
async function cancelContributionHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const userId = request.headers.get('x-user-id') || 'UNKNOWN';
    const body = await request.json().catch(() => ({}));

    const contribution = await prisma.contribution.findFirst({
      where: { id: params.id, organizationId },
      include: { payments: { where: { status: 'CONFIRMED' } } }
    });

    if (!contribution) {
      return NextResponse.json({ success: false, message: 'Cotisation non trouvée' }, { status: 404 });
    }

    // Impossible d'annuler une cotisation déjà payée
    if (contribution.status === 'PAYEE' && contribution.payments.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Impossible d\'annuler une cotisation déjà payée. Effectuez un remboursement.'
      }, { status: 400 });
    }

    if (contribution.status === 'ANNULEE') {
      return NextResponse.json({ success: false, message: 'La cotisation est déjà annulée' }, { status: 400 });
    }

    const updated = await prisma.contribution.update({
      where: { id: params.id },
      data: { status: 'ANNULEE', notes: body.reason ? `Annulation: ${body.reason}` : contribution.notes }
    });

    await prisma.auditLog.create({
      data: {
        organizationId,
        actorId: userId,
        action: 'CONTRIBUTION_CANCELLED',
        entityType: 'Contribution',
        entityId: params.id,
        metadata: { reason: body.reason || null } as any
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const POST = requirePermission('finance.contributions.update', cancelContributionHandler);
