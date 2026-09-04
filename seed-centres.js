const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const centres = [
  { nom: 'COMPLEXE SPORTIF DE MEDINA FALL', bureaux: 7 },
  { nom: 'DIASSAP', bureaux: 1 },
  { nom: 'DISPENSAIRE MUNICIPAL DIAKHAO', bureaux: 10 },
  { nom: 'ECOLE CHEIKH IBRA FALL', bureaux: 18 },
  { nom: 'ECOLE CHEIKH SOULEYMANE DIOUF', bureaux: 8 },
  { nom: 'ECOLE ELHADJ AMADOU BARRO NDIEGUENE', bureaux: 9 },
  { nom: 'ECOLE ELHADJ MOUNDIAYE THIAW', bureaux: 11 },
  { nom: 'ECOLE GABRIEL NDIONE', bureaux: 13 },
  { nom: 'ECOLE IDRISSA DIOP', bureaux: 2 },
  { nom: 'ECOLE KEUR ISSA SOW', bureaux: 4 },
  { nom: 'ECOLE KEUR MODOU NDIAYE', bureaux: 1 },
  { nom: 'ECOLE KEUR SAIB NDOYE', bureaux: 2 },
  { nom: 'ECOLE MEDINA FALL 2', bureaux: 4 },
  { nom: 'ECOLE PETIT THIALLY', bureaux: 4 },
  { nom: 'ECOLE PONIENE', bureaux: 1 },
  { nom: 'ECOLE SERIGNE ASSANE FALL', bureaux: 7 },
  { nom: 'ECOLE SERIGNE ISSA DEME', bureaux: 11 },
  { nom: 'ECOLE THIAPONG', bureaux: 1 },
  { nom: 'THIONAKH PEULH', bureaux: 2 }
];

async function main() {
  for (const centre of centres) {
    await prisma.centreVote.upsert({
      where: { nom: centre.nom },
      update: { bureaux: centre.bureaux },
      create: { nom: centre.nom, bureaux: centre.bureaux, zone: 'THIES NORD' }
    });
    console.log(`Upserted ${centre.nom}`);
  }
  console.log('Done seeding centres de vote');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
