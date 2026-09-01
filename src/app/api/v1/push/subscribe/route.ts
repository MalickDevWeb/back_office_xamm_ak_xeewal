export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../../core/lib/prisma';

export async function POST(req: Request) {
  try {
    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ success: false, message: 'Invalid subscription' }, { status: 400 });
    }

    // Save to database, if exists just ignore or update
    await (prisma.pushSubscription as any).upsert({
      where: { endpoint: subscription.endpoint },
      update: { keys: subscription.keys },
      create: {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      }
    });

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}
