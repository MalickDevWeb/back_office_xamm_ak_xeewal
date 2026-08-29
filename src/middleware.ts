import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  // CORS Handling
  const origin = request.headers.get('origin') || '*';
  const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*'];
  
  const isAllowedOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, { headers: corsHeaders });
  }

  // Authentication Handling
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  const isProtectedPath = request.nextUrl.pathname.startsWith('/api/v1/') && !request.nextUrl.pathname.startsWith('/api/v1/auth');
  
  // Exclude some public POST endpoints if needed (e.g. adherents, besoins, idees, messages can be public POST)
  // For maximum security, we can keep them open but rate-limited, but here we just check if it's protected
  const publicPostEndpoints = ['/api/v1/besoins', '/api/v1/adherents', '/api/v1/idees', '/api/v1/messages', '/api/v1/upload-audio'];
  const isPublicPost = publicPostEndpoints.includes(request.nextUrl.pathname);

  if (isProtectedPath && protectedMethods.includes(request.method) && !isPublicPost) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401, headers: corsHeaders });
    }

    try {
      const token = authHeader.split(' ')[1];
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret');
      await jwtVerify(token, secret);
    } catch (error) {
      return NextResponse.json({ success: false, message: 'Token invalide' }, { status: 401, headers: corsHeaders });
    }
  }

  // Forward the request - CORS headers are set by each route handler
  // to avoid duplicate headers in the response
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
