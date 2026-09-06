export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/core/lib/cors';
import { ProfileService } from '@/features/profiles/services/profile.service';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const profile = await ProfileService.getProfileById(params.id);
    return NextResponse.json(
      { success: true, data: profile },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Profil introuvable' },
      { status: 404, headers: corsHeaders }
    );
  }
}

import { AuditService } from '@/features/finance/services/audit.service';
import { verify } from 'jsonwebtoken';
import { config as envConfig } from '@/core/lib/env';

function getCurrentUser(req: NextRequest): any {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return undefined;
    const token = authHeader.substring(7);
    return verify(token, envConfig.jwtSecret) as any;
  } catch {
    return undefined;
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();
    const currentUser = getCurrentUser(req);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    const updated = await ProfileService.updateProfile(params.id, {
      name: body.name,
      description: body.description,
      permissions: body.permissions,
    });

    await AuditService.log({
      actorId: currentUser?.id || currentUser?.email || 'Admin',
      actorName: currentUser?.name,
      actorEmail: currentUser?.email,
      action: 'PROFILE_PERMISSIONS_CHANGED',
      category: 'SECURITY',
      severity: 'CRITICAL',
      entityType: 'Profile',
      entityId: params.id,
      metadata: {
        profileName: updated.name,
        permissionsCount: updated.permissions.length,
        permissions: updated.permissions,
      },
      ipAddress: ip,
    });

    return NextResponse.json(
      { success: true, message: 'Profil mis à jour avec succès', data: updated },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur lors de la mise à jour du profil' },
      { status: 400, headers: corsHeaders }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const currentUser = getCurrentUser(req);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    await ProfileService.deleteProfile(params.id);

    await AuditService.log({
      actorId: currentUser?.id || currentUser?.email || 'Admin',
      actorName: currentUser?.name,
      actorEmail: currentUser?.email,
      action: 'PROFILE_DELETED',
      category: 'SECURITY',
      severity: 'HIGH',
      entityType: 'Profile',
      entityId: params.id,
      ipAddress: ip,
    });

    return NextResponse.json(
      { success: true, message: 'Profil supprimé avec succès' },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur lors de la suppression du profil' },
      { status: 400, headers: corsHeaders }
    );
  }
}
