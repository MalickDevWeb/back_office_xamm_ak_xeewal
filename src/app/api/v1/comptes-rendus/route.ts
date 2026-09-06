export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, CompteRenduSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { requirePermission } from '../../../../core/security/permission.guard';

export const GET = requirePermission('comptes_rendus.read', async () => {
  try {
    const cr = await prisma.compteRendu.findMany({ orderBy: { date: 'desc' } });
    return NextResponse.json({ success: true, data: cr, total: cr.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
});

export const POST = requirePermission('comptes_rendus.create', async (req: Request) => {
  try {
    const data = await req.json();
    const validation = validateInput(CompteRenduSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    const newCr = await prisma.compteRendu.create({ data });
    return NextResponse.json({ success: true, data: newCr }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500 });
  }
});
