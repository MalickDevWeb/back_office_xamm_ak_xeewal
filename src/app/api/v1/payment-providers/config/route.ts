import { NextResponse } from 'next/server';

/**
 * @deprecated Ce endpoint est déprécié.
 * Utilisez /api/v1/admin/payment-providers à la place.
 * Il lisait l'organizationId depuis un query param (faille de sécurité).
 */
export async function GET() {
  return NextResponse.json({
    success: false,
    code: 'ENDPOINT_DEPRECATED',
    message: 'Ce endpoint est déprécié. Utilisez GET /api/v1/admin/payment-providers'
  }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    code: 'ENDPOINT_DEPRECATED',
    message: 'Ce endpoint est déprécié. Utilisez POST /api/v1/admin/payment-providers'
  }, { status: 410 });
}
