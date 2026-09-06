import { prisma } from '../../../core/lib/prisma';
import bcrypt from 'bcryptjs';
import { config as envConfig } from '@/core/lib/env';
import { sign, verify, SignOptions } from 'jsonwebtoken';
import { RedisService } from '@/core/services/redis.service';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.adminUser.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      },
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
    const primaryRole = user.userRoles[0]?.role;

    if (user.role === 'SUPER_ADMIN' || (user.role === 'ADMIN' && primaryRole?.isSystem)) {
      permissions = ['*'];
    } else if (primaryRole && Array.isArray(primaryRole.rolePermissions)) {
      permissions = primaryRole.rolePermissions.map(rp => rp.permission.slug);
    }

    const secret = envConfig.jwtSecret;
    const token = sign(
      {
        id: user.id,
        role: user.role,
        profileId: primaryRole?.id || null,
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
        profileId: primaryRole?.id || null,
        profile: primaryRole
          ? {
              id: primaryRole.id,
              name: primaryRole.name,
              isSystem: primaryRole.isSystem,
              permissions: primaryRole.rolePermissions.map(rp => rp.permission.slug),
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

  async logout(token: string) {
    try {
      const secret = envConfig.jwtSecret;
      const decoded = verify(token, secret) as any;
      
      if (decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;
        
        if (ttl > 0) {
          await RedisService.set(`blacklist:token:${token}`, true, ttl);
        }
      }
    } catch (error) {
      // Ignorer si le token est déjà expiré ou invalide
    }
  }
}

export const authService = new AuthService();
