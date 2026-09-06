import { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';
import { config as envConfig } from './env';
import { prisma } from './prisma';

export interface AdminActorInfo {
  actorId: string;
  actorName: string;
  actorPrenom: string;
  actorNom: string;
  actorEmail: string;
  actorPhone: string | null;
  actorProfile: string;
  actorRole: string;
  isStaff: boolean;
}

/**
 * Découpe intelligemment un nom complet en Prénom et Nom
 */
export function splitFullName(fullName: string): { prenom: string; nom: string } {
  if (!fullName || !fullName.trim()) {
    return { prenom: 'Admin', nom: 'JÀMM' };
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { prenom: parts[0], nom: parts[0] };
  }
  const nom = parts.pop()!;
  const prenom = parts.join(' ');
  return { prenom, nom };
}

/**
 * Extrait et résout l'administrateur / gestionnaire depuis la requête HTTP
 * (Bearer JWT, en-têtes ou fallback sur le compte administrateur actif)
 */
export async function resolveAdminActorFromRequest(
  req?: NextRequest | null,
  explicitActorId?: string | null
): Promise<AdminActorInfo> {
  let targetUserId: string | null = null;
  let targetUserEmail: string | null = null;

  // 1. Extraire depuis le token Bearer (si requête disponible)
  if (req) {
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verify(token, envConfig.jwtSecret) as any;
        if (decoded?.id) targetUserId = decoded.id;
        if (decoded?.email) targetUserEmail = decoded.email;
      }
    } catch {
      // Ignorer l'erreur JWT et poursuivre
    }
  }

  // 2. Si un actorId explicite est passé
  if (!targetUserId && explicitActorId) {
    if (explicitActorId.includes('@')) {
      targetUserEmail = explicitActorId;
    } else if (explicitActorId !== 'ADMIN') {
      targetUserId = explicitActorId;
    }
  }

  // 3. Recherche de l'utilisateur Admin en base
  let adminUser: any = null;
  try {
    if (targetUserId) {
      adminUser = await prisma.adminUser.findUnique({
        where: { id: targetUserId },
        include: { profile: true },
      });
    }

    if (!adminUser && targetUserEmail) {
      adminUser = await prisma.adminUser.findUnique({
        where: { email: targetUserEmail },
        include: { profile: true },
      });
    }

    // 4. Si non trouvé ou 'ADMIN', fallback sur le Super Administrateur principal
    if (!adminUser) {
      adminUser = await prisma.adminUser.findFirst({
        where: { actif: true },
        orderBy: { createdAt: 'asc' },
        include: { profile: true },
      });
    }
  } catch (err: any) {
    console.error('Erreur résolution AdminUser:', err?.message);
  }

  if (adminUser) {
    const { prenom, nom } = splitFullName(adminUser.name);
    return {
      actorId: adminUser.id,
      actorName: adminUser.name,
      actorPrenom: prenom,
      actorNom: nom,
      actorEmail: adminUser.email,
      actorPhone: adminUser.telephone || null,
      actorProfile: adminUser.profile?.name || (adminUser.role === 'SUPER_ADMIN' ? 'Super Administrateur' : 'Administrateur'),
      actorRole: adminUser.role,
      isStaff: true,
    };
  }

  // Fallback ultime sécurisé
  return {
    actorId: 'SUPER_ADMIN',
    actorName: 'Super Administrateur',
    actorPrenom: 'Super',
    actorNom: 'Administrateur',
    actorEmail: 'admin@gmail.com',
    actorPhone: null,
    actorProfile: 'Super Administrateur',
    actorRole: 'ADMIN',
    isStaff: true,
  };
}
