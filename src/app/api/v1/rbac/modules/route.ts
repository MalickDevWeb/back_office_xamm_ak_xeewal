import { NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';

// GET /api/v1/rbac/modules
// Liste tous les modules et sous-modules avec leur état d'activation pour l'organisation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'DEFAULT_ORG';

    // Récupérer les modules activés pour cette organisation
    const orgModules = await prisma.organizationModule.findMany({
      where: { organizationId, enabled: true },
      include: {
        module: {
          include: {
            permissions: true
          }
        }
      }
    });

    const flatPermissions: any[] = [];
    
    orgModules.forEach(om => {
      om.module.permissions.forEach(p => {
        flatPermissions.push({
          id: p.slug, // On utilise le slug comme ID dans le frontend (ex: 'finance.expenses.read')
          label: p.description || p.slug,
          description: p.description || p.slug,
          icon: om.module.icon || 'fa-solid fa-cube',
          category: om.module.name
        });
      });
    });

    return NextResponse.json({ success: true, data: flatPermissions });
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
