export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, ActiviteSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { withAuth } from '../../../../core/middlewares/authGuard';

export async function GET() {
  try {
    const activites = await prisma.activite.findMany({ orderBy: { date: 'desc' } });
    return NextResponse.json({ success: true, data: activites, total: activites.length });
  } catch (error) {
    console.error('GET /activites error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const data = await req.json();
    const validation = validateInput(ActiviteSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
      const newAct = await prisma.activite.create({ data });
      return NextResponse.json({ success: true, data: newAct }, { status: 201 });
    } catch (error: any) {
      console.error('POST /activites error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la création", error: error.message }, { status: 500 });
    }
  });
}

// PUT /api/v1/activites/:id
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const data = await req.json();
    const validation = validateInput(ActiviteSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
      const { id } = params;
      
      const updated = await prisma.activite.update({
        where: { id },
        data: {
          titre: data.titre,
          description: data.description,
          categorie: data.categorie,
          date: data.date ? new Date(data.date) : undefined,
          typeMedia: data.typeMedia,
          mediaUrl: data.mediaUrl,
          mediaCount: data.mediaCount,
          statut: data.statut
        }
      });
      
      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      console.error('PUT /activites error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la modification" }, { status: 500 });
    }
  });
}

// DELETE /api/v1/activites/:id
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const { id } = params;
      await prisma.activite.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Activité supprimée' });
    } catch (error) {
      console.error('DELETE /activites error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la suppression" }, { status: 500 });
    }
  });
}
