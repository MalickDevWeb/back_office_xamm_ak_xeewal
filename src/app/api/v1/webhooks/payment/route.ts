import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';
import { PaymentService } from '@/features/financial/services/payment.service';
import { FinancialService } from '@/features/financial/services/financial.service';
import crypto from 'crypto';

const paymentService = new PaymentService();
const financialService = new FinancialService();

export async function POST(req: NextRequest) {
  try {
    const providerId = req.nextUrl.searchParams.get('provider');
    
    if (!providerId) {
      return NextResponse.json({ error: 'Fournisseur manquant' }, { status: 400 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || ''; // S'adapte au provider (ex: Wave-Signature)
    
    // Pour cet exemple, on suppose que l'organisation ID est dans le payload ou en query
    const organizationId = req.nextUrl.searchParams.get('organizationId');
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID manquant' }, { status: 400 });
    }

    const providerImpl = paymentService.getProvider(providerId);

    // Récupérer la config
    const config = await prisma.paymentProviderConfig.findUnique({
      where: {
        organizationId_provider: {
          organizationId: organizationId,
          provider: providerId,
        },
      },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ error: 'Fournisseur non configuré ou inactif' }, { status: 400 });
    }

    if (config.webhookSecretEncrypted) {
      const isValid = providerImpl.verifyWebhookSignature(rawBody, signature, config.webhookSecretEncrypted);
      if (!isValid) {
        return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    
    // Idempotence simple (hash du payload)
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    const eventId = payload.id || `evt_${Date.now()}`;

    // Vérifier si l'événement a déjà été traité
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: providerId,
          eventId: eventId,
        },
      },
    });

    if (existingEvent && existingEvent.status === 'PROCESSED') {
      return NextResponse.json({ message: 'Événement déjà traité' }, { status: 200 });
    }

    if (!existingEvent) {
      await prisma.paymentWebhookEvent.create({
        data: {
          provider: providerId,
          eventId: eventId,
          payloadHash: payloadHash,
          status: 'PENDING',
        },
      });
    }

    // Traitement (dépend de la structure du payload du provider)
    // Ici, on fait une simulation générique pour l'abstraction
    const externalReference = payload.transaction_id;
    const paymentStatus = payload.status; // ex: 'SUCCESS', 'FAILED'

    if (externalReference) {
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { externalReference, provider: providerId },
      });

      if (transaction && transaction.status !== 'SUCCESS') {
        if (paymentStatus === 'SUCCESS') {
          await prisma.$transaction(async (tx) => {
            // Mettre à jour la transaction
            const updatedTx = await tx.paymentTransaction.update({
              where: { id: transaction.id },
              data: { status: 'SUCCESS' },
            });

            // Trouver le compte financier lié
            const account = await tx.financialAccount.findFirst({
              where: { organizationId: transaction.organizationId, type: providerId },
            });

            if (account) {
              // Créer le mouvement
              await financialService.createMovement({
                organizationId: transaction.organizationId,
                financialAccountId: account.id,
                type: 'AUTRE_ENCAISSEMENT', // À dériver du payload
                direction: 'CREDIT',
                amount: transaction.amount,
                currency: transaction.currency,
                sourceType: 'PAYMENT_TRANSACTION',
                sourceId: transaction.id,
                externalReference: externalReference,
                createdBy: 'SYSTEM_WEBHOOK',
              });
            }
          });
        } else if (paymentStatus === 'FAILED') {
          await prisma.paymentTransaction.update({
            where: { id: transaction.id },
            data: { status: 'FAILED' },
          });
        }
      }
    }

    await prisma.paymentWebhookEvent.update({
      where: {
        provider_eventId: { provider: providerId, eventId: eventId },
      },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur Webhook:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
