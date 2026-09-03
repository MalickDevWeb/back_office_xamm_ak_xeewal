export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { validateInput, validationErrorResponse, AgentTerrainSchema } from '../../../../core/lib/validation';
import bcrypt from 'bcryptjs';

// GET: Liste des agents terrain (pour l'admin)
export async function GET(req: Request) {
  try {
    const agents = await prisma.agentTerrain.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        prenom: true,
        nom: true,
        telephone: true,
        points: true,
        actif: true,
        createdAt: true,
        createdById: true,
      }
    });

    return NextResponse.json({ success: true, data: agents });
  } catch (error) {
    console.error('GET /agents-terrain error:', error);
    return NextResponse.json({ success: false, message: 'Erreur base de données' }, { status: 500 });
  }
}

// POST: Créer un agent terrain (par l'admin)
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validation = validateInput(AgentTerrainSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    // Vérifier si le téléphone existe déjà
    const telephone = data.telephone.trim();
    const existing = await prisma.agentTerrain.findUnique({
      where: { telephone }
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Ce numéro de téléphone est déjà utilisé par un autre agent.' },
        { status: 409 }
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const agent = await prisma.agentTerrain.create({
      data: {
        prenom: data.prenom.trim(),
        nom: data.nom.trim(),
        telephone: telephone,
        password: hashedPassword,
        createdById: data.createdById || null,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: agent.id,
        prenom: agent.prenom,
        nom: agent.nom,
        telephone: agent.telephone,
        points: agent.points,
        actif: agent.actif,
        createdAt: agent.createdAt,
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /agents-terrain error:', error);
    return NextResponse.json({ success: false, message: 'Erreur lors de la création', error: error.message }, { status: 500 });
  }
}
