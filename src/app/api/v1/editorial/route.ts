export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = url.searchParams.get('page');
    
    if (page) {
      const editorial = await prisma.editorial.findUnique({ where: { page } });
      return NextResponse.json({ success: true, data: editorial ? JSON.parse(editorial.content) : null });
    }
    
    const all = await prisma.editorial.findMany();
    return NextResponse.json({ success: true, data: all });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { page, content } = body; // content est l'objet complet
    
    const updated = await prisma.editorial.upsert({
      where: { page },
      update: { content: JSON.stringify(content) },
      create: { page, content: JSON.stringify(content) }
    });
    
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
