import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../core/lib/prisma';
import { requirePermission } from '../../../../../../core/security/permission.guard';

async function getHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: {
        statusHistory: { orderBy: { createdAt: 'desc' } },
        attachments: true
      }
    });
    if (!expense) return NextResponse.json({ success: false, message: 'Non trouvé' }, { status: 404 });
    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

async function patchHandler(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    
    // Vérifier statut BROUILLON
    const expense = await prisma.expense.findUnique({ where: { id: params.id } });
    if (!expense || expense.status !== 'BROUILLON') {
       return NextResponse.json({ success: false, message: 'Modification impossible' }, { status: 400 });
    }

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: {
        amount: body.amount,
        beneficiary: body.beneficiary,
        reason: body.reason,
        category: body.category
      }
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const GET = requirePermission('finance.expenses.view', getHandler);
export const PATCH = requirePermission('finance.expenses.update', patchHandler);
