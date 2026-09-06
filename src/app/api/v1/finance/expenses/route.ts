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

import { prisma } from '@/core/lib/prisma';

// GET /api/v1/finance/expenses — liste des dépenses
async function getExpensesHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (status) where.status = status;
    if (category) where.category = category;

    const [data, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
          attachments: { select: { id: true, originalName: true, mimeType: true, size: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const GET = requirePermission('finance.expenses.read', getExpensesHandler);
export const POST = requirePermission('finance.expenses.create', createExpenseHandler);
