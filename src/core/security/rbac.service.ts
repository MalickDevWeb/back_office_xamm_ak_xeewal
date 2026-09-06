import { prisma } from '@/core/lib/prisma';

export class RbacService {
  /**
   * Vérifie si un utilisateur (AdminUser) possède la permission demandée.
   * L'organisation est déduite (pour l'instant, on suppose une organisation unique ou passée en paramètre).
   * 
   * @param userId L'ID de l'AdminUser
   * @param permissionSlug Le slug de la permission (ex: "finance.expenses.read")
   * @param organizationId (Optionnel) ID de l'organisation
   */
  static async can(userId: string, permissionSlug: string, organizationId: string = 'DEFAULT_ORG'): Promise<boolean> {
    try {
      // 0. Cas spécial : vérifier si l'utilisateur a un rôle "Super Admin"
      const isSuperAdmin = await prisma.userRole.count({
        where: {
          userId,
          role: {
            isSystem: true,
            name: 'Super Admin'
          }
        }
      });

      if (isSuperAdmin > 0) {
        return true;
      }

      // 1. On cherche la permission en base
      const permission = await prisma.permission.findUnique({
        where: { slug: permissionSlug },
        include: { module: true }
      });

      if (!permission) {
        console.warn(`[RBAC] Permission '${permissionSlug}' does not exist.`);
        return false;
      }

      const moduleId = permission.moduleId;

      // 2. Vérifier si le module parent est activé pour l'organisation
      const orgModule = await prisma.organizationModule.findUnique({
        where: {
          organizationId_moduleId: {
            organizationId,
            moduleId
          }
        }
      });

      // Si le module n'est pas activé, accès refusé même s'il a le rôle
      if (!orgModule || !orgModule.enabled) {
        return false;
      }

      // 3. Vérifier si l'utilisateur possède cette permission via ses rôles
      // On cherche les rôles de l'utilisateur qui ont cette permission
      const userRolesCount = await prisma.userRole.count({
        where: {
          userId,
          role: {
            rolePermissions: {
              some: {
                permissionId: permission.id
              }
            }
          }
        }
      });

      // Si count > 0, l'utilisateur a au moins un rôle avec cette permission
      if (userRolesCount > 0) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('[RBAC] Error checking permission:', error);
      return false;
    }
  }

  /**
   * Retourne toutes les permissions d'un utilisateur sous forme de tableau de strings
   * (Utile pour envoyer au Frontend lors du login)
   */
  static async getUserPermissions(userId: string, organizationId: string = 'DEFAULT_ORG'): Promise<string[]> {
    // Cas spécial: Si Super Admin, il a tout. 
    // Pour simplifier, on peut retourner '*' ou lire toutes les permissions des modules activés.
    const isSuperAdmin = await prisma.userRole.count({
      where: {
        userId,
        role: { isSystem: true, name: 'Super Admin' }
      }
    });

    if (isSuperAdmin > 0) {
      return ['*'];
    }

    // Récupérer les rôles de l'utilisateur
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  include: {
                    module: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const activePermissions = new Set<string>();

    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        // Optionnel : vérifier ici aussi si le module est activé pour l'orga
        activePermissions.add(rp.permission.slug);
      }
    }

    return Array.from(activePermissions);
  }
}
