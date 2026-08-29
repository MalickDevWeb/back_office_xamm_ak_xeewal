export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { authController } from '../../../../../features/auth/controllers/auth.controller';

export async function POST(request: NextRequest) {
  const response = await authController.login(request);
  return response;
}
