import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { withAuth } from '../../../../../core/middlewares/authGuard';

// DELETE /api/v1/options/[id] - Delete an option (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req: NextRequest) => {
    try {
      const { id } = params;

      if (!id) {
        return NextResponse.json({ success: false, message: 'ID requis' }, { status: 400 });
      }

      await prisma.option.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Option supprimée' });
    } catch (error) {
      return NextResponse.json({ success: false, message: 'Erreur lors de la suppression' }, { status: 500 });
    }
  });
}

// PUT /api/v1/options/[id] - Update an option (admin only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(request, async (req: NextRequest) => {
    try {
      const { id } = params;
      const { label, ordre, actif } = await req.json();

      const option = await prisma.option.update({
        where: { id },
        data: {
          ...(label !== undefined && { label }),
          ...(ordre !== undefined && { ordre }),
          ...(actif !== undefined && { actif })
        }
      });

      return NextResponse.json({ success: true, data: option });
    } catch (error) {
      return NextResponse.json({ success: false, message: 'Erreur lors de la mise à jour' }, { status: 500 });
    }
  });
}

// GET /api/v1/options/[id] - Get a single option (public)
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const option = await prisma.option.findUnique({ where: { id } });
    
    if (!option) {
      return NextResponse.json({ success: false, message: 'Option non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: option });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur base de données' }, { status: 500 });
  }
}
