import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../core/security/permission.guard';
import { prisma } from '../../../../core/lib/prisma';

async function getContributionsHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const memberId = searchParams.get('memberId') || undefined;
    const typeId = searchParams.get('typeId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (memberId) where.memberId = memberId;
    if (typeId) where.contributionTypeId = typeId;

    const [data, total] = await Promise.all([
      prisma.contribution.findMany({
        where,
        include: {
          Adherent: { select: { id: true, prenom: true, nom: true, email: true } },
          contributionType: { select: { id: true, name: true, defaultAmount: true } },
          payments: {
            select: { id: true, amount: true, status: true, paymentMethod: true, paymentDate: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contribution.count({ where })
    ]);

    // Calculer montant payé / restant pour chaque cotisation
    const enriched = data.map((c) => {
      const totalPaid = c.payments
        .filter((p) => p.status === 'CONFIRMED')
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        ...c,
        totalPaid,
        remainingAmount: c.expectedAmount - totalPaid,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

async function createContributionHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const userId = request.headers.get('x-user-id') || 'UNKNOWN';
    const body = await request.json();

    const { memberId, contributionTypeId, expectedAmount, currency, dueDate, notes, activityId } = body;

    if (!memberId || !contributionTypeId || !expectedAmount || expectedAmount <= 0) {
      return NextResponse.json({ success: false, message: 'memberId, contributionTypeId et expectedAmount sont requis' }, { status: 400 });
    }

    const contribution = await prisma.contribution.create({
      data: {
        organizationId,
        memberId,
        contributionTypeId,
        expectedAmount: Math.round(expectedAmount),
        currency: currency || 'XOF',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
        activityId,
        status: 'EN_ATTENTE',
        createdBy: userId,
      },
      include: {
        Adherent: { select: { id: true, prenom: true, nom: true } },
        contributionType: { select: { id: true, name: true } },
      }
    });

    return NextResponse.json({ success: true, data: contribution }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.contributions.read', getContributionsHandler);
export const POST = requirePermission('finance.contributions.create', createContributionHandler);
