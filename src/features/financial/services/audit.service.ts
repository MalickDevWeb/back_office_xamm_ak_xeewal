import { prisma } from '@/core/lib/prisma';
import { NextRequest } from 'next/server';
import { resolveAdminActorFromRequest, splitFullName } from '@/core/lib/auth-actor';

export interface LogAuditParams {
  organizationId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorPrenom?: string | null;
  actorNom?: string | null;
  actorEmail?: string | null;
  actorPhone?: string | null;
  actorProfile?: string | null;
  actorRole?: string | null;
  req?: NextRequest | null;
  action: string;
  category?: 'FINANCE' | 'SECURITY' | 'MEMBERS' | 'SYSTEM' | string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO' | string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
}

export class AuditService {
  /**
   * Détermine intelligemment la catégorie d'une action
   */
  private static inferCategory(action: string, entityType: string): string {
    const act = action.toUpperCase();
    const ent = entityType.toUpperCase();

    if (
      act.startsWith('EXPENSE') ||
      act.startsWith('PAYMENT') ||
      act.startsWith('PROVIDER') ||
      act.startsWith('CONTRIBUTION') ||
      ent.includes('EXPENSE') ||
      ent.includes('PAYMENT')
    ) {
      return 'FINANCE';
    }

    if (
      act.startsWith('PROFILE') ||
      act.startsWith('USER') ||
      act.startsWith('AUTH') ||
      ent.includes('PROFILE') ||
      ent.includes('ADMINUSER')
    ) {
      return 'SECURITY';
    }

    if (act.startsWith('ADHERENT') || act.includes('BULK_DELETE') || ent.includes('ADHERENT')) {
      return 'MEMBERS';
    }

    return 'SYSTEM';
  }

  /**
   * Détermine automatiquement le niveau de dangerosité / sévérité
   */
  private static inferSeverity(action: string): string {
    const act = action.toUpperCase();

    // Actions CRITIQUES (impact financier direct, perte de données massive, modif clés API de paiement)
    if (
      act === 'EXPENSE_APPROVED' ||
      act === 'EXPENSE_DISBURSED' ||
      act === 'PROVIDER_SECRET_KEY_ROTATED' ||
      act === 'PROVIDER_CONFIG_DEACTIVATED' ||
      act === 'BULK_DELETE_ALL' ||
      act === 'BULK_DELETE_ADHERENTS' ||
      act === 'DELETE_ALL_MEMBERS' ||
      act === 'DELETE_ALL_CONTRIBUTIONS' ||
      act === 'PROFILE_PERMISSIONS_CHANGED' ||
      act === 'USER_DELETED'
    ) {
      return 'CRITICAL';
    }

    // Actions à risque ÉLEVÉ (validation manuelle de fonds, création/suppression de gestionnaires, etc.)
    if (
      act === 'PAYMENT_MANUAL_VALIDATED' ||
      act === 'PAYMENT_CONFIRMED' ||
      act === 'PAYMENT_REJECTED' ||
      act === 'EXPENSE_REJECTED' ||
      act === 'PROFILE_DELETED' ||
      act === 'PROVIDER_CONFIG_UPDATED' ||
      act === 'PROVIDER_CONFIG_CREATED' ||
      act === 'BULK_DELETE_CONTRIBUTIONS' ||
      act === 'USER_UPDATED'
    ) {
      return 'HIGH';
    }

    // Actions MOYENNES (modifications d'état, suppression simple)
    if (
      act === 'ADHERENT_DELETED' ||
      act === 'SETTINGS_UPDATED' ||
      act === 'EXPENSE_CREATED' ||
      act === 'EXPENSE_SUBMITTED'
    ) {
      return 'MEDIUM';
    }

    return 'INFO';
  }

  /**
   * Enregistre une action sensible dans le journal d'audit de manière asynchrone
   * avec TOUTES les informations d'identité du gestionnaire (Prénom, Nom, Téléphone, Profil, Email, Rôle)
   * SAUF les simples adhérents qui ne doivent pas polluer l'audit de gestion.
   */
  static async log(params: LogAuditParams) {
    try {
      // 1. Si l'acteur est identifié comme un simple adhérent sans aucun droit admin,
      // nous ne polluons pas le journal des actions administratives dangereuses.
      if (params.actorId && params.actorId !== 'ADMIN') {
        const isSimpleAdherent = await prisma.adherent.findUnique({
          where: { id: params.actorId },
          select: { id: true },
        });
        if (isSimpleAdherent) {
          const isAdminAlso = await prisma.adminUser.findUnique({
            where: { id: params.actorId },
            select: { id: true },
          });
          if (!isAdminAlso) {
            // C'est un adhérent simple : exclusion conformément à la consigne utilisateur
            return null;
          }
        }
      }

      const category = params.category || this.inferCategory(params.action, params.entityType);
      const severity = params.severity || this.inferSeverity(params.action);

      // 2. Résolution complète de l'administrateur / gestionnaire (Prénom, Nom, Email, Téléphone, Profil)
      const actorInfo = await resolveAdminActorFromRequest(params.req, params.actorId);

      let actorName = params.actorName || actorInfo.actorName;
      let actorPrenom = params.actorPrenom || actorInfo.actorPrenom;
      let actorNom = params.actorNom || actorInfo.actorNom;
      let actorEmail = params.actorEmail || actorInfo.actorEmail;
      let actorPhone = params.actorPhone || actorInfo.actorPhone;
      let actorProfile = params.actorProfile || actorInfo.actorProfile;
      let actorRole = params.actorRole || actorInfo.actorRole;

      // Si le nom était fourni manuellement sans prénom/nom séparés
      if (actorName && (!actorPrenom || !actorNom)) {
        const parts = splitFullName(actorName);
        actorPrenom = actorPrenom || parts.prenom;
        actorNom = actorNom || parts.nom;
      }

      // Filtrer les métadonnées pour exclure strictement tout secret ou token
      const safeMetadata = params.metadata ? this.sanitizeMetadata(params.metadata) : undefined;

      return await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId || null,
          actorId: actorInfo.actorId || params.actorId || null,
          actorName: actorName || 'Super Administrateur',
          actorPrenom: actorPrenom || 'Super',
          actorNom: actorNom || 'Administrateur',
          actorEmail: actorEmail || 'admin@gmail.com',
          actorPhone: actorPhone || null,
          actorProfile: actorProfile || 'Super Administrateur',
          actorRole: actorRole || 'ADMIN',
          action: params.action,
          category,
          severity,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: safeMetadata,
          ipAddress: params.ipAddress || (params.req ? (params.req.headers.get('x-forwarded-for') || params.req.headers.get('x-real-ip')) : null),
        },
      });
    } catch (err: any) {
      console.error("Erreur d'enregistrement dans AuditLog:", err?.message);
      return null;
    }
  }

  /**
   * Nettoie les clés suspectes (secret, key, password, token, credential, etc.)
   */
  private static sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    const sensitiveKeys = ['secret', 'password', 'token', 'key', 'credential', 'auth', 'private'];

    for (const [k, v] of Object.entries(metadata)) {
      const lower = k.toLowerCase();
      if (sensitiveKeys.some((sk) => lower.includes(sk))) {
        clean[k] = '[MASKED_SECRET]';
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        clean[k] = this.sanitizeMetadata(v);
      } else {
        clean[k] = v;
      }
    }

    return clean;
  }
}
