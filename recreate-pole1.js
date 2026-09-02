const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pole1 = {
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
  };

  const existing = await prisma.pole.findFirst({
    where: { titre: { contains: 'Développement Humain' } }
  });

  if (existing) {
    await prisma.pole.update({
      where: { id: existing.id },
      data: pole1
    });
    console.log("Pole 1 mis à jour avec succès !");
  } else {
    await prisma.pole.create({
      data: pole1
    });
    console.log("Pole 1 recréé avec succès !");
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
