export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/core/lib/cors';
import { AdminUserService } from '@/features/profiles/services/admin-user.service';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const users = await AdminUserService.getAllUsers();
    return NextResponse.json(
      { success: true, data: users },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur lors de la récupération des utilisateurs' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, message: 'Le nom, l\'adresse email et le mot de passe sont requis' },
        { status: 400, headers: corsHeaders }
      );
    }

    const user = await AdminUserService.createUser({
      name: body.name,
      email: body.email,
      password: body.password,
      telephone: body.telephone,
      profileId: body.profileId,
    });

    return NextResponse.json(
      { success: true, message: 'Membre créé avec succès', data: user },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur lors de la création du membre' },
      { status: 400, headers: corsHeaders }
    );
  }
}
