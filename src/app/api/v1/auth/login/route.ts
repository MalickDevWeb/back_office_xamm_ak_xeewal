export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { authController } from '../../../../../features/auth/controllers/auth.controller';

export async function POST(request: NextRequest) {
  const response = await authController.login(request);
const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:4200',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
  return response;
}
