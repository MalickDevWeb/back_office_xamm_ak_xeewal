import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function withAuth(req: NextRequest, handler: Function) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    
    const decoded = verify(token, secret);
    
    // Add decoded user to request as a custom header or passed to handler
    (req as any).user = decoded;

    return await handler(req);
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Token invalide ou expiré' }, { status: 401, headers: corsHeaders });
  }
}
