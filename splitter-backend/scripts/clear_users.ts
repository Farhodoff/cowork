import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearUsers() {
    try {
        console.log('🗑️  Clearing all users from database...');

        // Delete all related data first (foreign key constraints)
        await prisma.sessionHistoryEntry.deleteMany({});
        await prisma.itemAssignment.deleteMany({});
        await prisma.receiptItem.deleteMany({});
        await prisma.session.deleteMany({});
        await prisma.groupMember.deleteMany({});
        await prisma.group.deleteMany({});
        await prisma.friendship.deleteMany({});
        await prisma.user.deleteMany({});

        console.log('✅ All users and related data have been deleted!');
        console.log('You can now register with any email.');
    } catch (error) {
        console.error('❌ Error clearing users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearUsers();
