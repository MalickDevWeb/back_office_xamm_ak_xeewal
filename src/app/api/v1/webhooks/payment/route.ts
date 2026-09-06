import { NextRequest, NextResponse } from 'next/server';
import { WebhookService } from '../../../../../features/finance/services/webhook.service';

export const runtime = 'nodejs';

/**
 * POST /api/v1/webhooks/payment?provider=WAVE|ORANGE_MONEY
 * Route legacy maintenue pour compatibilité — délègue au WebhookService centralisé.
 * Préférer les routes spécifiques par provider (/finance/webhooks/wave, /finance/webhooks/orange-money).
 */
export async function POST(req: NextRequest) {
  try {
    const providerId = req.nextUrl.searchParams.get('provider')?.toUpperCase();
    if (!providerId) {
      return NextResponse.json({ success: false, message: 'Paramètre provider manquant' }, { status: 400 });
    }

    const rawBody = await req.text();

    const signatureHeader: Record<string, string> = {
      WAVE: 'wave-signature',
      ORANGE_MONEY: 'x-orange-signature',
    };
    const headerName = signatureHeader[providerId] || 'x-signature';
    const signature = req.headers.get(headerName) || '';

    if (!signature) {
      return NextResponse.json({ success: false, message: `En-tête ${headerName} manquant` }, { status: 401 });
    }

    const result = await WebhookService.processWebhook(providerId, rawBody, signature);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[Webhook Payment Legacy] Erreur:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
  }
}
