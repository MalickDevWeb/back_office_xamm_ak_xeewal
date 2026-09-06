import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../core/security/permission.guard';
import { prisma } from '../../../../core/lib/prisma';

// GET /api/v1/expenses — liste des dépenses
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
