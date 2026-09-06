import { NextResponse } from 'next/server';
import { NotificationService } from '@/features/notifications/services/notification.service';

const notificationService = new NotificationService();

export async function PATCH(
  request: Request,
  { params }: { params: { deliveryId: string } }
) {
  try {
    const deliveryId = params.deliveryId;

    if (!deliveryId) {
      return NextResponse.json(
        { success: false, message: 'Le paramètre deliveryId est requis' },
        { status: 400 }
      );
    }

    const updatedDelivery = await notificationService.markAsRead(deliveryId);
    
    return NextResponse.json({
      success: true,
      message: 'Notification marquée comme lue',
      data: updatedDelivery
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de la mise à jour de la notification' },
      { status: 500 }
    );
  }
}
