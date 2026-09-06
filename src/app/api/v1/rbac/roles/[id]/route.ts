import { NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';
import { RedisService } from '@/core/services/redis.service';

// GET /api/v1/rbac/roles/[id]
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });

    if (!role) {
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    }

    const formattedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.rolePermissions.map(rp => rp.permission.slug)
    };

    return NextResponse.json({ success: true, data: formattedRole });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT /api/v1/rbac/roles/[id]
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, permissions } = body;

    // 1. Mettre à jour le rôle
    const role = await prisma.role.update({
      where: { id },
      data: {
        name,
        description
      }
    });

    // 2. Mettre à jour les permissions si fournies
    if (permissions && Array.isArray(permissions)) {
      // Supprimer les anciennes permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id }
      });

      if (permissions.length > 0) {
        // Trouver les IDs des nouvelles permissions
        const permissionRecords = await prisma.permission.findMany({
          where: { slug: { in: permissions } }
        });

        // Assigner les nouvelles permissions
        if (permissionRecords.length > 0) {
          await prisma.rolePermission.createMany({
            data: permissionRecords.map(p => ({
              roleId: id,
              permissionId: p.id
            }))
          });
        }
      }
    }

    // Invalider le cache des rôles
    await RedisService.invalidateByPrefix('rbac:roles:');

    return NextResponse.json({ success: true, data: role });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/v1/rbac/roles/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    await prisma.role.delete({
      where: { id }
    });

    // Invalider le cache des rôles
    await RedisService.invalidateByPrefix('rbac:roles:');

    return NextResponse.json({ success: true, message: 'Role deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
