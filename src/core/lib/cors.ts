import { NextRequest } from 'next/server';
import { config as envConfig } from '@/core/lib/env';

export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '*';
  const allowedOrigins = envConfig.corsOrigins ? envConfig.corsOrigins.split(',') : ['*'];
  const isAllowedOrigin = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Confirm, x-confirm',
  };
}
