export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { validateInput, validationErrorResponse, PoleSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { withAuth } from '../../../../core/middlewares/authGuard';

export async function GET() {
  try {
    const poles = await prisma.pole.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: poles, total: poles.length });
  } catch (error) {
    console.error('GET /poles error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const data = await req.json();
      const validation = validateInput(PoleSchema, data);
      if (!validation.success) {
        return validationErrorResponse(validation.error);
      }
      const newPole = await prisma.pole.create({ data });
      return NextResponse.json({ success: true, data: newPole }, { status: 201 });
    } catch (error: any) {
      console.error('POST /poles error:', error);
      return NextResponse.json({ success: false, message: "Erreur lors de la création", error: error.message }, { status: 500 });
    }
  });
}
