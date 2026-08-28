export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET() {
  try {
    const commissions = await prisma.commission.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ success: true, data: commissions, total: commissions.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newComm = await prisma.commission.create({ data });
    return NextResponse.json({ success: true, data: newComm }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500 });
  }
}
