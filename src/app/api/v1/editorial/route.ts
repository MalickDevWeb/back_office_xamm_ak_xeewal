export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4200',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get('page');

    if (page) {
      const editorial = await prisma.editorial.findUnique({ where: { page } });
      return NextResponse.json({ success: true, data: editorial ? JSON.parse(editorial.content) : null }, { headers: corsHeaders });
    }

    const all = await prisma.editorial.findMany();
    return NextResponse.json({ success: true, data: all }, { headers: corsHeaders });
  } catch (error) {
    console.error('GET /editorial error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données", error: error instanceof Error ? error.message : String(error) }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { page, content } = body;

    const updated = await prisma.editorial.upsert({
      where: { page },
      update: { content: JSON.stringify(content) },
      create: { page, content: JSON.stringify(content) }
    });

    return NextResponse.json({ success: true, data: updated }, { status: 200, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour" }, { status: 500, headers: corsHeaders });
  }
}
