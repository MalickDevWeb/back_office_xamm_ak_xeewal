import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../core/security/permission.guard';
import { prisma } from '../../../../../core/lib/prisma';
import { ContributionPayment } from '@prisma/client';

// GET /api/v1/contributions/[id]
async function getContributionHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';

    const contribution = await prisma.contribution.findFirst({
      where: { id: params.id, organizationId },
      include: {
        Adherent: { select: { id: true, prenom: true, nom: true, email: true, telephone: true } },
        contributionType: true,
        payments: {
          include: {
            transaction: { select: { id: true, provider: true, status: true, checkoutUrl: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!contribution) {
      return NextResponse.json({ success: false, message: 'Cotisation non trouvée' }, { status: 404 });
    }

    const totalPaid = contribution.payments
      .filter((p: ContributionPayment) => p.status === 'CONFIRMED')
      .reduce((sum: number, p: ContributionPayment) => sum + p.amount, 0);

    return NextResponse.json({
      success: true,
      data: { ...contribution, totalPaid, remainingAmount: contribution.expectedAmount - totalPaid }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/v1/contributions/[id]
async function updateContributionHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const body = await request.json();

    // Vérifier que la cotisation existe et appartient à l'organisation
    const existing = await prisma.contribution.findFirst({
      where: { id: params.id, organizationId }
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Cotisation non trouvée' }, { status: 404 });
    }

    // Seules les cotisations EN_ATTENTE ou PARTIELLEMENT_PAYEE peuvent être modifiées
    if (!['EN_ATTENTE', 'PARTIELLEMENT_PAYEE'].includes(existing.status)) {
      return NextResponse.json({
        success: false,
        message: `Impossible de modifier une cotisation avec le statut ${existing.status}`
      }, { status: 400 });
    }

    const allowedFields: Record<string, any> = {};
    if (body.expectedAmount !== undefined) allowedFields.expectedAmount = Math.round(body.expectedAmount);
    if (body.dueDate !== undefined) allowedFields.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.notes !== undefined) allowedFields.notes = body.notes;

    const updated = await prisma.contribution.update({
      where: { id: params.id },
      data: allowedFields,
      include: {
        Adherent: { select: { id: true, prenom: true, nom: true } },
        contributionType: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.contributions.read', getContributionHandler);
export const PATCH = requirePermission('finance.contributions.update', updateContributionHandler);
