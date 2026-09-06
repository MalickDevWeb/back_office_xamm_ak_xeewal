import { NextResponse } from 'next/server';
import { GroupService } from '@/features/groups/services/group.service';
import { requirePermission } from '../../../../core/security/permission.guard';

const groupService = new GroupService();
const DEFAULT_ORG_ID = 'DEFAULT_ORG'; // Simulation du multi-tenant pour le MVP

async function getGroupsHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const organizationId = request.headers.get('x-organization-id') || DEFAULT_ORG_ID;

    const groups = await groupService.getGroups(organizationId, status);
    
    return NextResponse.json({
      success: true,
      data: groups
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de la récupération des groupes' },
      { status: 500 }
    );
  }
}

async function createGroupHandler(request: Request) {
  try {
    const body = await request.json();
    const organizationId = request.headers.get('x-organization-id') || DEFAULT_ORG_ID;

    if (!body.name || !body.type) {
      return NextResponse.json(
        { success: false, message: 'Le nom et le type du groupe sont requis' },
        { status: 400 }
      );
    }

    const group = await groupService.createGroup(organizationId, {
      name: body.name,
      type: body.type,
      description: body.description
    });
    
    return NextResponse.json({
      success: true,
      data: group
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de la création du groupe' },
      { status: 500 }
    );
  }
}

export const GET = requirePermission('groups.read', getGroupsHandler);
export const POST = requirePermission('groups.write', createGroupHandler);
