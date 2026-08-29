export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();
    // Convert array of {key, value} to a single object {key: value}
    const data = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /settings error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const keys = Object.keys(body);
    
    // Update or create each setting key
    for (const key of keys) {
      await prisma.settings.upsert({
        where: { key },
        update: { value: body[key].toString() },
        create: { key, value: body[key].toString() }
      });
    }
    
    return NextResponse.json({ success: true, message: "Paramètres mis à jour" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
