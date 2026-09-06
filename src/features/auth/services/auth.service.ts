import { prisma } from '../../../core/lib/prisma';
import bcrypt from 'bcryptjs';
import { config as envConfig } from '@/core/lib/env';
import { sign, SignOptions } from 'jsonwebtoken';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.adminUser.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user) {
      throw new Error('Identifiants invalides');
    }

    if (!user.actif) {
      throw new Error('Ce compte a été désactivé. Veuillez contacter un administrateur.');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Identifiants invalides');
    }

    // Calcul des permissions effectives
    let permissions: string[] = [];
    if (user.role === 'SUPER_ADMIN' || (user.role === 'ADMIN' && (!user.profile || user.profile.isSystem))) {
      permissions = ['*'];
    } else if (user.profile && Array.isArray(user.profile.permissions)) {
      permissions = user.profile.permissions;
    }

    const secret = envConfig.jwtSecret;
    const token = sign(
      {
        id: user.id,
        role: user.role,
        profileId: user.profileId,
        permissions,
      },
      secret,
      { expiresIn: envConfig.jwtExpiresIn } as SignOptions
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        telephone: user.telephone,
        role: user.role,
        actif: user.actif,
        profileId: user.profileId,
        profile: user.profile
          ? {
              id: user.profile.id,
              name: user.profile.name,
              isSystem: user.profile.isSystem,
              permissions: user.profile.permissions,
            }
          : null,
        permissions,
      },
      token,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new Error('Mot de passe actuel incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return {
      success: true,
      message: 'Mot de passe mis à jour avec succès'
    };
  }
}

export const authService = new AuthService();
