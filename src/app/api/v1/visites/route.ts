export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, VisiteSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { withAuth } from '../../../../core/middlewares/authGuard';

// GET /api/v1/visites
export async function GET() {
  try {
    const visites = await prisma.visite.findMany({ orderBy: { date: 'desc' } });
    return NextResponse.json({ success: true, data: visites, total: visites.length });
  } catch (error) {
    console.error('GET /visites error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// POST /api/v1/visites
export async function POST(req: Request) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const data = await req.json();
      const validation = validateInput(VisiteSchema, data);
      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }
      
      const createData: any = { ...validation.data };
      if (createData.mediaUrls && Array.isArray(createData.mediaUrls)) {
        createData.mediaCount = createData.mediaUrls.length;
        if (createData.mediaUrls.length > 0) {
          createData.typeMedia = createData.mediaUrls[0].match(/\.(mp4|webm|mov)/i) ? 'VIDEOS' : 'PHOTOS';
        }
      }
      
      const newVisite = await prisma.visite.create({ data: createData });
      return NextResponse.json({ success: true, data: newVisite }, { status: 201 });
    } catch (error: any) {
      console.error('POST /visites error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la création", error: error.message }, { status: 500 });
    }
  });
}
