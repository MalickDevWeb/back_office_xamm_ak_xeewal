export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    const where: any = {};

    // Filter by telephone (person identifier)
    const telephone = searchParams.get('telephone');
    if (telephone) {
      where.telephone = telephone;
    }

    // Filter by lu (read/unread)
    const lu = searchParams.get('lu');
    if (lu !== null && lu !== undefined) {
      where.lu = lu === 'true';
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: messages,
      total: messages.length,
      filters: { telephone, lu }
    });
  } catch (error) {
    console.error('GET /messages error:', error);
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newMsg = await prisma.message.create({ data });
    return NextResponse.json({ success: true, data: newMsg }, { status: 201 });
  } catch (error: any) {
    console.error('POST /messages error:', error);
    return NextResponse.json({ success: false, message: "Erreur lors de la création", error: error.message }, { status: 500 });
  }
}
