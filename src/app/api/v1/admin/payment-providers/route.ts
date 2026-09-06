import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../core/security/permission.guard';
import { PaymentProviderAdminService } from '../../../../../features/finance/services/payment-provider-admin.service';
import { CryptoUtil } from '../../../../../core/utils/crypto.util';
import { prisma } from '../../../../../core/lib/prisma';

/**
 * GET /api/v1/admin/payment-providers
 * Liste les providers configurés pour l'organisation.
 * Ne retourne JAMAIS les credentials.
 */
async function listProvidersHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const data = await PaymentProviderAdminService.listProviders(organizationId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/v1/admin/payment-providers
 * Configure les credentials d'un provider.
 * Body: { provider, credentials: { api_key: '...' }, webhookSecret: '...', mode: 'SANDBOX'|'PRODUCTION' }
 */
async function configureProviderHandler(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const userId = request.headers.get('x-user-id') || 'UNKNOWN';
    const body = await request.json();
    const { provider, credentials, webhookSecret, mode } = body;

    if (!provider) {
      return NextResponse.json({ success: false, message: 'provider est requis' }, { status: 400 });
    }

    const data = await PaymentProviderAdminService.configureProvider(
      organizationId,
      provider,
      credentials,
      webhookSecret,
      mode
    );

    // Surcharger l'actorId dans l'audit avec le vrai userId
    await prisma.auditLog.updateMany({
      where: { action: 'CREDENTIALS_UPDATED', actorId: 'SYSTEM', entityType: 'PaymentProviderConfig' },
      data: { actorId: userId }
    });

    return NextResponse.json({ success: true, message: 'Configuration sauvegardée', data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const GET = requirePermission('finance.providers.read', listProvidersHandler);
export const POST = requirePermission('finance.providers.write', configureProviderHandler);
