export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { validateInput, validationErrorResponse, PoleSchema } from '../../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { withAuth } from '../../../../../core/middlewares/authGuard';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const pole = await prisma.pole.findUnique({ where: { id } });
    if (!pole) {
      return NextResponse.json({ success: false, message: 'Pôle non trouvé' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: pole });
  } catch (error) {
    console.error('GET /poles/:id error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const data = await req.json();
      const validation = validateInput(PoleSchema, data);
      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }
      const { id } = params;
      
      const updated = await prisma.pole.update({
        where: { id },
        data: {
          titre: data.titre,
          description: data.description,
          objectifs: data.objectifs,
          statut: data.statut
        }
      });
      
      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      console.error('PUT /poles/:id error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la modification" }, { status: 500 });
    }
  });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const { id } = params;
      await prisma.pole.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Pôle supprimé' });
    } catch (error) {
      console.error('DELETE /poles/:id error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la suppression" }, { status: 500 });
    }
  });
}
