export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/core/lib/cors';
import { ProfileService } from '@/features/profiles/services/profile.service';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const profiles = await ProfileService.getAllProfiles();
    return NextResponse.json(
      { success: true, data: profiles },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur lors de la récupération des profils' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Le nom du profil est obligatoire' },
        { status: 400, headers: corsHeaders }
      );
    }

    const profile = await ProfileService.createProfile({
      name: body.name,
      description: body.description,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
    });

    return NextResponse.json(
      { success: true, message: 'Profil créé avec succès', data: profile },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur lors de la création du profil' },
      { status: 400, headers: corsHeaders }
    );
  }
}
