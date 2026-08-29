import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

export const runtime = 'nodejs';



// GET /api/v1/options?type=quartier
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    const options = await prisma.option.findMany({
      where: type ? { type, actif: true } : { actif: true },
      orderBy: [{ ordre: 'asc' }, { label: 'asc' }],
    });
    return NextResponse.json({ success: true, data: options });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur base de données' }, { status: 500 });
  }
}

// POST /api/v1/options
export async function POST(request: Request) {
  try {
    const { type, value, label, ordre } = await request.json();

    if (!type || !value || !label) {
      return NextResponse.json({ success: false, message: 'type, value et label requis' }, { status: 400 });
    }

    const option = await prisma.option.create({
      data: { type, value, label, ordre: ordre ?? 0 },
    });

    return NextResponse.json({ success: true, data: option }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, message: 'Cette option existe déjà' }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: 'Erreur lors de la création' }, { status: 500 });
  }
}

// PUT /api/v1/options
export async function PUT(request: Request) {
  try {
    const { id, label, ordre, actif } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, message: 'ID requis' }, { status: 400 });
    }

    const option = await prisma.option.update({
      where: { id },
      data: { ...(label && { label }), ...(ordre !== undefined && { ordre }), ...(actif !== undefined && { actif }) },
    });

    return NextResponse.json({ success: true, data: option });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

// DELETE /api/v1/options?id=xxx
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, message: 'ID requis' }, { status: 400 });
  }

  try {
    await prisma.option.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Option supprimée' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
