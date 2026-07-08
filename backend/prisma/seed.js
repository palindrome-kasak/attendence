const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const factories = [
  {
    code: 'factory-1',
    name: 'Sunrise Textiles',
    admin: {
      email: 'admin@factory1.com',
      password: 'factory1123',
      name: 'Factory 1 Admin',
    },
    settings: {
      factoryName: 'Sunrise Textiles',
      shiftStart: '08:00',
      shiftEnd: '17:00',
      lateAfter: '08:15',
      minFaceConfidence: 65,
    },
  },
  {
    code: 'factory-2',
    name: 'Green Valley Manufacturing',
    admin: {
      email: 'admin@factory2.com',
      password: 'factory2123',
      name: 'Factory 2 Admin',
    },
    settings: {
      factoryName: 'Green Valley Manufacturing',
      shiftStart: '09:00',
      shiftEnd: '18:00',
      lateAfter: '09:15',
      minFaceConfidence: 65,
    },
  },
];

async function upsertFactory({ code, name, admin, settings }) {
  const factory = await prisma.factory.upsert({
    where: { code },
    update: { name },
    create: { code, name },
  });

  const hashedPassword = await bcrypt.hash(admin.password, 10);

  await prisma.admin.upsert({
    where: { email: admin.email },
    update: {
      password: hashedPassword,
      name: admin.name,
      factoryId: factory.id,
    },
    create: {
      email: admin.email,
      password: hashedPassword,
      name: admin.name,
      factoryId: factory.id,
    },
  });

  await prisma.settings.upsert({
    where: { factoryId: factory.id },
    update: settings,
    create: {
      factoryId: factory.id,
      ...settings,
    },
  });

  return factory;
}

async function main() {
  for (const factoryConfig of factories) {
    await upsertFactory(factoryConfig);
  }

  console.log('Seed complete — 2 factories ready:');
  console.log('  Factory 1: admin@factory1.com / factory1123 (Sunrise Textiles)');
  console.log('  Factory 2: admin@factory2.com / factory2123 (Green Valley Manufacturing)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
