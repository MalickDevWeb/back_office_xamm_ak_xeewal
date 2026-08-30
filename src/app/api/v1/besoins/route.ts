export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, BesoinSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Build dynamic where clause from query parameters
    const where: any = {};

    // Filter by contact (phone number) — identifies the person
    const contact = searchParams.get('contact');
    if (contact) {
      where.contact = contact;
    }

    // Filter by quartier (neighborhood)
    const quartier = searchParams.get('quartier');
    if (quartier) {
      where.quartier = quartier;
    }

    // Filter by localité (city/area)
    const localite = searchParams.get('localite');
    if (localite) {
      where.localite = localite;
    }

    // Filter by statut
    const statut = searchParams.get('statut');
    if (statut) {
      where.statut = statut;
    }

    // Filter by urgence
    const urgence = searchParams.get('urgence');
    if (urgence) {
      where.urgence = urgence;
    }

    // Filter by date range (ISO date strings)
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Filter by month/year (e.g., month=8&year=2025)
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    if (month || year) {
      const y = year ? parseInt(year) : new Date().getFullYear();
      const m = month ? parseInt(month) - 1 : 0;
      const startDate = new Date(y, m, 1);
      const endDate = new Date(y, m + 1, 0, 23, 59, 59);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const besoins = await prisma.besoin.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: besoins,
      total: besoins.length,
      filters: { contact, quartier, localite, statut, urgence, dateFrom, dateTo, month, year }
    });
  } catch (error) {
    console.error('GET /besoins error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validation = validateInput(BesoinSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    const payload: any = {
      description: data.description,
      quartier: data.quartier,
      urgence: data.urgence || 'MOYENNE',
      statut: data.statut || 'EN_ATTENTE',
      contact: data.contact || null,
      categorie: data.categorie || null,
      vocalUrl: data.vocalUrl || data.media_url || null,
      photoUrl: data.photoUrl || data.media_url || null
    };

    // Auto-create/check Adherent based on telephone
    if (data.telephone) {
      const existingAdherent = await prisma.adherent.findFirst({
        where: { telephone: data.telephone }
      });
      if (!existingAdherent) {
        await prisma.adherent.create({
          data: {
            telephone: data.telephone,
            prenom: data.nom || 'Citoyen',
            nom: '',
            quartier: data.quartier || 'Non défini',
            statut: 'NOUVEAU'
          }
        });
      }
    }

    const newBesoin = await prisma.besoin.create({ data: payload });
    return NextResponse.json({ success: true, data: newBesoin }, { status: 201 });
  } catch (error: any) {
    console.error('POST /besoins error:', error);
    return NextResponse.json({ success: false, message: "Erreur lors de la création", error: error.message }, { status: 500 });
  }
}
