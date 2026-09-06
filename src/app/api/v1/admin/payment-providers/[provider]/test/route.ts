import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../../core/security/permission.guard';
import { PaymentProviderAdminService } from '../../../../../../../features/finance/services/payment-provider-admin.service';

/**
 * POST /api/v1/admin/payment-providers/[provider]/test
 * Teste la connexion avec les credentials actuels du provider.
 * Enregistre lastTestedAt et lastTestStatus en base.
 */
async function handler(request: Request, { params }: { params: { provider: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const actorId = request.headers.get('x-user-id') || 'UNKNOWN';

    const result = await PaymentProviderAdminService.testProvider(organizationId, params.provider, actorId);

    const status = result.testStatus === 'SUCCESS' ? 200 : 422;
    return NextResponse.json({ success: result.testStatus === 'SUCCESS', data: result }, { status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const POST = requirePermission('finance.providers.write', handler);
