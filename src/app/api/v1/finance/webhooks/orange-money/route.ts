import { NextResponse } from 'next/server';
import { WebhookService } from '../../../../../../features/finance/services/webhook.service';

export const runtime = 'nodejs';

/**
 * POST /api/v1/finance/webhooks/orange-money
 * Webhook Orange Money — délègue au WebhookService centralisé.
 */
export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-orange-signature') || '';
    if (!signature) {
      return NextResponse.json({ success: false, message: 'En-tête x-orange-signature manquant' }, { status: 401 });
    }

    const rawBody = await request.text();

    const result = await WebhookService.processWebhook('ORANGE_MONEY', rawBody, signature);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook Orange Money] Erreur:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
  }
}
