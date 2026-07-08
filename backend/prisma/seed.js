const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.admin.upsert({
    where: { email: 'admin@factory.com' },
    update: {},
    create: {
      email: 'admin@factory.com',
      password: hashedPassword,
      name: 'Factory Admin',
    },
  });

  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        factoryName: 'Factory Attendance',
        shiftStart: '09:00',
        shiftEnd: '18:00',
        lateAfter: '09:15',
        minFaceConfidence: 65,
      },
    });
  }

  console.log('Seed complete: admin@factory.com / admin123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
