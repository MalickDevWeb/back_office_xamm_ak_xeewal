import { NextResponse } from 'next/server';
import { prisma } from '@/core/lib/prisma';
import { RedisService } from '@/core/services/redis.service';

const CACHE_TTL = 3600; // 1 heure

// Slugs réservés à l'administration technique — jamais exposables via l'UI
const EXCLUDED_PERMISSIONS = new Set(['rbac.manage']);

// Labels lisibles en français pour chaque permission
const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  // Dashboard
  'dashboard.read':                 { label: 'Voir le tableau de bord',          description: 'Accès en lecture au tableau de bord principal' },
  // Membres
  'members.read':                   { label: 'Consulter les adhérents',           description: 'Voir la liste et les fiches des adhérents' },
  'members.create':                 { label: 'Ajouter un adhérent',               description: 'Créer un nouveau dossier adhérent' },
  'members.update':                 { label: 'Modifier un adhérent',              description: 'Modifier les informations d’un adhérent existant' },
  'members.delete':                 { label: 'Supprimer un adhérent',             description: 'Archiver ou supprimer définitivement un adhérent' },
  // Finance – tableau de bord
  'finance.dashboard.read':         { label: 'Voir le tableau de bord financier', description: 'Consulter les indicateurs et statistiques financières' },
  // Finance – cotisations
  'finance.contributions.read':     { label: 'Consulter les cotisations',         description: 'Voir la liste et le détail des cotisations' },
  'finance.contributions.create':   { label: 'Enregistrer une cotisation',        description: 'Saisir un nouveau paiement de cotisation' },
  'finance.contributions.update':   { label: 'Modifier une cotisation',           description: 'Corriger ou mettre à jour une cotisation existante' },
  'finance.contributions.delete':   { label: 'Supprimer une cotisation',          description: 'Retirer une cotisation de la base de données' },
  'finance.contributions.confirm':  { label: 'Valider une cotisation',            description: 'Confirmer le paiement et changer le statut en payé' },
  // Finance – dépenses
  'finance.expenses.read':          { label: 'Consulter les dépenses',            description: 'Voir la liste et le détail des dépenses' },
  'finance.expenses.create':        { label: 'Soumettre une dépense',             description: 'Créer une demande de dépense' },
  'finance.expenses.update':        { label: 'Modifier une dépense',             description: 'Corriger une demande de dépense' },
  'finance.expenses.approve':       { label: 'Approuver une dépense',            description: 'Valider ou rejeter une demande de dépense' },
  'finance.expenses.pay':           { label: 'Marquer une dépense comme payée',   description: 'Confirmer le décaissement effectif' },
  // Finance – rapports
  'finance.reports.read':           { label: 'Consulter les rapports financiers', description: 'Accéder aux bilans et états de compte' },
  'finance.reports.export':         { label: 'Exporter les rapports',             description: 'Télécharger les rapports en PDF ou Excel' },
  // Paramètres
  'settings.read':                  { label: 'Consulter les paramètres',          description: 'Voir la configuration générale de la plateforme' },
  'settings.update':                { label: 'Modifier les paramètres',           description: 'Changer la configuration générale (nom, logo, etc.)' },
  // Groupes
  'groups.read':                    { label: 'Consulter les groupes',             description: 'Voir la liste et les détails des groupes/segments' },
  'groups.create':                  { label: 'Créer un groupe',                   description: 'Créer de nouveaux groupes' },
  'groups.update':                  { label: 'Modifier un groupe',                description: 'Modifier la configuration ou les membres d’un groupe' },
  'groups.delete':                  { label: 'Supprimer un groupe',               description: 'Supprimer un groupe existant' },
  'groups.assign':                  { label: 'Affecter des membres',              description: 'Ajouter des membres dans un groupe' },
  'groups.remove':                  { label: 'Retirer des membres',               description: 'Retirer des membres d’un groupe' },
  // Activités
  'activities.read':                { label: 'Consulter les activités',           description: 'Voir la liste des activités' },
  'activities.create':              { label: 'Créer une activité',                description: 'Créer une nouvelle activité' },
  'activities.update':              { label: 'Modifier une activité',             description: 'Modifier une activité existante' },
  'activities.delete':              { label: 'Supprimer une activité',            description: 'Supprimer une activité' },
  'activities.publish':             { label: 'Publier/Dépublier',                 description: 'Gérer la visibilité de l’activité' },
  'activities.assign':              { label: 'Affecter des participants',         description: 'Gérer les participants de l’activité' },
  // Événements
  'events.read':                    { label: 'Consulter les événements',          description: 'Voir la liste des événements' },
  'events.create':                  { label: 'Créer un événement',                description: 'Créer un nouvel événement' },
  'events.update':                  { label: 'Modifier un événement',             description: 'Modifier un événement existant' },
  'events.delete':                  { label: 'Supprimer un événement',            description: 'Supprimer ou annuler un événement' },
  'events.publish':                 { label: 'Publier/Dépublier',                 description: 'Gérer la visibilité de l’événement' },
  'events.assign':                  { label: 'Gérer les participants',            description: 'Gérer les inscrits à l’événement' },
  // Pôles
  'poles.read':                     { label: 'Consulter les pôles',               description: 'Voir la liste des pôles et directions' },
  'poles.create':                   { label: 'Créer un pôle',                     description: 'Ajouter un nouveau pôle' },
  'poles.update':                   { label: 'Modifier un pôle',                  description: 'Modifier les informations d’un pôle' },
  'poles.delete':                   { label: 'Supprimer un pôle',                 description: 'Supprimer un pôle' },
  'poles.assign':                   { label: 'Affecter des membres',              description: 'Ajouter des membres dans un pôle' },
  'poles.remove':                   { label: 'Retirer des membres',               description: 'Retirer des membres d’un pôle' },
  // Contenus / Éditorial
  'content.read':                   { label: 'Consulter les contenus',            description: 'Voir les articles et publications' },
  'content.create':                 { label: 'Créer un contenu',                  description: 'Rédiger une nouvelle publication' },
  'content.update':                 { label: 'Modifier un contenu',               description: 'Modifier une publication existante' },
  'content.delete':                 { label: 'Supprimer un contenu',              description: 'Supprimer une publication' },
  'content.publish':                { label: 'Publier/Dépublier',                 description: 'Gérer la visibilité de la publication' },
};

