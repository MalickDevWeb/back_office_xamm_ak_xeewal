import { NextResponse } from 'next/server';
import { NotificationProcessor } from '@/features/notifications/workers/notification-processor';

// Ce token devrait être vérifié en prod (ex: Vercel CRON_SECRET)
const CRON_SECRET = process.env.CRON_SECRET || 'secret-cron-key-for-dev';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || request.headers.get('Authorization')?.replace('Bearer ', '');

    // Sécurisation basique pour éviter un abus public
    if (token !== CRON_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const processor = new NotificationProcessor();
    const count = await processor.processPendingNotifications();
    
    return NextResponse.json({
      success: true,
      message: `Cron executed. Processed ${count} pending notification(s).`
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de l\'exécution du cron' },
      { status: 500 }
    );
  }
}
