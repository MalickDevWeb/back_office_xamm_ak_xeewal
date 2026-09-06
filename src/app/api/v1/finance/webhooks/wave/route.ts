import { NextResponse } from 'next/server';
import { WebhookService } from '../../../../../../features/finance/services/webhook.service';

export const runtime = 'nodejs';

/**
 * POST /api/v1/finance/webhooks/wave
 * Webhook Wave — délègue au WebhookService centralisé.
 */
export async function POST(request: Request) {
  try {
    const signature = request.headers.get('wave-signature') || '';
    if (!signature) {
      return NextResponse.json({ success: false, message: 'En-tête wave-signature manquant' }, { status: 401 });
    }

    const rawBody = await request.text();

    const result = await WebhookService.processWebhook('WAVE', rawBody, signature);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // Wave et les providers exigent un 200 rapide
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('[Webhook Wave] Erreur:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
  }
}
