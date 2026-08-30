export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, EvenementSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const where: any = {};

    const statut = searchParams.get('statut');
    if (statut) where.statut = statut;

    const categorie = searchParams.get('categorie');
    if (categorie) where.categorie = categorie;

    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
      where.date = {};
      if (from) (where.date as any).gte = new Date(from);
      if (to) (where.date as any).lte = new Date(to);
    }

    const evenements = await prisma.evenement.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: evenements,
      total: evenements.length
    });
  } catch (error) {
    console.error('GET /evenements error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validation = validateInput(EvenementSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const evenement = await prisma.evenement.create({
      data: {
        titre: validation.data.titre,
        description: validation.data.description,
        date: new Date(validation.data.date),
        heureDebut: validation.data.heureDebut,
        heureFin: validation.data.heureFin,
        lieu: validation.data.lieu,
        categorie: validation.data.categorie,
        statut: validation.data.statut || 'A_VENIR'
      }
    });

    return NextResponse.json({ success: true, data: evenement }, { status: 201 });
  } catch (error) {
    console.error('POST /evenements error:', error);
    return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500 });
  }
}
