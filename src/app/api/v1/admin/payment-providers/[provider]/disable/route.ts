import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../../core/security/permission.guard';
import { PaymentProviderAdminService } from '../../../../../../../features/finance/services/payment-provider-admin.service';

/**
 * POST /api/v1/admin/payment-providers/[provider]/disable
 * Désactive un provider. Les paiements en cours ne sont pas annulés.
 */
async function handler(request: Request, { params }: { params: { provider: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const actorId = request.headers.get('x-user-id') || 'UNKNOWN';

    const result = await PaymentProviderAdminService.disableProvider(organizationId, params.provider, actorId);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const POST = requirePermission('finance.providers.write', handler);
