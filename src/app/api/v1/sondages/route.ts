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

export async function GET() {
  try {
    const sondages = await prisma.sondage.findMany({
      include: { options: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: sondages, total: sondages.length }, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newSondage = await prisma.sondage.create({
      data: {
        question: data.question,
        options: {
          create: data.options.map((opt: string) => ({ texte: opt }))
        }
      },
      include: { options: true }
    });
    return NextResponse.json({ success: true, data: newSondage }, { status: 201, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500, headers: corsHeaders });
  }
}
