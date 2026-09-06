export const runtime = 'nodejs';
import { validateInput, validationErrorResponse, SondageSchema } from '../../../../core/lib/validation';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';
import { requirePermission } from '../../../../core/security/permission.guard';



export const GET = requirePermission('sondages.read', async () => {
  try {
    const sondages = await prisma.sondage.findMany({
      include: { options: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: sondages, total: sondages.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Erreur base de données" }, { status: 500 });
  }
});

export const POST = requirePermission('sondages.create', async (req: Request) => {
  try {
    const data = await req.json();
    const validation = validateInput(SondageSchema, data);
    if (!validation.success) {
      return validationErrorResponse((validation as any).error);
    }
    const newSondage = await prisma.sondage.create({
      data: {
        question: data.question,
        imageUrl: data.imageUrl || null,
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
});
