import { NextResponse } from 'next/server';
import { NotificationService } from '@/features/notifications/services/notification.service';

const notificationService = new NotificationService();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { success: false, message: 'Le paramètre memberId est requis' },
        { status: 400 }
      );
    }

    const notifications = await notificationService.getMyNotifications(memberId);
    const unreadCount = await notificationService.getUnreadCount(memberId);
    
    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}
