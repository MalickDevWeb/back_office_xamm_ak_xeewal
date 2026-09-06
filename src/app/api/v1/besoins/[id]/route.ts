export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { requirePermission } from '../../../../../core/security/permission.guard';

export const PUT = requirePermission('besoins.update', async (req: Request, { params }: { params: { id: string } }) => {
  try {
    const data = await req.json();
    const updated = await (prisma.besoin as any).update({
      where: { id: params.id },
      data
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour" }, { status: 500 });
  }
});

export const DELETE = requirePermission('besoins.delete', async (req: Request, { params }: { params: { id: string } }) => {
  try {
    await (prisma.besoin as any).delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: "Supprimé avec succès" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la suppression" }, { status: 500 });
  }
});

