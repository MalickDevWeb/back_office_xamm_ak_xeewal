export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, AdherentSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { config as envConfig } from '@/core/lib/env';
import { prisma } from '../../../../core/lib/prisma';
import { sign } from 'jsonwebtoken';

export async function GET(req: Request) {
  try {
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

    const statut = searchParams.get('statut');
    if (statut) {
      where.statut = statut;
    }

    const agentTerrainId = searchParams.get('agentTerrainId');
    if (agentTerrainId) {
      where.agentTerrainId = agentTerrainId;
    }

    const centreVote = searchParams.get('centreVote');
    if (centreVote) {
      where.centreVote = centreVote;
    }

    const bureauVote = searchParams.get('bureauVote');
    if (bureauVote) {
      where.bureauVote = bureauVote;
    }

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const adherents = await prisma.adherent.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: adherents,
      total: adherents.length,
      filters: { telephone, nom, quartier, localite, statut, agentTerrainId, centreVote, bureauVote, startDate, endDate }
    });
  } catch (error) {
    console.error('GET /adherents error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validation = validateInput(AdherentSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

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
      statut: data.statut || 'NOUVEAU',
      poleId: data.poleId || null
    };

    const existing = await prisma.adherent.findFirst({
      where: { telephone: payload.telephone }
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Ce numéro de téléphone est déjà enregistré.' },
        { status: 409 }
      );
    }

    const newAdherent = await prisma.adherent.create({ data: payload });

    // Générer un token citoyen permanent (sans expiration)
    const secret = envConfig.jwtSecret;
    const citizenToken = sign(
      { 
        id: newAdherent.id, 
        role: 'CITIZEN',
        telephone: newAdherent.telephone
      },
      secret
      // Pas d'expiresIn → token permanent
    );

    return NextResponse.json({ 
      success: true, 
      data: newAdherent,
      token: citizenToken
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /adherents error:', error);
    return NextResponse.json({ success: false, message: "Erreur lors de la création", error: error.message }, { status: 500 });
  }
}
