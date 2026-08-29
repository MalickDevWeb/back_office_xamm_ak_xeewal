export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { withAuth } from '../../../../core/middlewares/authGuard';


const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4200',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    const activites = await prisma.activite.findMany({ orderBy: { date: 'desc' } });
    return NextResponse.json({ success: true, data: activites, total: activites.length }, { headers: corsHeaders });
  } catch (error) {
    console.error('GET /activites error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données", error: error instanceof Error ? error.message : String(error) }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  return withAuth(req as any, async (req: Request) => {
    try {
      const data = await req.json();
      const newAct = await prisma.activite.create({ data });
      return NextResponse.json({ success: true, data: newAct }, { status: 201, headers: corsHeaders });
    } catch (error) {
      return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500, headers: corsHeaders });
    }
  });
}
