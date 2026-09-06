export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';
import { getCorsHeaders } from '@/core/lib/cors';
import { AuditService } from '@/features/finance/services/audit.service';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(req) });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const skip = (page - 1) * limit;

    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (severity && severity !== 'ALL') {
      where.severity = severity;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { actorName: { contains: q, mode: 'insensitive' } },
        { actorPrenom: { contains: q, mode: 'insensitive' } },
        { actorNom: { contains: q, mode: 'insensitive' } },
        { actorEmail: { contains: q, mode: 'insensitive' } },
        { actorProfile: { contains: q, mode: 'insensitive' } },
        { actorPhone: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Récupérer les données paginées et les statistiques en parallèle
    const [total, auditLogs, criticalCount, highCount, financeCount] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          organization: {
            select: { name: true }
          }
        }
      }),
      prisma.auditLog.count({ where: { severity: 'CRITICAL' } }),
      prisma.auditLog.count({ where: { severity: 'HIGH' } }),
      prisma.auditLog.count({ where: { category: 'FINANCE' } }),
    ]);

    return NextResponse.json({
      success: true,
      data: auditLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total,
        criticalCount,
        highCount,
        financeCount,
      }
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des logs d\'audit:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur interne du serveur', message: error?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';

    const log = await AuditService.log({
      organizationId: body.organizationId,
      actorId: body.actorId,
      actorName: body.actorName,
      actorEmail: body.actorEmail,
      action: body.action,
      category: body.category,
      severity: body.severity,
      entityType: body.entityType || 'CustomAction',
      entityId: body.entityId || 'system',
      metadata: body.metadata,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      data: log
    }, { status: 201, headers: corsHeaders });
  } catch (error: any) {
    console.error('Erreur lors de la création manuelle d\'un log d\'audit:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur interne du serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}
