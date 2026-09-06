export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { requirePermission } from '../../../../../core/security/permission.guard';

export const GET = requirePermission('comptes_rendus.read', async (req: Request, { params }: { params: { id: string } }) => {
  try {
    const cr = await prisma.compteRendu.findUnique({
      where: { id: params.id }
    });
    if (!cr) {
      return NextResponse.json({ success: false, message: "Compte-rendu introuvable" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: cr });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
});

export const PUT = requirePermission('comptes_rendus.update', async (req: Request, { params }: { params: { id: string } }) => {
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
});

export const DELETE = requirePermission('comptes_rendus.delete', async (req: Request, { params }: { params: { id: string } }) => {
  try {
    await (prisma.compteRendu as any).delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: "Supprimé avec succès" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la suppression" }, { status: 500 });
  }
});

