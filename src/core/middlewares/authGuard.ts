import { NextRequest, NextResponse } from 'next/server';
import { config as envConfig } from '@/core/lib/env';
import { verify } from 'jsonwebtoken';
import { getCorsHeaders } from '../lib/cors';

export async function withAuth(req: NextRequest, handler: Function) {
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Non autorisé' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.split(' ')[1];
    const secret = envConfig.jwtSecret;

    // Vérifier si le token est révoqué (déconnexion)
    const { RedisService } = require('@/core/services/redis.service');
    const isBlacklisted = await RedisService.get(`blacklist:token:${token}`);
    if (isBlacklisted) {
      return NextResponse.json({ success: false, message: 'Token révoqué' }, { status: 401, headers: corsHeaders });
    }

    const decoded = verify(token, secret);

    (req as any).user = decoded;

    return await handler(req);
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Token invalide ou expiré' }, { status: 401, headers: corsHeaders });
  }
}
