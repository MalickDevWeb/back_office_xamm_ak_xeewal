import { prisma } from '@/core/lib/prisma';

export interface CreateProfileDTO {
  name: string;
  description?: string;
  permissions: string[];
}

export interface UpdateProfileDTO {
  name?: string;
  description?: string;
  permissions?: string[];
}

export class ProfileService {
  /**
   * Récupère tous les profils avec le nombre d'utilisateurs rattachés
   */
  static async getAllProfiles() {
    return prisma.profile.findMany({
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  /**
   * Récupère un profil par son identifiant
   */
  static async getProfileById(id: string) {
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            telephone: true,
            actif: true,
          },
        },
      },
    });

    if (!profile) {
      throw new Error('Profil introuvable');
    }

    return profile;
  }

  /**
   * Crée un nouveau profil
   */
  static async createProfile(data: CreateProfileDTO) {
    const trimmedName = data.name.trim();
    if (!trimmedName) {
      throw new Error('Le nom du profil est obligatoire');
    }

    const existing = await prisma.profile.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      throw new Error(`Un profil nommé "${trimmedName}" existe déjà`);
    }

    return prisma.profile.create({
      data: {
        name: trimmedName,
        description: data.description?.trim() || null,
        permissions: data.permissions || [],
        isSystem: false,
      },
    });
  }

  /**
   * Modifie un profil existant
   */
  static async updateProfile(id: string, data: UpdateProfileDTO) {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) {
      throw new Error('Profil introuvable');
    }

    const updateData: any = {};

    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (!trimmedName) {
        throw new Error('Le nom du profil ne peut pas être vide');
      }

      if (trimmedName !== profile.name) {
        const existing = await prisma.profile.findUnique({
          where: { name: trimmedName },
        });
        if (existing && existing.id !== id) {
          throw new Error(`Un profil nommé "${trimmedName}" existe déjà`);
        }
        updateData.name = trimmedName;
      }
    }

    if (data.description !== undefined) {
      updateData.description = data.description?.trim() || null;
    }

    if (data.permissions !== undefined) {
      // Si c'est un profil système (Super Administrateur), on garantit qu'il conserve le wildcard '*'
      if (profile.isSystem && !data.permissions.includes('*')) {
        updateData.permissions = ['*', ...data.permissions];
      } else {
        updateData.permissions = data.permissions;
      }
    }

    return prisma.profile.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Supprime un profil
   */
  static async deleteProfile(id: string) {
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!profile) {
      throw new Error('Profil introuvable');
    }

    if (profile.isSystem) {
      throw new Error('Impossible de supprimer un profil système protégé');
    }

    if (profile._count.users > 0) {
      throw new Error(
        `Impossible de supprimer ce profil : il est actuellement assigné à ${profile._count.users} membre(s). Veuillez d'abord réassigner ces utilisateurs.`
      );
    }

    return prisma.profile.delete({ where: { id } });
  }
}
