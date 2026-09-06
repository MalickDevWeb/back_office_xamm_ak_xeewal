import { NextResponse } from 'next/server';
import { requirePermission } from '../../../../../../../core/security/permission.guard';
import { PaymentProviderAdminService } from '../../../../../../../features/finance/services/payment-provider-admin.service';

/**
 * POST /api/v1/admin/payment-providers/[provider]/environment
 * Change l'environnement (SANDBOX / PRODUCTION) d'un provider.
 * Désactive AUTOMATIQUEMENT le provider lors du changement pour forcer une re-validation.
 *
 * Body: { mode: 'SANDBOX' | 'PRODUCTION' }
 *
 * ⚠️ Le passage en PRODUCTION doit être confirmé explicitement côté frontend
 * avec un dialogue d'avertissement : "Les paiements pourront utiliser de l'argent réel."
 */
async function handler(request: Request, { params }: { params: { provider: string } }) {
  try {
    const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';
    const actorId = request.headers.get('x-user-id') || 'UNKNOWN';
    const body = await request.json();

    if (!body.mode) {
      return NextResponse.json({
        success: false,
        message: 'Le champ mode est requis (SANDBOX ou PRODUCTION)'
      }, { status: 400 });
    }

    const result = await PaymentProviderAdminService.setEnvironment(
      organizationId,
      params.provider,
      body.mode,
      actorId
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

export const POST = requirePermission('finance.providers.write', handler);
