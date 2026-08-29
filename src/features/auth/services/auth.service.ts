import { prisma } from '../../../core/lib/prisma';
import bcrypt from 'bcrypt';
import { sign, SignOptions } from 'jsonwebtoken';

export class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Identifiants invalides');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Identifiants invalides');
    }

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
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
