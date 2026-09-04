import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';

export const runtime = 'nodejs';

// PUT /api/v1/centres-vote/[id]
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { nom, bureaux, zone } = body;

    const data: any = {};
    if (nom !== undefined) data.nom = nom.trim();
    if (bureaux !== undefined) data.bureaux = bureaux;
    if (zone !== undefined) data.zone = zone;

    const centre = await prisma.centreVote.update({
      where: { id: params.id },
      data
    });

    return NextResponse.json({ success: true, data: centre });
  } catch (error: any) {
    console.error('PUT /centres-vote/[id] error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, message: 'Ce nom de centre existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

// DELETE /api/v1/centres-vote/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.centreVote.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: 'Centre supprimé avec succès' });
  } catch (error) {
    console.error('DELETE /centres-vote/[id] error:', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
