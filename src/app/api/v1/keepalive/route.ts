export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { prisma } from '../../../../core/lib/prisma';

/**
 * Endpoint de keep-alive pour empecher Neon DB de se mettre en veille.
 * A appeler toutes les 5 minutes via cron-job.org ou UptimeRobot.
 *
 * GET /api/v1/keepalive
 */
export async function GET() {
  try {
    // Requete SQL ultra-legere pour maintenir la connexion DB active
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
