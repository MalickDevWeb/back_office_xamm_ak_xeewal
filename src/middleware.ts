import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  // CORS Handling - wildcard for PWA access, no credentials needed for JWT
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return NextResponse.json({}, { headers: corsHeaders });
  }

  // Authentication Handling
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  const isProtectedPath = request.nextUrl.pathname.startsWith('/api/v1/') && !request.nextUrl.pathname.startsWith('/api/v1/auth');
  
  const publicPostEndpoints = ['/api/v1/besoins', '/api/v1/adherents', '/api/v1/idees', '/api/v1/messages', '/api/v1/upload-audio', '/api/v1/upload-public'];
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

  // Forward the request and attach CORS headers
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
