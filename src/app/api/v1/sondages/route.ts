export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, SondageSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';



export async function GET() {
  try {
    const sondages = await prisma.sondage.findMany({
      include: { options: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: sondages, total: sondages.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const validation = validateInput(SondageSchema, data);
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    const newSondage = await prisma.sondage.create({
      data: {
        question: data.question,
        options: {
          create: data.options.map((opt: string) => ({ texte: opt }))
        }
      },
      include: { options: true }
    });
    return NextResponse.json({ success: true, data: newSondage }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur lors de la création" }, { status: 500 });
  }
}
