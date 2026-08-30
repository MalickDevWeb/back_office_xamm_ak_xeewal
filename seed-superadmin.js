const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
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
