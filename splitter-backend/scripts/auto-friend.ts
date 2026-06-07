import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const realUsers = users.filter(u => !u.uniqueId.includes('mock'));
  const mockUsers = users.filter(u => u.uniqueId.includes('mock'));

  if (realUsers.length === 0) {
    console.log("Haqiqiy foydalanuvchi topilmadi!");
    return;
  }

  const myUser = realUsers[0]; // Assuming the first non-mock user is the real one
  console.log(`Asosiy user: ${myUser.username} (${myUser.uniqueId})`);

  for (const mock of mockUsers) {
    // Check if friendship exists
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: myUser.id, receiverId: mock.id },
          { requesterId: mock.id, receiverId: myUser.id }
        ]
      }
    });

    if (!existing) {
      await prisma.friendship.create({
        data: {
          requesterId: myUser.id,
          receiverId: mock.id,
          status: 'ACCEPTED'
        }
      });
      console.log(`✅ ${mock.username} bilan do'stlashildi.`);
    } else {
      await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' }
      });
      console.log(`⚠️ ${mock.username} bilan do'stlik yangilandi.`);
    }
  }

  console.log("Do'stlar ro'yxatiga qo'shildi!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
