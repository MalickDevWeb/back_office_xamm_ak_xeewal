export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { withAuth } from '../../../../../core/middlewares/authGuard';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  // Optionnel: Vous pouvez décommenter withAuth pour protéger explicitement au niveau Node 
  // (le middleware Edge s'en charge déjà, mais au cas où).
  try {
    const data = await req.json();
    const updated = await (prisma.compteRendu as any).update({
      where: { id: params.id },
      data
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await (prisma.compteRendu as any).delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: "Supprimé avec succès" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la suppression" }, { status: 500 });
  }
}
