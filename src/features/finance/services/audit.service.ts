import { prisma } from '../../../core/lib/prisma';

interface AuditLogInput {
  organizationId?: string;
  actorId: string;
  actorName?: string;
  actorPrenom?: string;
  actorNom?: string;
  actorEmail?: string;
  actorProfile?: string;
  actorPhone?: string;
  action: string;
  category?: string;
  severity?: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export class AuditService {
  static async log(input: AuditLogInput) {
    return prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        actorName: input.actorName,
        actorPrenom: input.actorPrenom,
        actorNom: input.actorNom,
        actorEmail: input.actorEmail,
        actorProfile: input.actorProfile,
        actorPhone: input.actorPhone,
        action: input.action,
        category: input.category,
        severity: input.severity,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ? (input.metadata as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
        ipAddress: input.ipAddress,
      },
    });
  }
}
