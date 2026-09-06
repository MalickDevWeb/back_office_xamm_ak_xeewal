import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding RBAC Modules and Super Admin...');

  // 1. Créer une organisation par défaut si elle n'existe pas
  const defaultOrgId = 'DEFAULT_ORG';
  let org = await prisma.organization.findUnique({ where: { id: defaultOrgId } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: defaultOrgId,
        name: 'Organisation Principale',
        slug: 'org-principale'
      }
    });
    console.log('✅ Organisation par défaut créée.');
  }

  // 2. Définir les modules systèmes de base
  const modulesData = [
    {
      name: 'Dashboard',
      slug: 'dashboard',
      description: 'Vue globale et métriques',
      icon: 'fa-chart-pie',
      isSystem: true,
      permissions: ['dashboard.read']
    },
    {
      name: 'Membres',
      slug: 'members',
      description: 'Gestion des adhérents',
      icon: 'fa-users',
      isSystem: true,
      permissions: ['members.read', 'members.create', 'members.update', 'members.delete']
    },
    {
      name: 'Finance',
      slug: 'finance',
      description: 'Gestion financière (Cotisations, Dépenses)',
      icon: 'fa-sack-dollar',
      isSystem: false,
      permissions: [
        'finance.dashboard.read',
        'finance.contributions.read',
        'finance.contributions.create',
        'finance.contributions.update',
        'finance.contributions.delete',
        'finance.contributions.confirm',
        'finance.expenses.read',
        'finance.expenses.create',
        'finance.expenses.update',
        'finance.expenses.approve',
        'finance.expenses.pay',
        'finance.reports.read',
        'finance.reports.export'
      ]
    },
    {
      name: 'Paramètres',
      slug: 'settings',
      description: 'Paramètres du système et RBAC',
      icon: 'fa-gear',
      isSystem: true,
      permissions: ['settings.read', 'settings.update', 'rbac.manage']
    },
    {
      name: 'Groupes',
      slug: 'groups',
      description: 'Gestion des groupes et segments',
      icon: 'fa-users-rectangle',
      isSystem: false,
      permissions: ['groups.read', 'groups.create', 'groups.update', 'groups.delete', 'groups.assign', 'groups.remove']
    },
    {
      name: 'Activités',
      slug: 'activities',
      description: 'Gestion des activités',
      icon: 'fa-person-running',
      isSystem: false,
      permissions: ['activities.read', 'activities.create', 'activities.update', 'activities.delete', 'activities.publish', 'activities.assign']
    },
    {
      name: 'Événements',
      slug: 'events',
      description: 'Gestion des événements',
      icon: 'fa-calendar',
      isSystem: false,
      permissions: ['events.read', 'events.create', 'events.update', 'events.delete', 'events.publish', 'events.assign']
    },
    {
      name: 'Pôles',
      slug: 'poles',
      description: 'Gestion des pôles et directions',
      icon: 'fa-sitemap',
      isSystem: false,
      permissions: ['poles.read', 'poles.create', 'poles.update', 'poles.delete', 'poles.assign', 'poles.remove']
    },
    {
      name: 'Contenus',
      slug: 'content',
      description: 'Gestion éditoriale',
      icon: 'fa-newspaper',
      isSystem: false,
      permissions: ['content.read', 'content.create', 'content.update', 'content.delete', 'content.publish']
    }
  ];

  // 3. Insérer les modules et permissions
  for (const mod of modulesData) {
    let moduleRecord = await prisma.module.findUnique({ where: { slug: mod.slug } });
    if (!moduleRecord) {
      moduleRecord = await prisma.module.create({
        data: {
          name: mod.name,
          slug: mod.slug,
          description: mod.description,
          icon: mod.icon,
          isSystem: mod.isSystem
        }
      });
      console.log(`✅ Module ${mod.name} créé.`);
    }

    // Activer le module pour l'organisation
    await prisma.organizationModule.upsert({
      where: {
        organizationId_moduleId: {
          organizationId: defaultOrgId,
          moduleId: moduleRecord.id
        }
      },
      update: { enabled: true, enabledAt: new Date() },
      create: {
        organizationId: defaultOrgId,
        moduleId: moduleRecord.id,
        enabled: true,
        enabledAt: new Date()
      }
    });

    // Créer les permissions associées
    for (const permSlug of mod.permissions) {
      await prisma.permission.upsert({
        where: { slug: permSlug },
        update: {},
        create: {
          slug: permSlug,
          moduleId: moduleRecord.id,
          description: `Permission ${permSlug}`
        }
      });
    }
  }

  // 4. Créer le rôle Super Admin
  const superAdminRole = await prisma.role.upsert({
    where: {
      organizationId_name: {
        organizationId: defaultOrgId,
        name: 'Super Admin'
      }
    },
    update: {},
    create: {
      organizationId: defaultOrgId,
      name: 'Super Admin',
      description: 'Accès total au système',
      isSystem: true
    }
  });
  console.log('✅ Rôle Super Admin créé.');

  // Optionnel : lier le premier AdminUser au rôle Super Admin (à faire manuellement ou si un admin existe)
  const firstAdmin = await prisma.adminUser.findFirst();
  if (firstAdmin) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: firstAdmin.id,
          roleId: superAdminRole.id
        }
      },
      update: {},
      create: {
        userId: firstAdmin.id,
        roleId: superAdminRole.id
      }
    });
    console.log(`✅ Rôle Super Admin assigné à ${firstAdmin.email}`);
  }

  console.log('🎉 Seed RBAC terminé avec succès !');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
