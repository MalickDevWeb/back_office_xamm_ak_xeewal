import { NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';
import { CryptoUtil } from '@/core/utils/crypto.util';

// GET: Récupère la liste des providers configurés (sans les clés sensibles pour des raisons de sécurité, ou juste un statut)
export async function GET() {
  try {
    const providers = await (prisma as any).providerConfiguration.findMany({
      select: {
        id: true,
        provider: true,
        isActive: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json({ success: true, data: providers });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Ajouter ou Mettre à jour une configuration de provider
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, isActive, config, updatedBy } = body;

    if (!provider || !config) {
      return NextResponse.json({ success: false, message: 'provider et config sont requis' }, { status: 400 });
    }

    // Chiffrement fort des clés d'API (AES-256-GCM) avant insertion en base
    const encryptedConfig = CryptoUtil.encryptConfig(config);

    const upserted = await (prisma as any).providerConfiguration.upsert({
      where: { provider },
      update: {
        isActive: isActive !== undefined ? isActive : true,
        config: encryptedConfig,
        updatedBy: updatedBy || 'ADMIN'
      },
      create: {
        provider,
        isActive: isActive !== undefined ? isActive : true,
        config: encryptedConfig,
        updatedBy: updatedBy || 'ADMIN'
      },
      select: {
        id: true,
        provider: true,
        isActive: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration sauvegardée avec succès',
      data: upserted 
    });
  } catch (error: any) {
    console.error('Provider settings error:', error);
    return NextResponse.json({ success: false, message: 'Erreur de sauvegarde' }, { status: 500 });
  }
}
