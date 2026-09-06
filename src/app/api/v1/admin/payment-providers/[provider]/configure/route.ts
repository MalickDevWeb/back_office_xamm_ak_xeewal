import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../../core/security/permission.guard';
import { PaymentProviderAdminService } from '../../../../../../../features/finance/services/payment-provider-admin.service';

/**
 * POST /api/v1/admin/payment-providers/[provider]/configure
 * Reconfigure les credentials d'un provider spécifique.
 * Body: { credentials: { ... }, webhookSecret?: '...', mode?: 'SANDBOX'|'PRODUCTION' }
 */
async function handler(request: Request, { params }: { params: { provider: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const body = await request.json();
    const { credentials, webhookSecret, mode } = body;

    const data = await PaymentProviderAdminService.configureProvider(
      organizationId,
      params.provider,
      credentials,
      webhookSecret,
      mode
    );

    return NextResponse.json({ success: true, message: 'Configuration sauvegardée', data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const POST = requirePermission('finance.providers.write', handler);
