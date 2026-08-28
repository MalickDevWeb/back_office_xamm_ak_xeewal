export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET() {
  try {
    const besoins = await prisma.besoin.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: besoins, total: besoins.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newBesoin = await prisma.besoin.create({ data });
    return NextResponse.json({ success: true, data: newBesoin }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500 });
  }
}
