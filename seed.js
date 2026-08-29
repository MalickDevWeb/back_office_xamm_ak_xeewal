const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  // Admin User
  const password = await bcrypt.hash('admin123', 10);
  await prisma.adminUser.upsert({
    where: { email: 'admin@gmail.com' },
    update: { password },
    create: {
      email: 'admin@gmail.com',
      password,
      name: 'Super Administrateur',
      role: 'ADMIN'
    }
  });
  console.log('Admin user seeded');

  // Home Page Editorial Content
  const homeContent = {
    presidentPhoto: 'assets/media_1787574641552.jpg',
    presidentName: 'Le Président',
    title: 'Ensemble, bâtissons <br/><span class="text-brand-greenLight">le Thiès-Nord de demain</span>',
    message: '<p>« Chères citoyennes, chers citoyens de Thiès-Nord,</p><p>Notre localité regorge de talents, de ressources et d\'une jeunesse dynamique. Le mouvement JÀMM AK XÉEWAL est votre outil. Il n\'est pas conçu pour faire des promesses, mais pour bâtir avec vous. Chaque idée que vous proposez, chaque problème que vous signalez, constitue la brique de notre futur programme.</p><p class="text-white font-medium">Agissons ensemble, dans la paix et pour la prospérité de tous. »</p>',
    stat1Value: '500+',
    stat1Label: 'Citoyens actifs',
    stat2Value: '15',
    stat2Label: 'Quartiers',
    stat3Value: '32',
    stat3Label: 'Actions réalisées'
  };

  await prisma.editorial.upsert({
    where: { page: 'home' },
    update: { content: JSON.stringify(homeContent) },
    create: { page: 'home', content: JSON.stringify(homeContent) }
  });
  console.log('Home editorial content seeded');

  // Mouvement Page Editorial Content
  const mouvementContent = {
    heroSubtitle: 'Découvrez l\'histoire, la vision et les valeurs fondamentales qui animent JÀMM AK XÉEWAL.',
    heroTitle: 'Agir ensemble pour l\'avenir de Thiès-Nord',
    heroParagraph: 'Le mouvement JÀMM AK XÉEWAL est né d\'un constat simple et d\'une volonté citoyenne profonde : rassembler les forces vives de notre localité autour d\'un idéal de Paix (Jàmm) et de Prospérité partagée (Xéewal).',
    heroSubParagraph: 'Loin des clivages politiques traditionnels, nous construisons une véritable plateforme d\'action communautaire. Notre démarche s\'articule autour de 3 piliers :',
    vision: 'Bâtir un Thiès-Nord prospère, solidaire et durable, où chaque citoyen est acteur du développement de son quartier et moteur du changement.',
    mission: 'Fédérer les énergies locales, écouter attentivement les populations et co-construire un programme d\'actions concrètes, inclusives et réalisables.',
    valeurs: 'Paix (Jàmm) & Prospérité (Xéewal)\nTransparence & Justice sociale\nEngagement citoyen absolu'
  };

  await prisma.editorial.upsert({
    where: { page: 'mouvement' },
    update: { content: JSON.stringify(mouvementContent) },
    create: { page: 'mouvement', content: JSON.stringify(mouvementContent) }
  });
  console.log('Mouvement editorial content seeded');

  // Axes Page Editorial Content
  const axesContent = {
    heroTitle: 'Nos 3 Pôles d\'Action',
    heroDesc: 'Le projet JÀMM AK XÉEWAL a fusionné ses initiatives autour de 3 grands pôles stratégiques. Découvrez notre vision unifiée pour Thiès-Nord.',
    poles: [
      {
        titre: 'Développement Humain & Inclusion Sociale',
        soustitre: 'Garantir l\'épanouissement, la santé et l\'équité pour chaque citoyen de Thiès-Nord.',
        actions: 'Éducation, formation de base et accompagnement pédagogique\nAction sociale, prévention santé et soutien aux personnes vulnérables\nAutonomisation économique et leadership des femmes\nCulture, sport et renforcement de la cohésion intergénérationnelle'
      },
      {
        titre: 'Économie, Emploi & Innovation Numérique',
        soustitre: 'Transformer le potentiel de notre jeunesse et de notre territoire en opportunités réelles.',
        actions: 'Accompagnement à l\'entrepreneuriat et insertion professionnelle\nFormation aux métiers du numérique et de l\'intelligence artificielle\nDigitalisation des initiatives et création de solutions locales\nIncubation de projets et mise en réseau des compétences'
      },
      {
        titre: 'Cadre de vie, Environnement & Sécurité',
        soustitre: 'Bâtir un environnement propre, sûr, durable et apaisé pour tous nos quartiers.',
        actions: 'Campagnes d\'assainissement et gestion participative des déchets\nProtection des espaces publics, aménagement et reboisement\nComités de vigilance citoyenne et éclairage public sécuritaire\nPrévention et dialogue pour assurer la tranquillité publique'
      }
    ]
  };

  await prisma.editorial.upsert({
    where: { page: 'axes' },
    update: { content: JSON.stringify(axesContent) },
    create: { page: 'axes', content: JSON.stringify(axesContent) }
  });
  console.log('Axes editorial content seeded');

  // Options dynamiques - Quartiers
  const quartiers = [
    { value: 'nguinth', label: 'Nguinth', ordre: 1 },
    { value: 'grand_thies', label: 'Grand Thiès', ordre: 2 },
    { value: 'keur_mame_el_hadj', label: 'Keur Mame El Hadj', ordre: 3 },
    { value: 'medina_fall', label: 'Médina Fall', ordre: 4 },
    { value: 'som', label: 'Som', ordre: 5 },
  ];

  for (const q of quartiers) {
    await prisma.option.upsert({
      where: { type_value: { type: 'quartier', value: q.value } },
      update: { label: q.label, ordre: q.ordre },
      create: { type: 'quartier', ...q }
    });
  }
  console.log('Quartiers seeded');

  // Options dynamiques - Axes
  const axes = [
    { value: 'education', label: 'Éducation et formation', ordre: 1 },
    { value: 'emploi', label: 'Emploi et entrepreneuriat', ordre: 2 },
    { value: 'jeunesse', label: 'Jeunesse, sport et culture', ordre: 3 },
    { value: 'environnement', label: 'Environnement et cadre de vie', ordre: 4 },
    { value: 'autre', label: 'Autre', ordre: 5 },
  ];

  for (const a of axes) {
    await prisma.option.upsert({
      where: { type_value: { type: 'axe', value: a.value } },
      update: { label: a.label, ordre: a.ordre },
      create: { type: 'axe', ...a }
    });
  }
  console.log('Axes seeded');

  // Options dynamiques - Pôles
  const poles = [
    { value: 'dev_humain', label: 'Développement Humain', ordre: 1 },
    { value: 'eco_innovation', label: 'Économie & Innovation', ordre: 2 },
    { value: 'environnement', label: 'Environnement', ordre: 3 },
  ];

  for (const p of poles) {
    await prisma.option.upsert({
      where: { type_value: { type: 'pole', value: p.value } },
      update: { label: p.label, ordre: p.ordre },
      create: { type: 'pole', ...p }
    });
  }
  console.log('Pôles seeded');

  // Options dynamiques - Catégories d'activités
  const categories = [
    { value: 'projet', label: 'Projet', ordre: 1 },
    { value: 'meeting', label: 'Réunion', ordre: 2 },
    { value: 'terrain', label: 'Terrain', ordre: 3 },
  ];

  for (const c of categories) {
    await prisma.option.upsert({
      where: { type_value: { type: 'categorie_activite', value: c.value } },
      update: { label: c.label, ordre: c.ordre },
      create: { type: 'categorie_activite', ...c }
    });
  }
  console.log('Catégories seeded');

  // Options dynamiques - Statuts besoins
  const statuts = [
    { value: 'EN_ATTENTE', label: 'En attente', ordre: 1 },
    { value: 'EN_COURS', label: 'En cours', ordre: 2 },
    { value: 'RESOLU', label: 'Résolu', ordre: 3 },
  ];

  for (const s of statuts) {
    await prisma.option.upsert({
      where: { type_value: { type: 'statut_besoin', value: s.value } },
      update: { label: s.label, ordre: s.ordre },
      create: { type: 'statut_besoin', ...s }
    });
  }
  console.log('Statuts seeded');

  // Options dynamiques - Urgences
  const urgences = [
    { value: 'HAUTE', label: 'Haute', ordre: 1 },
    { value: 'MOYENNE', label: 'Moyenne', ordre: 2 },
    { value: 'BASSE', label: 'Basse', ordre: 3 },
  ];

  for (const u of urgences) {
    await prisma.option.upsert({
      where: { type_value: { type: 'urgence', value: u.value } },
      update: { label: u.label, ordre: u.ordre },
      create: { type: 'urgence', ...u }
    });
  }
  console.log('Urgences seeded');
}

main().catch(console.error).finally(() => prisma.$disconnect());
