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

      const { email, password } = body;
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
}

export const authController = new AuthController();
