import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Mock akkauntlar yaratilmoqda...');

  const passwordHash = await bcrypt.hash('123456', 10);

  const mockUsers = [
    {
      email: 'ali@example.com',
      username: 'Ali (Mock)',
      password: passwordHash,
      uniqueId: 'ali_mock_123'
    },
    {
      email: 'vali@example.com',
      username: 'Vali (Mock)',
      password: passwordHash,
      uniqueId: 'vali_mock_123'
    },
    {
      email: 'hasan@example.com',
      username: 'Hasan (Mock)',
      password: passwordHash,
      uniqueId: 'hasan_mock_123'
    }
  ];

  for (const user of mockUsers) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      await prisma.user.create({ data: user });
      console.log(`✅ ${user.username} yaratildi (Email: ${user.email}, Parol: 123456)`);
    } else {
      console.log(`⚠️ ${user.username} oldin yaratilgan`);
    }
  }

  console.log('Bajarildi!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
