export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';

/**
 * Endpoint: GET /api/v1/besoins/search?contact=771234567
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
 * Returns all besoins/signalements for a given phone number (person identifier).
 * Supports additional filters: quartier, localite, statut, urgence, dateFrom, dateTo, month, year
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const contact = searchParams.get('contact');

    if (!contact) {
      return NextResponse.json(
        { success: false, message: "Paramètre 'contact' (téléphone) requis" },
        { status: 400 }
      );
    }

    const where: any = { contact: contact };

    // Optional additional filters
    const quartier = searchParams.get('quartier');
    if (quartier) where.quartier = quartier;

    const localite = searchParams.get('localite');
    if (localite) where.localite = localite;

    const statut = searchParams.get('statut');
    if (statut) where.statut = statut;

    const urgence = searchParams.get('urgence');
    if (urgence) where.urgence = urgence;

    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const month = searchParams.get('month');
    const year = searchParams.get('year');
    if (month || year) {
      const y = year ? parseInt(year) : new Date().getFullYear();
      const m = month ? parseInt(month) - 1 : 0;
      const startDate = new Date(y, m, 1);
      const endDate = new Date(y, m + 1, 0, 23, 59, 59);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    // Get all besoins for this contact, ordered by most recent
    const besoins = await prisma.besoin.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Get the adherent info for this phone number (if exists)
    const adherent = await prisma.adherent.findFirst({
      where: { telephone: contact },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        personne: adherent ? {
          nom: adherent.nom,
          prenom: adherent.prenom,
          telephone: adherent.telephone,
          quartier: adherent.quartier,
          profession: adherent.profession,
          statut: adherent.statut,
          dateAdhesion: adherent.createdAt
        } : null,
        signalements: besoins,
        totalSignalements: besoins.length,
        totalDepuis: besoins.length > 0 ? besoins[0].createdAt : null
      }
    });
  } catch (error) {
    console.error('GET /besoins/search error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}
