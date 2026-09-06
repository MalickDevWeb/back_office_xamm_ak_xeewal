export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { authController } from '../../../../../features/auth/controllers/auth.controller';
import { withAuth } from '../../../../../core/middlewares/authGuard';

async function logoutHandler(request: NextRequest) {
  return await authController.logout(request);
}

export const POST = (req: NextRequest) => withAuth(req, logoutHandler);
