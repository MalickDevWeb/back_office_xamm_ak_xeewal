import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { PaymentProviderFactory } from '../../../../../../features/finance/providers/payment-provider.factory';
import { PaymentService } from '../../../../../../features/finance/services/payment.service';

export async function POST(request: Request) {
  try {
    const signature = request.headers.get('wave-signature');
    if (!signature) {
      return NextResponse.json({ success: false, message: 'Signature manquante' }, { status: 401 });
    }

    const payload = await request.text();
    const event = JSON.parse(payload);
    
    // Simplification: en production, on devrait itérer ou retrouver l'orgId via la clé API / URL webhook
    // Ici on prend la configuration globale de Wave pour l'organisation par défaut
    const config = await prisma.paymentProviderConfig.findFirst({
      where: { provider: 'WAVE', enabled: true }
    });

    if (!config) {
      return NextResponse.json({ success: false, message: 'Provider non configuré' }, { status: 400 });
    }

    const provider = PaymentProviderFactory.getProvider('WAVE');
    const verification = provider.verifyWebhook(event, signature, config);

    if (!verification.isValid || !verification.transactionId) {
      return NextResponse.json({ success: false, message: 'Webhook invalide' }, { status: 400 });
    }

    // Protection contre les doublons
    const eventId = event.id || verification.transactionId;
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider: 'WAVE', eventId } }
    });

    if (existingEvent && existingEvent.status === 'PROCESSED') {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Enregistrement du webhook
    await prisma.paymentWebhookEvent.upsert({
      where: { provider_eventId: { provider: 'WAVE', eventId } },
      update: {},
      create: {
        provider: 'WAVE',
        eventId,
        payloadHash: signature, // simplifé
        status: 'RECEIVED'
      }
    });

    // Trouver la transaction
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { organizationId_idempotencyKey: { 
        organizationId: config.organizationId!, 
        idempotencyKey: verification.transactionId 
      }}
    });

    if (transaction && transaction.status !== 'SUCCESS') {
      // Confirmer le paiement (nécessite de connaitre le compte Wave)
      const waveAccount = await prisma.financialAccount.findFirst({
        where: { organizationId: config.organizationId!, type: 'WAVE' }
      });

      if (waveAccount) {
        await PaymentService.confirmPayment(transaction.id, waveAccount.id, 'WEBHOOK');
        
        await prisma.paymentWebhookEvent.update({
          where: { provider_eventId: { provider: 'WAVE', eventId } },
          data: { status: 'PROCESSED', processedAt: new Date() }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur Webhook Wave:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
