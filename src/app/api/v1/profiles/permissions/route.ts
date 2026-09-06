export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/core/lib/cors';
import { PERMISSION_MODULES } from '@/features/profiles/constants/permissions.constant';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  return NextResponse.json(
    { success: true, data: PERMISSION_MODULES },
    { headers: corsHeaders }
  );
}
