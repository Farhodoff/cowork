import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑  Clearing database...');

    // Delete in order of dependency to avoid foreign key constraint errors
    await prisma.itemAssignment.deleteMany();
    await prisma.sessionParticipant.deleteMany();
    await prisma.receiptItem.deleteMany();
    await prisma.sessionHistoryEntry.deleteMany();
    await prisma.session.deleteMany();
    await prisma.groupMember.deleteMany();
    await prisma.group.deleteMany();
    await prisma.friendship.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Database cleared!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
