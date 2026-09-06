import { NextRequest, NextResponse } from 'next/server';
import { authService } from '../services/auth.service';
import { LoginSchema } from '../schemas/auth.schema';

export class AuthController {
  async login(request: NextRequest) {
    try {
      const body = await request.json();
      const validation = LoginSchema.validate(body);

      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: validation.errors.join(' ') },
          { status: 400 }
        );
      }

      const email = body.email.trim().toLowerCase();
      const password = body.password.trim();
      const result = await authService.login(email, password);
      
      return NextResponse.json({
        success: true,
        data: result
      }, { status: 200 });

    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }
  }

  async logout(request: NextRequest) {
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        await authService.logout(token);
      }
      return NextResponse.json({ success: true, message: 'Déconnexion réussie' }, { status: 200 });
    } catch (error: any) {
      return NextResponse.json({ success: true, message: 'Déconnexion' }, { status: 200 });
    }
  }
}

export const authController = new AuthController();
