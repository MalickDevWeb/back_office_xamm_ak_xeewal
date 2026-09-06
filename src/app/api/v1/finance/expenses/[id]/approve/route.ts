import { NextResponse } from 'next/server';
import { ExpenseService } from '../../../../../../../features/finance/services/expense.service';
import { requirePermission } from '../../../../../../../core/security/permission.guard';

async function handler(request: Request, { params }: { params: { id: string } }) {
  const actorId = request.headers.get('x-user-id') || 'ADMIN';
  try {
    const data = await ExpenseService.approveExpense(params.id, actorId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const POST = requirePermission('finance.expenses.approve', handler);
