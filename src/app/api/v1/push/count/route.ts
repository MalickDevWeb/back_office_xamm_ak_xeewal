export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';

export async function GET() {
  try {
    const count = await (prisma.pushSubscription as any).count();
    return NextResponse.json({ success: true, count });
  } catch (error) {
    return NextResponse.json({ success: false, count: 0 }, { status: 500 });
  }
}
