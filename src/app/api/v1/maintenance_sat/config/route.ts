export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';
import { verify } from 'jsonwebtoken';

function requireSuperAdmin(req: Request) {
  const authHeader = req.headers.get('authorization');
  console.log('authHeader:', authHeader);
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'fallback_secret';
  try {
    const decoded = verify(token, secret) as any;
    console.log('decoded:', decoded);
    if (decoded.role !== 'SUPER_ADMIN') {
      throw new Error('Forbidden');
    }
  } catch (err) {
    console.error('JWT Verify Error:', err);
    throw err;
  }
}

export async function GET(req: Request) {
  try {
    requireSuperAdmin(req);
    
    // Renvoyer TOUTES les configurations (y compris les SECRET_)
    const settings = await prisma.settings.findMany();

    const data = settings.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    requireSuperAdmin(req);
    const body = await req.json();

    // Permettre la sauvegarde de toutes les clés (le Super Admin a les pleins pouvoirs)
    for (const key of Object.keys(body)) {
      if (typeof body[key] === 'string' || typeof body[key] === 'boolean' || typeof body[key] === 'number') {
        await prisma.settings.upsert({
          where: { key },
          update: { value: String(body[key]) },
          create: { key, value: String(body[key]) }
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Configuration enregistrée' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    requireSuperAdmin(req);
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    
    if (key) {
      await prisma.settings.deleteMany({
        where: { key }
      });
    }

    return NextResponse.json({ success: true, message: 'Clé supprimée' });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
}