// GET /api/v1/rbac/modules
// Liste tous les modules et sous-modules avec leur état d'activation pour l'organisation
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId') || 'DEFAULT_ORG';
    const cacheKey = `rbac:modules:${organizationId}`;

    // 1. Vérifier le cache Redis d'abord
    const cached = await RedisService.get<any[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, fromCache: true });
    }

    // 2. Cache MISS → interroger PostgreSQL
    const orgModules = await prisma.organizationModule.findMany({
      where: { organizationId, enabled: true },
      include: {
        module: {
          include: {
            permissions: true
          }
        }
      }
    });

    const flatPermissions: any[] = [];

    orgModules.forEach(om => {
      om.module.permissions.forEach(p => {
        // Exclure les permissions réservées à l'administration technique
        if (EXCLUDED_PERMISSIONS.has(p.slug)) return;

        const labels = PERMISSION_LABELS[p.slug];
        flatPermissions.push({
          id: p.slug,
          label: labels?.label ?? p.slug,
          description: labels?.description ?? '',
          icon: om.module.icon || 'fa-solid fa-cube',
          category: om.module.name
        });
      });
    });

    // 3. Mettre en cache le résultat pour 1 heure
    await RedisService.set(cacheKey, flatPermissions, CACHE_TTL);

    return NextResponse.json({ success: true, data: flatPermissions, fromCache: false });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/v1/rbac/modules
// Active ou désactive un module pour une organisation (et invalide le cache)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { moduleId, organizationId = 'DEFAULT_ORG', enabled } = body;

    if (!moduleId || enabled === undefined) {
      return NextResponse.json({ success: false, message: 'moduleId et enabled sont requis' }, { status: 400 });
    }

    const orgModule = await prisma.organizationModule.upsert({
      where: {
        organizationId_moduleId: {
          organizationId,
          moduleId
        }
      },
      update: {
        enabled,
        enabledAt: enabled ? new Date() : null
      },
      create: {
        organizationId,
        moduleId,
        enabled,
        enabledAt: enabled ? new Date() : null
      }
    });

    // Invalider le cache des modules pour cette organisation
    await RedisService.delete(`rbac:modules:${organizationId}`);

    return NextResponse.json({ success: true, data: orgModule });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
