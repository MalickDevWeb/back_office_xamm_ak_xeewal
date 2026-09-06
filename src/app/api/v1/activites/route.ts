export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { validateInput, validationErrorResponse, ActiviteSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { requirePermission } from '../../../../core/security/permission.guard';

export const GET = requirePermission('activities.read', async () => {
  try {
    const activites = await prisma.activite.findMany({ orderBy: { date: 'desc' } });
    return NextResponse.json({ success: true, data: activites, total: activites.length });
  } catch (error) {
    console.error('GET /activites error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});

export const POST = requirePermission('activities.create', async (req: Request) => {
  try {
    const data = await req.json();
    const validation = validateInput(ActiviteSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    const newAct = await prisma.activite.create({ data });
    return NextResponse.json({ success: true, data: newAct }, { status: 201 });
  } catch (error: any) {
    console.error('POST /activites error:', error);
    return NextResponse.json({ success: false, message: "Erreur lors de la création", error: error.message }, { status: 500 });
  }
});


