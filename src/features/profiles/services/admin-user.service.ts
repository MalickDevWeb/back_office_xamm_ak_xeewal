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
    return prisma.adminUser.findMany({
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
        profile: {
          select: {
            id: true,
            name: true,
            permissions: true,
            isSystem: true,
          },
        },
      },
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
        profile: {
          select: {
            id: true,
            name: true,
            permissions: true,
            isSystem: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    return user;
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

    // Vérifier l'existence du profil s'il est spécifié
    if (data.profileId) {
      const profile = await prisma.profile.findUnique({ where: { id: data.profileId } });
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
        profileId: data.profileId || null,
        role: 'ADMIN',
        actif: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        profileId: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });

    return user;
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
        const profile = await prisma.profile.findUnique({ where: { id: data.profileId } });
        if (!profile) throw new Error('Profil introuvable');
        updateData.profileId = data.profileId;
      } else {
        updateData.profileId = null;
      }
    }

    if (data.actif !== undefined) {
      updateData.actif = Boolean(data.actif);
    }

    return prisma.adminUser.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        profileId: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            name: true,
            permissions: true,
          },
        },
      },
    });
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
      include: { profile: true },
    });

    if (!user) throw new Error('Utilisateur introuvable');

    // Vérifier qu'on ne supprime pas le tout dernier super administrateur
    if (user.profile?.isSystem || user.role === 'SUPER_ADMIN') {
      const remainingSuperAdmins = await prisma.adminUser.count({
        where: {
          id: { not: id },
          actif: true,
          OR: [
            { role: 'SUPER_ADMIN' },
            { profile: { isSystem: true } },
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
