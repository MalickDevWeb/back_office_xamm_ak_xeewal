import { NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';
import { RedisService } from '@/core/services/redis.service';

const CACHE_TTL = 3600; // 1 heure

// GET /api/v1/rbac/roles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'DEFAULT_ORG';
    const cacheKey = `rbac:roles:${organizationId}`;

    // 1. Vérifier le cache Redis
    const cached = await RedisService.get<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, fromCache: true });
    }

    // 2. Cache MISS → interroger PostgreSQL
    // On exclut les rôles système (comme Super Admin ou Maintenance)
    const roles = await prisma.role.findMany({
      where: { 
        organizationId,
        name: { notIn: ["Maintenance", "Super Admin", "Super Administrateur"] } // Exclure maintenance et super admin
      },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { userRoles: true }
        }
      }
    });

    const formattedRoles = roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.rolePermissions.map(rp => rp.permission.slug),
      _count: {
        users: r._count?.userRoles || 0
      }
    }));

    // 3. Mettre en cache pour 1 heure
    await RedisService.set(cacheKey, formattedRoles, CACHE_TTL);

    return NextResponse.json({ success: true, data: formattedRoles, fromCache: false });
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

    // 3. Invalider le cache des rôles pour cette organisation
    await RedisService.delete(`rbac:roles:${organizationId}`);

    return NextResponse.json({ success: true, data: role });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
