import { NextResponse } from 'next/server';
import { RbacService } from './rbac.service';

/**
 * Wrapper de sécurité pour les API Routes de Next.js
 * Vérifie si l'utilisateur possède la permission requise avant d'exécuter la fonction métier.
 */
export function requirePermission(permission: string, handler: Function) {
  return async (request: Request, ...args: any[]) => {
    try {
      let userId = request.headers.get('x-user-id');
      const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';

      if (!userId) {
        const authHeader = request.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.split(' ')[1];
            const { config: envConfig } = await import('@/core/lib/env');
            const secret = new TextEncoder().encode(envConfig.jwtSecret);
            const { jwtVerify } = await import('jose');
            const { payload } = await jwtVerify(token, secret);
            userId = (payload.id || payload.userId || payload.sub) as string;
          } catch (e) {
            console.error('[PermissionGuard] JWT Verification Error:', e);
          }
        }
      }

      if (!userId) {
        return NextResponse.json({ success: false, message: 'Non authentifié' }, { status: 401 });
      }

      // 2. Vérifier la permission
      const hasAccess = await RbacService.can(userId, permission, organizationId);
      
      if (!hasAccess) {
        return NextResponse.json({ success: false, message: `Accès refusé. Permission '${permission}' requise.` }, { status: 403 });
      }

      // 3. Exécuter le handler original
      return handler(request, ...args);
    } catch (error) {
      console.error('[PermissionGuard] Erreur interne:', error);
      return NextResponse.json({ success: false, message: 'Erreur de vérification des droits' }, { status: 500 });
    }
  };
}
