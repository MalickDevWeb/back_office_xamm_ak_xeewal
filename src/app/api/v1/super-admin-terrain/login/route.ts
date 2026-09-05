export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { config as envConfig } from '@/core/lib/env';
import { prisma } from '../../../../../core/lib/prisma';
import { validateInput, validationErrorResponse, SuperAdminTerrainLoginSchema } from '../../../../../core/lib/validation';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validation = validateInput(SuperAdminTerrainLoginSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    let telephone = data.telephone.trim().replace(/[\s\-]/g, '');
    if (telephone.startsWith('+221')) {
      telephone = telephone.substring(4);
    }
    const admin = await prisma.superAdminTerrain.findUnique({
      where: { telephone }
    });

    if (!admin) {
      return NextResponse.json({ success: false, message: 'Numéro de téléphone incorrect' }, { status: 401 });
    }

    if (!admin.actif) {
      return NextResponse.json({ success: false, message: 'Ce compte a été désactivé' }, { status: 403 });
    }

    const isValid = await bcrypt.compare(data.password, admin.password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Mot de passe incorrect' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'SUPER_ADMIN_TERRAIN' },
      envConfig.jwtSecret,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      token,
      data: {
        id: admin.id,
        prenom: admin.prenom,
        nom: admin.nom,
        telephone: admin.telephone,
        role: 'SUPER_ADMIN_TERRAIN'
      }
    });
  } catch (error) {
    console.error('POST /super-admin-terrain/login error:', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de la connexion' }, { status: 500 });
  }
}
