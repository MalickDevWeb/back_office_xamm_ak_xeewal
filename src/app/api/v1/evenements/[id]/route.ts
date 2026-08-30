export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, EvenementSchema } from '../../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    const validation = validateInput(EvenementSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const updated = await prisma.evenement.update({
      where: { id: params.id },
      data: {
        titre: validation.data.titre,
        description: validation.data.description,
        date: new Date(validation.data.date),
        heureDebut: validation.data.heureDebut,
        heureFin: validation.data.heureFin,
        lieu: validation.data.lieu,
        categorie: validation.data.categorie,
        statut: validation.data.statut
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.evenement.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: "Supprimé avec succès" });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la suppression" }, { status: 500 });
  }
}
