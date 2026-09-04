export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { validateInput, validationErrorResponse, AgentTerrainLoginSchema } from '../../../../../core/lib/validation';
import bcrypt from 'bcryptjs';
import { sign, SignOptions } from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validation = validateInput(AgentTerrainLoginSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }

    let telephone = data.telephone.trim().replace(/[\s\-]/g, '');
    if (telephone.startsWith('+221')) {
      telephone = telephone.substring(4);
    }
    const agent = await prisma.agentTerrain.findUnique({
      where: { telephone }
    });

    if (!agent) {
      return NextResponse.json(
        { success: false, message: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    if (!agent.actif) {
      return NextResponse.json(
        { success: false, message: 'Votre compte a été désactivé. Contactez l\'administrateur.' },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(data.password, agent.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = sign(
      { id: agent.id, role: 'AGENT_TERRAIN' },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    );

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: agent.id,
          prenom: agent.prenom,
          nom: agent.nom,
          telephone: agent.telephone,
          points: agent.points,
          role: 'AGENT_TERRAIN',
        },
        token
      }
    });
  } catch (error: any) {
    console.error('POST /agents-terrain/login error:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}
