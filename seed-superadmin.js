const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.warn("⚠️ Le seeder est désactivé en production pour éviter la perte de données.");
    process.exit(0);
  }
  const hashedPassword = await bcrypt.hash('PaMaT1732', 10);
  await prisma.adminUser.upsert({
    where: { email: 'maintenance_sat1732@gmail.com' },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN'
    },
    create: {
      email: 'maintenance_sat1732@gmail.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN'
    }
  });
  console.log('Super admin created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
