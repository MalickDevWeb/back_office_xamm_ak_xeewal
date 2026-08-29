export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET(req: Request) {
  try {
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4200',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Build dynamic where clause from query parameters
    const where: any = {};

    // Filter by telephone (unique person identifier)
    const telephone = searchParams.get('telephone');
    if (telephone) {
      where.telephone = telephone;
    }

    // Filter by nom
    const nom = searchParams.get('nom');
    if (nom) {
      where.nom = { contains: nom, mode: 'insensitive' };
    }

    // Filter by quartier
    const quartier = searchParams.get('quartier');
    if (quartier) {
      where.quartier = quartier;
    }

    // Filter by localité
    const localite = searchParams.get('localite');
    if (localite) {
      where.localite = localite;
    }

    // Filter by statut
    const statut = searchParams.get('statut');
    if (statut) {
      where.statut = statut;
    }

    const adherents = await prisma.adherent.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: adherents,
      total: adherents.length,
      filters: { telephone, nom, quartier, localite, statut }
    });
  } catch (error) {
    console.error('GET /adherents error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Map frontend fields to Prisma fields
    const payload: any = {
      prenom: data.prenom || data.prenom_citoyen || '',
      nom: data.nom || data.nom_citoyen || '',
      telephone: data.telephone || data.telephone_citoyen || '',
      quartier: data.quartier || '',

      profession: data.profession || data.pole || null,
      competences: data.competences || data.motivation || null,
      disponibilite: data.disponibilite || null,
      carteRectoUrl: data.carteRectoUrl || data.recto || null,
      carteVersoUrl: data.carteVersoUrl || data.verso || null,
      statut: data.statut || 'NOUVEAU'
    };

    const newAdherent = await prisma.adherent.create({ data: payload });
    return NextResponse.json({ success: true, data: newAdherent }, { status: 201 }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('POST /adherents error:', error);
    return NextResponse.json({ success: false, message: "Erreur lors de la création", error: error.message }, { status: 500 });
  }
}
