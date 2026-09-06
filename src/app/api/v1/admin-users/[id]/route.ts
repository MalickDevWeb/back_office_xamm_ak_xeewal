export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/core/lib/cors';
import { AdminUserService } from '@/features/profiles/services/admin-user.service';
import { AuditService } from '@/features/financial/services/audit.service';
import { verify } from 'jsonwebtoken';
import { config as envConfig } from '@/core/lib/env';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

function getCurrentUserId(req: NextRequest): string | undefined {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) return undefined;
    const token = authHeader.substring(7);
    const decoded = verify(token, envConfig.jwtSecret) as any;
    return decoded?.id;
  } catch {
    return undefined;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const user = await AdminUserService.getUserById(params.id);
    return NextResponse.json(
      { success: true, data: user },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Utilisateur introuvable' },
      { status: 404, headers: corsHeaders }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();

    const currentUserId = getCurrentUserId(req);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    const updated = await AdminUserService.updateUser(params.id, {
      name: body.name,
      email: body.email,
      password: body.password,
      telephone: body.telephone,
      profileId: body.profileId,
      actif: body.actif,
    });

    await AuditService.log({
      actorId: currentUserId || 'Admin',
      action: 'USER_UPDATED',
      category: 'SECURITY',
      severity: 'HIGH',
      entityType: 'AdminUser',
      entityId: params.id,
      metadata: {
        userName: updated.name,
        userEmail: updated.email,
        actif: updated.actif,
        profileId: updated.profileId,
      },
      ipAddress: ip,
    });

    return NextResponse.json(
      { success: true, message: 'Membre mis à jour avec succès', data: updated },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur lors de la mise à jour du membre' },
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
    const currentUserId = getCurrentUserId(req);
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';

    await AdminUserService.deleteUser(params.id, currentUserId);

    await AuditService.log({
      actorId: currentUserId || 'Admin',
      action: 'USER_DELETED',
      category: 'SECURITY',
      severity: 'CRITICAL',
      entityType: 'AdminUser',
      entityId: params.id,
      ipAddress: ip,
    });

    return NextResponse.json(
      { success: true, message: 'Membre supprimé avec succès' },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Erreur lors de la suppression du membre' },
      { status: 400, headers: corsHeaders }
    );
  }
}
