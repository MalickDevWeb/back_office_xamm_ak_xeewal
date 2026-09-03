import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

/**
 * Endpoint de keep-alive pour empecher Neon DB de se mettre en veille.
 * A appeler toutes les 5 minutes via cron-job.org ou UptimeRobot.
 *
 * GET /api/v1/keepalive?crash=true → forcer une erreur Sentry (test uniquement)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('crash') === 'true') {
    throw new Error("Sentry Test Error - Crash via query param");
  }

  try {
    // Requete SQL ultra-legere pour maintainenir la connexion DB active
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({
      success: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
      db: Array.isArray(result) ? 'connected' : 'unknown',
    });
  } catch (error: any) {
    // Si la DB est down, on veut quand meme retourner 200 pour ne pas
    // que le monitoring externe considere l'app comme down
    return NextResponse.json({
      success: true,
      status: 'alive',
      timestamp: new Date().toISOString(),
      db: 'error',
      message: error.message,
    });
  }
}
