import { NextResponse } from 'next/server';
import { WebhookService } from '../../../../../features/finance/services/webhook.service';

export const runtime = 'nodejs';

/**
 * POST /api/v1/webhooks/payments/route
 * Point d'entrée générique (legacy) — délègue au WebhookService centralisé.
 * Le provider est déduit du payload (champ `provider`).
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, message: 'Payload JSON invalide' }, { status: 400 });
    }

    const provider: string = payload.provider?.toUpperCase();
    if (!provider) {
      return NextResponse.json({ success: false, message: 'Champ provider manquant dans le payload' }, { status: 400 });
    }

    // Récupérer la signature selon le provider
    const signatureHeader: Record<string, string> = {
      WAVE: 'wave-signature',
      ORANGE_MONEY: 'x-orange-signature',
    };
    const headerName = signatureHeader[provider] || 'x-signature';
    const signature = request.headers.get(headerName) || '';

    if (!signature) {
      return NextResponse.json({ success: false, message: `En-tête ${headerName} manquant` }, { status: 401 });
    }

    const result = await WebhookService.processWebhook(provider, rawBody, signature);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('[Webhook Payments] Erreur:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne' }, { status: 500 });
  }
}
