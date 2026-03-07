const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const [itemPriceCount, priceHistoryCount, latestPrices, latestHistory] = await Promise.all([
    prisma.itemPrice.count(),
    prisma.priceHistory.count(),
    prisma.itemPrice.findMany({
      select: { itemId: true, basePrice: true, recordedAt: true },
      orderBy: { recordedAt: 'desc' },
      take: 10,
    }),
    prisma.priceHistory.findMany({
      select: { itemId: true, price: true, volume: true, recordedDate: true },
      orderBy: [{ recordedDate: 'desc' }, { itemId: 'asc' }],
      take: 10,
    }),
  ]);

  console.log(
    JSON.stringify(
      { itemPriceCount, priceHistoryCount, latestPrices, latestHistory },
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });