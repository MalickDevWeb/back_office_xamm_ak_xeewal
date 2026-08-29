export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../../../../../features/auth/services/auth.service';
import { withAuth } from '../../../../../core/middlewares/authGuard';

export async function POST(request: NextRequest) {
  return withAuth(request as any, async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { success: false, error: 'Le mot de passe actuel et le nouveau mot de passe sont requis.' },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' },
          { status: 400 }
        );
      }

      const userId = (request as any).user?.id;
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Utilisateur introuvable dans le token.' },
          { status: 401 }
        );
      }

      const result = await authService.changePassword(userId, currentPassword, newPassword);
      return NextResponse.json(result, { status: 200 });

    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }
  });
}
