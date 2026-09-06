import { NextResponse } from 'next/server';
import { GroupService } from '@/features/groups/services/group.service';

const groupService = new GroupService();
const DEFAULT_ORG_ID = 'DEFAULT_ORG'; // Simulation multi-tenant

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;

    const members = await groupService.getGroupMembers(organizationId, params.id);
    
    return NextResponse.json({
      success: true,
      data: members
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de la récupération des membres' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const organizationId = body.organizationId || DEFAULT_ORG_ID;
    
    // memberIds est attendu comme un tableau de strings
    if (!body.memberIds || !Array.isArray(body.memberIds) || body.memberIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'La liste des memberIds est requise' },
        { status: 400 }
      );
    }

    const assignedBy = body.assignedBy || 'SYSTEM';

    await groupService.addMembersToGroup(organizationId, params.id, body.memberIds, assignedBy);
    
    return NextResponse.json({
      success: true,
      message: `${body.memberIds.length} membre(s) ajouté(s) avec succès`
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de l\'ajout des membres' },
      { status: 500 }
    );
  }
}
