export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';

// PUT: Activer/Désactiver un agent
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    const agent = await prisma.agentTerrain.update({
      where: { id: params.id },
      data: { actif: data.actif ?? true },
      select: {
        id: true,
        prenom: true,
        nom: true,
        telephone: true,
        points: true,
        actif: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ success: true, data: agent });
  } catch (error: any) {
    console.error('PUT /agents-terrain/[id] error:', error);
    return NextResponse.json({ success: false, message: 'Agent introuvable' }, { status: 404 });
  }
}

// DELETE: Supprimer un agent
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    // Dissocier d'abord les adhérents liés à cet agent
    await prisma.adherent.updateMany({
      where: { agentTerrainId: params.id },
      data: { agentTerrainId: null }
    });

    await prisma.agentTerrain.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: 'Agent supprimé' });
  } catch (error: any) {
    console.error('DELETE /agents-terrain/[id] error:', error);
    return NextResponse.json({ success: false, message: 'Agent introuvable' }, { status: 404 });
  }
}
