export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    const updateData: any = {};

    if (data.prenom) updateData.prenom = data.prenom.trim();
    if (data.nom) updateData.nom = data.nom.trim();
    if (data.telephone) {
      let telephone = data.telephone.trim().replace(/[\s\-]/g, '');
      if (telephone.startsWith('+221')) {
        telephone = telephone.substring(4);
      }
      const existing = await prisma.superAdminTerrain.findFirst({
        where: { telephone, NOT: { id: params.id } }
      });
      if (existing) {
        return NextResponse.json({ success: false, message: 'Ce numéro de téléphone est déjà utilisé.' }, { status: 409 });
      }
      updateData.telephone = telephone;
    }
    if (data.password && data.password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    if (data.actif !== undefined) updateData.actif = data.actif;

    const admin = await prisma.superAdminTerrain.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        prenom: admin.prenom,
        nom: admin.nom,
        telephone: admin.telephone,
        actif: admin.actif,
      }
    });
  } catch (error) {
    console.error('PUT /super-admin-terrain/[id] error:', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.superAdminTerrain.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true, message: 'Super Admin Terrain supprimé' });
  } catch (error) {
    console.error('DELETE /super-admin-terrain/[id] error:', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
