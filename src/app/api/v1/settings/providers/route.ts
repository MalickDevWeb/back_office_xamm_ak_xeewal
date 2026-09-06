import { NextResponse } from 'next/server';
import { PaymentProviderAdminService } from '@/features/finance/services/payment-provider-admin.service';

const DEFAULT_ORG_ID = 'DEFAULT_ORG';

// GET: Récupère la liste des providers configurés (sans les clés sensibles pour des raisons de sécurité)
export async function GET(request: Request) {
  try {
    const organizationId = request.headers.get('x-organization-id') || DEFAULT_ORG_ID;
    const providers = await PaymentProviderAdminService.listProviders(organizationId);
    return NextResponse.json({ success: true, data: providers });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Ajouter ou Mettre à jour une configuration de provider
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const organizationId = request.headers.get('x-organization-id') || DEFAULT_ORG_ID;
    const { provider, credentials, config, webhookSecret, mode } = body;

    if (!provider) {
      return NextResponse.json({ success: false, message: 'Le provider est requis' }, { status: 400 });
    }

    const creds = credentials || config;
    const updated = await PaymentProviderAdminService.configureProvider(
      organizationId,
      provider,
      creds,
      webhookSecret,
      mode
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration sauvegardée avec succès',
      data: updated 
    });
  } catch (error: any) {
    console.error('Provider settings error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Erreur de sauvegarde' }, { status: 500 });
  }
}
