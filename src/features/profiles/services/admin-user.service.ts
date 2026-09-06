import { prisma } from '@/core/lib/prisma';
import bcrypt from 'bcryptjs';

export interface CreateAdminUserDTO {
  name: string;
  email: string;
  password: string;
  telephone?: string;
  profileId?: string;
}

export interface UpdateAdminUserDTO {
  name?: string;
  email?: string;
  password?: string;
  telephone?: string;
  profileId?: string;
  actif?: boolean;
}

export class AdminUserService {
  /**
   * Récupère tous les utilisateurs membres du back-office avec leur profil
   */
  static async getAllUsers() {
    const users = await prisma.adminUser.findMany({
      where: {
        // Exclure les super admins et les profils système (maintenance)
        role: { not: 'SUPER_ADMIN' },
        userRoles: {
          none: {
            role: { isSystem: true }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        profileId: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
      },
    });

    return users.map(user => {
      const primaryRole = user.userRoles[0]?.role;
      return {
        ...user,
        profileId: primaryRole?.id || null,
        profile: primaryRole ? {
          id: primaryRole.id,
          name: primaryRole.name,
          isSystem: primaryRole.isSystem,
          permissions: primaryRole.rolePermissions.map(rp => rp.permission.slug),
        } : null,
      };
    });
  }

  /**
   * Récupère un utilisateur par son ID
   */
  static async getUserById(id: string) {
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        profileId: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
      },
    });

    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const primaryRole = user.userRoles[0]?.role;
    return {
      ...user,
      profileId: primaryRole?.id || null,
      profile: primaryRole ? {
        id: primaryRole.id,
        name: primaryRole.name,
        isSystem: primaryRole.isSystem,
        permissions: primaryRole.rolePermissions.map(rp => rp.permission.slug),
      } : null,
    };
  }

  /**
   * Crée un nouvel utilisateur membre staff
   */
  static async createUser(data: CreateAdminUserDTO) {
    const name = data.name.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password.trim();

    if (!name || !email || !password) {
      throw new Error('Le nom, l\'email et le mot de passe sont obligatoires');
    }

    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }

    const existing = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existing) {
      throw new Error(`Un compte avec l'adresse "${email}" existe déjà`);
    }

    if (data.profileId) {
      const profile = await prisma.role.findUnique({ where: { id: data.profileId } });
      if (!profile) {
        throw new Error('Le profil sélectionné est introuvable');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.adminUser.create({
      data: {
        name,
        email,
        password: hashedPassword,
        telephone: data.telephone?.trim() || null,
        role: 'ADMIN',
        actif: true,
        userRoles: data.profileId ? {
          create: {
            roleId: data.profileId
          }
        } : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      },
    });

    const primaryRole = user.userRoles[0]?.role;
    return {
      ...user,
      profileId: primaryRole?.id || null,
      profile: primaryRole ? {
        id: primaryRole.id,
        name: primaryRole.name,
        permissions: primaryRole.rolePermissions.map(rp => rp.permission.slug),
        isSystem: primaryRole.isSystem,
      } : null,
    };
  }

  /**
   * Modifie un utilisateur existant
   */
  static async updateUser(id: string, data: UpdateAdminUserDTO) {
    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name) throw new Error('Le nom ne peut pas être vide');
      updateData.name = name;
    }

    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      if (!email) throw new Error('L\'email ne peut pas être vide');

      if (email !== user.email) {
        const existing = await prisma.adminUser.findUnique({ where: { email } });
        if (existing && existing.id !== id) {
          throw new Error(`L'adresse email "${email}" est déjà utilisée`);
        }
        updateData.email = email;
      }
    }

    if (data.telephone !== undefined) {
      updateData.telephone = data.telephone?.trim() || null;
    }

    if (data.password !== undefined && data.password.trim() !== '') {
      const password = data.password.trim();
      if (password.length < 6) {
        throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (data.profileId !== undefined) {
      if (data.profileId) {
        const profile = await prisma.role.findUnique({ where: { id: data.profileId } });
        if (!profile) throw new Error('Profil introuvable');

        // Mettre à jour les userRoles
        await prisma.userRole.deleteMany({ where: { userId: id } });
        await prisma.userRole.create({
          data: { userId: id, roleId: data.profileId }
        });
      } else {
        await prisma.userRole.deleteMany({ where: { userId: id } });
      }
    }

    if (data.actif !== undefined) {
      updateData.actif = Boolean(data.actif);
    }

    const updatedUser = await prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      },
    });

    const primaryRole = updatedUser.userRoles[0]?.role;
    return {
      ...updatedUser,
      profileId: primaryRole?.id || null,
      profile: primaryRole ? {
        id: primaryRole.id,
        name: primaryRole.name,
        permissions: primaryRole.rolePermissions.map(rp => rp.permission.slug),
        isSystem: primaryRole.isSystem,
      } : null,
    };
  }

  /**
   * Bascule le statut actif/inactif
   */
  static async toggleActive(id: string) {
    const user = await prisma.adminUser.findUnique({ where: { id } });
    if (!user) throw new Error('Utilisateur introuvable');

    return prisma.adminUser.update({
      where: { id },
      data: { actif: !user.actif },
      select: {
        id: true,
        name: true,
        email: true,
        actif: true,
      },
    });
  }

  /**
   * Supprime un utilisateur
   */
  static async deleteUser(id: string, currentUserId?: string) {
    if (currentUserId && id === currentUserId) {
      throw new Error('Vous ne pouvez pas supprimer votre propre compte');
    }

    const user = await prisma.adminUser.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) throw new Error('Utilisateur introuvable');

    // Vérifier qu'on ne supprime pas le tout dernier super administrateur
    const isSuperAdminRole = user.userRoles.some(ur => ur.role.isSystem) || user.role === 'SUPER_ADMIN';
    if (isSuperAdminRole) {
      const remainingSuperAdmins = await prisma.adminUser.count({
        where: {
          id: { not: id },
          actif: true,
          OR: [
            { role: 'SUPER_ADMIN' },
            { userRoles: { some: { role: { isSystem: true } } } },
          ],
        },
      });

      if (remainingSuperAdmins === 0) {
        throw new Error('Impossible de supprimer le dernier Super Administrateur de la plateforme');
      }
    }

    return prisma.adminUser.delete({ where: { id } });
  }
}
