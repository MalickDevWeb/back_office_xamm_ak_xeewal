import { NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';

// GET /api/v1/rbac/modules
// Liste tous les modules et sous-modules avec leur état d'activation pour l'organisation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'DEFAULT_ORG';

    const modules = await prisma.module.findMany({
      include: {
        subModules: true,
        permissions: true,
        organizationModules: {
          where: { organizationId }
        }
      }
    });

    const formattedModules = modules.map(m => {
      const orgModule = m.organizationModules[0];
      return {
        id: m.id,
        name: m.name,
        slug: m.slug,
        description: m.description,
        icon: m.icon,
        isSystem: m.isSystem,
        enabled: orgModule ? orgModule.enabled : false,
        subModules: m.subModules,
        permissions: m.permissions
      };
    });

    return NextResponse.json({ success: true, data: formattedModules });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/v1/rbac/modules
// Active ou désactive un module pour une organisation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { moduleId, organizationId = 'DEFAULT_ORG', enabled } = body;

    if (!moduleId || enabled === undefined) {
      return NextResponse.json({ success: false, message: 'moduleId et enabled sont requis' }, { status: 400 });
    }

    const orgModule = await prisma.organizationModule.upsert({
      where: {
        organizationId_moduleId: {
          organizationId,
          moduleId
        }
      },
      update: {
        enabled,
        enabledAt: enabled ? new Date() : null
      },
      create: {
        organizationId,
        moduleId,
        enabled,
        enabledAt: enabled ? new Date() : null
      }
    });

    return NextResponse.json({ success: true, data: orgModule });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
