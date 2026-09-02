export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../core/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { optionId } = await req.json();

    if (!optionId) {
      return NextResponse.json({ success: false, message: 'Option manquante' }, { status: 400 });
    }

    // Update the option votes
    await prisma.sondageOption.update({
      where: { id: optionId },
      data: { votes: { increment: 1 } }
    });

    // Update the total participants of the sondage
    const updatedSondage = await prisma.sondage.update({
      where: { id: params.id },
      data: { participants: { increment: 1 } },
      include: { options: true }
    });

    return NextResponse.json({ success: true, data: updatedSondage });
  } catch (error) {
    console.error('POST /sondages/[id]/vote error:', error);
    return NextResponse.json({ success: false, message: 'Erreur lors du vote' }, { status: 500 });
  }
}
