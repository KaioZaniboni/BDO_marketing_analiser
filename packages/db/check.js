const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const boxes = await prisma.imperialBox.findMany({ take: 2 });
    console.log(boxes);
}

main().finally(() => prisma.$disconnect());
