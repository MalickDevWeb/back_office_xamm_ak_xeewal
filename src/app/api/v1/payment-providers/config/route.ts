import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const organizationId = req.nextUrl.searchParams.get('organizationId');
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId manquant' }, { status: 400 });
    }

    const configs = await prisma.paymentProviderConfig.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        enabled: true,
        mode: true,
        lastTestedAt: true,
        lastTestStatus: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(configs);
  } catch (error: any) {
    console.error('Erreur GET config:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, provider, enabled, mode, credentialsEncrypted, webhookSecretEncrypted } = body;

    if (!organizationId || !provider) {
      return NextResponse.json({ error: 'organizationId et provider sont requis' }, { status: 400 });
    }

    const config = await prisma.paymentProviderConfig.upsert({
      where: {
        organizationId_provider: {
          organizationId,
          provider,
        },
      },
      update: {
        enabled,
        mode,
        ...(credentialsEncrypted ? { credentialsEncrypted } : {}),
        ...(webhookSecretEncrypted ? { webhookSecretEncrypted } : {}),
      },
      create: {
        organizationId,
        provider,
        enabled: enabled ?? false,
        mode: mode || 'SANDBOX',
        credentialsEncrypted: credentialsEncrypted || null,
        webhookSecretEncrypted: webhookSecretEncrypted || null,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        id: config.id,
        provider: config.provider,
        enabled: config.enabled,
        mode: config.mode,
      }
    });
  } catch (error: any) {
    console.error('Erreur POST config:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
