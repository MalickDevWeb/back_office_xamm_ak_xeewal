import { NextResponse } from 'next/server';
import { NotificationService } from '@/features/notifications/services/notification.service';

const notificationService = new NotificationService();
const DEFAULT_ORG_ID = 'DEFAULT_ORG'; 

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || DEFAULT_ORG_ID;

    const notifications = await notificationService.getNotifications(organizationId);
    
    return NextResponse.json({
      success: true,
      data: notifications
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const organizationId = body.organizationId || DEFAULT_ORG_ID;

    if (!body.title || !body.message || !body.groupIds || !Array.isArray(body.groupIds)) {
      return NextResponse.json(
        { success: false, message: 'Le titre, le message et les groupes cibles sont requis' },
        { status: 400 }
      );
    }

    // Par défaut, on utilise le canal IN_APP pour le MVP si non précisé
    const channels = body.channels || ['IN_APP'];

    const notification = await notificationService.createNotification(organizationId, {
      title: body.title,
      message: body.message,
      groupIds: body.groupIds,
      channels,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      createdBy: body.createdBy || 'SYSTEM'
    });
    
    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification créée et traitée avec succès'
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Erreur lors de la création de la notification' },
      { status: 500 }
    );
  }
}
