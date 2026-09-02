const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const poles = [
    {
      titre: 'Développement Humain & Inclusion Sociale',
      description: "Garantir l'épanouissement, la santé et l'équité pour chaque citoyen de Thiès-Nord.",
      icone: 'fa-solid fa-users',
      numero: '01',
      statut: 'PUBLIE',
      objectifs: [
        'Éducation, formation de base et accompagnement pédagogique',
        'Action sociale, prévention santé et soutien aux personnes vulnérables',
        'Autonomisation économique et leadership des femmes',
        'Culture, sport et renforcement de la cohésion intergénérationnelle'
      ]
    },
    {
      titre: 'Économie, Emploi & Innovation Numérique',
      description: 'Transformer le potentiel de notre jeunesse et de notre territoire en opportunités réelles.',
      icone: 'fa-solid fa-rocket',
      numero: '02',
      statut: 'PUBLIE',
      objectifs: [
        "Accompagnement à l'entrepreneuriat et insertion professionnelle",
        "Formation aux métiers du numérique et de l'intelligence artificielle",
        'Digitalisation des initiatives et création de solutions locales',
        'Incubation de projets et mise en réseau des compétences'
      ]
    },
    {
      titre: 'Cadre de vie, Environnement & Sécurité',
      description: 'Bâtir un environnement propre, sûr, durable et apaisé pour tous nos quartiers.',
      icone: 'fa-solid fa-leaf',
      numero: '03',
      statut: 'PUBLIE',
      objectifs: [
        "Campagnes d'assainissement et gestion participative des déchets",
        'Protection des espaces publics, aménagement et reboisement',
        'Comités de vigilance citoyenne et éclairage public sécuritaire',
        'Prévention et dialogue pour assurer la tranquillité publique'
      ]
    }
  ];

  for (const p of poles) {
    const existing = await prisma.pole.findFirst({ where: { titre: p.titre } });
    if (!existing) {
      await prisma.pole.create({ data: p });
      console.log(`Created: ${p.titre}`);
    } else {
      console.log(`Already exists: ${p.titre}`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
