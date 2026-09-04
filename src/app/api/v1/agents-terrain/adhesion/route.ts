export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { validateInput, validationErrorResponse, AdherentSchema } from '../../../../../core/lib/validation';
import { verify } from 'jsonwebtoken';
import { sign } from 'jsonwebtoken';

// POST: Inscrire un citoyen via agent terrain (authentifié)
export async function POST(req: Request) {
  try {
    // Vérifier le token agent terrain
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authentification requise' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    
    let decoded: any;
    try {
      decoded = verify(token, secret);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Token invalide ou expiré' },
        { status: 401 }
      );
    }

    if (decoded.role !== 'AGENT_TERRAIN') {
      return NextResponse.json(
        { success: false, message: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Vérifier que l'agent existe et est actif
    const agent = await prisma.agentTerrain.findUnique({
      where: { id: decoded.id }
    });
    if (!agent || !agent.actif) {
      return NextResponse.json(
        { success: false, message: 'Agent désactivé ou introuvable' },
        { status: 403 }
      );
    }

    const data = await req.json();
    const validation = validateInput(AdherentSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    // Construire le payload adhérent
    const payload: any = {
      prenom: data.prenom || '',
      nom: data.nom || '',
      telephone: data.telephone || '',
      quartier: data.quartier || '',
      profession: data.profession || null,
      competences: data.competences || null,
      disponibilite: data.disponibilite || null,
      carteRectoUrl: data.carteRectoUrl || null,
      carteVersoUrl: data.carteVersoUrl || null,
      statut: 'NOUVEAU',
      poleId: data.poleId || null,
      centreVote: data.centreVote || null,
      bureauVote: data.bureauVote || null,
      agentTerrainId: agent.id,
    };

    // Vérifier si le téléphone existe déjà
    const existing = await prisma.adherent.findFirst({
      where: { telephone: payload.telephone }
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Ce numéro de téléphone est déjà enregistré.' },
        { status: 409 }
      );
    }

    // Créer l'adhérent et incrémenter les points de l'agent (atomique)
    const [newAdherent] = await prisma.$transaction([
      prisma.adherent.create({ data: payload }),
      prisma.agentTerrain.update({
        where: { id: agent.id },
        data: { points: { increment: 1 } }
      })
    ]);

    // Générer un token citoyen
    const citizenToken = sign(
      { id: newAdherent.id, role: 'CITIZEN', telephone: newAdherent.telephone },
      secret
    );

    // Récupérer les points mis à jour
    const updatedAgent = await prisma.agentTerrain.findUnique({
      where: { id: agent.id },
      select: { points: true }
    });

    return NextResponse.json({
      success: true,
      data: newAdherent,
      token: citizenToken,
      agentPoints: updatedAgent?.points || agent.points + 1,
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /agents-terrain/adhesion error:', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de l\'inscription', error: error.message }, { status: 500 });
  }
}
