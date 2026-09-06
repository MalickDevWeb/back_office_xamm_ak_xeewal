import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const newModules = [
  {
    name: 'Besoins',
    description: 'Gestion des besoins signalés par la population',
    icon: 'fa-solid fa-hand-holding-heart',
    permissions: [
      { slug: 'besoins.read', description: 'Consulter les besoins' },
      { slug: 'besoins.create', description: 'Créer un besoin' },
      { slug: 'besoins.update', description: 'Modifier un besoin' },
      { slug: 'besoins.delete', description: 'Supprimer un besoin' },
    ]
  },
  {
    name: 'Idées',
    description: 'Gestion des idées et suggestions',
    icon: 'fa-solid fa-lightbulb',
    permissions: [
      { slug: 'idees.read', description: 'Consulter les idées' },
      { slug: 'idees.create', description: 'Créer une idée' },
      { slug: 'idees.update', description: 'Modifier une idée' },
      { slug: 'idees.delete', description: 'Supprimer une idée' },
    ]
  },
  {
    name: 'Messages',
    description: 'Gestion des messages et correspondances',
    icon: 'fa-solid fa-envelope',
    permissions: [
      { slug: 'messages.read', description: 'Consulter les messages' },
      { slug: 'messages.create', description: 'Créer un message' },
      { slug: 'messages.update', description: 'Modifier un message' },
      { slug: 'messages.delete', description: 'Supprimer un message' },
    ]
  },
  {
    name: 'Sondages',
    description: 'Gestion des enquêtes et sondages',
    icon: 'fa-solid fa-square-poll-vertical',
    permissions: [
      { slug: 'sondages.read', description: 'Consulter les sondages' },
      { slug: 'sondages.create', description: 'Créer un sondage' },
      { slug: 'sondages.update', description: 'Modifier un sondage' },
      { slug: 'sondages.delete', description: 'Supprimer un sondage' },
    ]
  },
  {
    name: 'Comptes-rendus',
    description: 'Gestion des rapports et comptes-rendus',
    icon: 'fa-solid fa-file-lines',
    permissions: [
      { slug: 'comptes_rendus.read', description: 'Consulter les comptes-rendus' },
      { slug: 'comptes_rendus.create', description: 'Créer un compte-rendu' },
      { slug: 'comptes_rendus.update', description: 'Modifier un compte-rendu' },
      { slug: 'comptes_rendus.delete', description: 'Supprimer un compte-rendu' },
    ]
  },
  {
    name: 'Agents Terrain',
    description: 'Gestion des agents de terrain',
    icon: 'fa-solid fa-street-view',
    permissions: [
      { slug: 'agents_terrain.read', description: 'Consulter les agents terrain' },
      { slug: 'agents_terrain.create', description: 'Créer un agent terrain' },
      { slug: 'agents_terrain.update', description: 'Modifier un agent terrain' },
      { slug: 'agents_terrain.delete', description: 'Supprimer un agent terrain' },
    ]
  },
  {
    name: 'Notifications',
    description: 'Gestion des notifications push',
    icon: 'fa-solid fa-bell',
    permissions: [
      { slug: 'notifications.read', description: 'Consulter les notifications' },
      { slug: 'notifications.create', description: 'Créer une notification' },
      { slug: 'notifications.update', description: 'Modifier une notification' },
      { slug: 'notifications.delete', description: 'Supprimer une notification' },
    ]
  }
];

async function main() {
  console.log('Starting seed...');
  for (const modDef of newModules) {
    let mod = await prisma.module.findFirst({ where: { name: modDef.name } });
    if (!mod) {
      mod = await prisma.module.create({
        data: {
          name: modDef.name,
          slug: modDef.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-'),
          description: modDef.description,
          icon: modDef.icon,
        }
      });
      console.log(`Created module ${mod.name}`);
    } else {
      console.log(`Module ${mod.name} already exists`);
    }

    // Ensure it is linked to DEFAULT_ORG
    const orgMod = await prisma.organizationModule.findUnique({
      where: {
        organizationId_moduleId: {
          organizationId: 'DEFAULT_ORG',
          moduleId: mod.id,
        }
      }
    });
    if (!orgMod) {
      await prisma.organizationModule.create({
        data: {
          organizationId: 'DEFAULT_ORG',
          moduleId: mod.id,
          enabled: true,
          enabledAt: new Date(),
        }
      });
      console.log(`Linked module ${mod.name} to DEFAULT_ORG`);
    }

    // Create permissions
    for (const p of modDef.permissions) {
      const existingPerm = await prisma.permission.findUnique({ where: { slug: p.slug } });
      if (!existingPerm) {
        await prisma.permission.create({
          data: {
            slug: p.slug,
            description: p.description,
            moduleId: mod.id,
          }
        });
        console.log(`Created permission ${p.slug}`);
      }
    }
  }
  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
