export const runtime = 'nodejs';
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
    
    // Renvoyer les configurations spécifiques
    const keys = ['SECRET_CLOUDINARY_CLOUD_NAME', 'SECRET_CLOUDINARY_API_KEY', 'SECRET_CLOUDINARY_API_SECRET', 'MAINTENANCE_MODE'];
    const settings = await prisma.settings.findMany({
      where: { key: { in: keys } }
    });

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

    const allowedKeys = ['SECRET_CLOUDINARY_CLOUD_NAME', 'SECRET_CLOUDINARY_API_KEY', 'SECRET_CLOUDINARY_API_SECRET', 'MAINTENANCE_MODE'];

    for (const key of Object.keys(body)) {
      if (allowedKeys.includes(key)) {
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
