export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { validateInput, validationErrorResponse, SuperAdminTerrainSchema } from '../../../../core/lib/validation';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const admins = await prisma.superAdminTerrain.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        prenom: true,
        nom: true,
        telephone: true,
        actif: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ success: true, data: admins });
  } catch (error) {
    console.error('GET /super-admin-terrain error:', error);
    return NextResponse.json({ success: false, message: 'Erreur base de données' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validation = validateInput(SuperAdminTerrainSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    let telephone = data.telephone.trim().replace(/[\s\-]/g, '');
    if (telephone.startsWith('+221')) {
      telephone = telephone.substring(4);
    }
    const existing = await prisma.superAdminTerrain.findUnique({
      where: { telephone }
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Ce numéro de téléphone est déjà utilisé.' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const admin = await prisma.superAdminTerrain.create({
      data: {
        prenom: data.prenom.trim(),
        nom: data.nom.trim(),
        telephone: telephone,
        password: hashedPassword,
        actif: data.actif !== undefined ? data.actif : true,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: admin.id,
        prenom: admin.prenom,
        nom: admin.nom,
        telephone: admin.telephone,
        actif: admin.actif,
        createdAt: admin.createdAt,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /super-admin-terrain error:', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de la création', error: error.message }, { status: 500 });
  }
}
