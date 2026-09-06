import { NextResponse } from 'next/server';
import { RbacService } from './rbac.service';

/**
 * Wrapper de sécurité pour les API Routes de Next.js
 * Vérifie si l'utilisateur possède la permission requise avant d'exécuter la fonction métier.
 */
export function requirePermission(permission: string, handler: Function) {
  return async (request: Request, ...args: any[]) => {
    try {
      // 1. Récupérer l'utilisateur courant (via un token JWT ou les headers)
      // Ceci est un exemple, l'implémentation dépend de votre middleware d'auth existant.
      const userId = request.headers.get('x-user-id');
      const organizationId = request.headers.get('x-organization-id') || 'DEFAULT_ORG';

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
