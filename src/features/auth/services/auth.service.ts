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
}

export const authService = new AuthService();
