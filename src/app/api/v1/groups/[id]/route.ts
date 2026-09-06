import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { requirePermission } from '../../../../../core/security/permission.guard';

export const runtime = 'nodejs';

async function putHandler(req: Request, { params }: { params: { id: string } }) {
  try {
    const data = await req.json();
    
    const updatedGroup = await prisma.group.update({
      where: { id: params.id },
      data: {
        status: data.status,
        name: data.name,
        type: data.type,
        description: data.description
      }
    });
    
    return NextResponse.json({ success: true, data: updatedGroup });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du groupe:', error);
    return NextResponse.json({ success: false, message: 'Erreur serveur' }, { status: 500 });
  }
}

export const PUT = requirePermission('groups.write', putHandler);
