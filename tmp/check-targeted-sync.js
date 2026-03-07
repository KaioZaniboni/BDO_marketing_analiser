const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const itemIds = [206, 207, 208, 212, 215];
  const [prices, history] = await Promise.all([
    prisma.itemPrice.findMany({
      where: { itemId: { in: itemIds } },
      select: {
        itemId: true,
        basePrice: true,
        currentStock: true,
        totalTrades: true,
        recordedAt: true,
      },
      orderBy: { itemId: 'asc' },
    }),
    prisma.priceHistory.findMany({
      where: { itemId: { in: itemIds } },
      select: {
        itemId: true,
        recordedDate: true,
        price: true,
        volume: true,
      },
      orderBy: [{ itemId: 'asc' }, { recordedDate: 'desc' }],
    }),
  ]);

  console.log(JSON.stringify({
    itemPriceCount: prices.length,
    priceHistoryCount: history.length,
    prices,
    history,
  }, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

