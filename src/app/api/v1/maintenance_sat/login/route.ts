export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { config as envConfig } from '@/core/lib/env';
import { sign } from 'jsonwebtoken';
import { prisma } from '../../../../../core/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Verification
    if (email !== 'maintenance_sat1732@gmail.com') {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    // Sign a specific super admin token
    const secret = envConfig.jwtSecret;
    const token = sign({ id: user.id, role: 'SUPER_ADMIN' }, secret, { expiresIn: '1d' });

    return NextResponse.json({ success: true, token });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error' }, { status: 500 });
  }
}
