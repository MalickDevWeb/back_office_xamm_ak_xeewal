import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requirePermission } from '../../../../../core/security/permission.guard';
import { encrypt } from '../../../../../core/utils/crypto.util';

// Liste des providers
async function getProvidersHandler(request: Request) {
  // En production, récupérer l'orgId de l'utilisateur
  const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';

  const configs = await prisma.paymentProviderConfig.findMany({
    where: { organizationId },
    select: {
      id: true,
      provider: true,
      enabled: true,
      mode: true,
      lastTestedAt: true,
      lastTestStatus: true,
      updatedAt: true
    }
  });

  return NextResponse.json({ success: true, data: configs });
}

// Configuration d'un provider
async function configureProviderHandler(request: Request) {
  const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
  const body = await request.json();
  const { provider, credentials, webhookSecret } = body;

  const credentialsEncrypted = credentials ? encrypt(JSON.stringify(credentials)) : undefined;
  const webhookSecretEncrypted = webhookSecret ? encrypt(webhookSecret) : undefined;

  const config = await prisma.paymentProviderConfig.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    update: {
      credentialsEncrypted: credentialsEncrypted ?? undefined,
      webhookSecretEncrypted: webhookSecretEncrypted ?? undefined,
      mode: body.mode || undefined,
      enabled: body.enabled !== undefined ? body.enabled : undefined,
    },
    create: {
      organizationId,
      provider,
      credentialsEncrypted,
      webhookSecretEncrypted,
      mode: body.mode || 'SANDBOX',
      enabled: body.enabled || false,
    }
  });

  return NextResponse.json({ 
    success: true, 
    message: 'Configuration sauvegardée',
    data: {
      provider: config.provider,
      enabled: config.enabled,
      mode: config.mode
    }
  });
}

// Protéger les routes via requirePermission
export const GET = requirePermission('finance.providers.read', getProvidersHandler);
export const POST = requirePermission('finance.providers.write', configureProviderHandler);
