import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export const runtime = 'nodejs';

// GET /api/v1/centres-vote
export async function GET(request: Request) {
  try {
    const centres = await prisma.centreVote.findMany({
      orderBy: { nom: 'asc' },
    });
    return NextResponse.json({ success: true, data: centres });
  } catch (error) {
    console.error('GET /centres-vote error:', error);
    return NextResponse.json({ success: false, message: 'Erreur base de données' }, { status: 500 });
  }
}

// POST /api/v1/centres-vote
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nom, bureaux, zone } = body;

    if (!nom || typeof bureaux !== 'number') {
      return NextResponse.json({ success: false, message: 'Nom et bureaux requis' }, { status: 400 });
    }

    const centre = await prisma.centreVote.create({
      data: {
        nom: nom.trim(),
        bureaux,
        zone: zone || 'THIES NORD'
      }
    });

    return NextResponse.json({ success: true, data: centre }, { status: 201 });
  } catch (error: any) {
    console.error('POST /centres-vote error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, message: 'Ce centre existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: 'Erreur lors de la création' }, { status: 500 });
  }
}
