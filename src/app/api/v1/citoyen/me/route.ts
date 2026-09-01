export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '../../../../../core/lib/prisma';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = verify(token, secret) as any;

    if (decoded.role !== 'CITIZEN') {
      return NextResponse.json({ success: false, message: 'Accès réservé aux citoyens' }, { status: 403 });
    }

    const adherent = await prisma.adherent.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        prenom: true,
        nom: true,
        telephone: true,
        quartier: true,
        profession: true,
        competences: true,
        statut: true,
        carteRectoUrl: true,
        createdAt: true
      }
    });

    if (!adherent) {
      return NextResponse.json({ success: false, message: 'Adhérent introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: adherent });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Token invalide ou expiré' }, { status: 401 });
  }
}
