import { NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';

// GET /api/v1/rbac/roles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'DEFAULT_ORG';

    const roles = await prisma.role.findMany({
      where: { organizationId },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    const formattedRoles = roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.rolePermissions.map(rp => rp.permission.slug)
    }));

    return NextResponse.json({ success: true, data: formattedRoles });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/v1/rbac/roles
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, permissions, organizationId = 'DEFAULT_ORG' } = body;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Le nom du rôle est requis' }, { status: 400 });
    }

    // 1. Créer le rôle
    const role = await prisma.role.create({
      data: {
        name,
        description,
        organizationId
      }
    });

    // 2. Assigner les permissions si fournies
    if (permissions && Array.isArray(permissions) && permissions.length > 0) {
      // Trouver les IDs des permissions via leurs slugs
      const permissionRecords = await prisma.permission.findMany({
        where: { slug: { in: permissions } }
      });

      if (permissionRecords.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionRecords.map(p => ({
            roleId: role.id,
            permissionId: p.id
          }))
        });
      }
    }

    return NextResponse.json({ success: true, data: role });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
