export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET() {
  try {
    const adherents = await prisma.adherent.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: adherents, total: adherents.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newAdherent = await prisma.adherent.create({ data });
    return NextResponse.json({ success: true, data: newAdherent }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500 });
  }
}
