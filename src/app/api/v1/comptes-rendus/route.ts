import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET() {
  try {
    const cr = await prisma.compteRendu.findMany({ orderBy: { date: 'desc' } });
    return NextResponse.json({ success: true, data: cr, total: cr.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newCr = await prisma.compteRendu.create({ data });
    return NextResponse.json({ success: true, data: newCr }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500 });
  }
}
