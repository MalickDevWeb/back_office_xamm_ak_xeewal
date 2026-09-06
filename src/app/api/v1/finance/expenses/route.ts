import { NextResponse } from 'next/server';
import { ExpenseService } from '@/features/finance/services/expense.service';
import { requirePermission } from '@/core/security/permission.guard';

async function createExpenseHandler(request: Request) {
  const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
  const userId = request.headers.get('x-user-id') || 'UNKNOWN';
  const body = await request.json();
  
  try {
    const expense = await ExpenseService.createExpense({
      ...body,
      reason: body.reason || body.description || '',
      organizationId,
      createdBy: userId
    });

    return NextResponse.json({ success: true, data: expense });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erreur création dépense' 
    }, { status: 400 });
  }
}

export const POST = requirePermission('finance.expenses.create', createExpenseHandler);
