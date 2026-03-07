const { PrismaClient } = require('@prisma/client');
const { createTRPCProxyClient, httpBatchLink } = require('@trpc/client');
const superjson = require('superjson');

const prisma = new PrismaClient();

async function getHttpStatus(path) {
  const response = await fetch(`http://localhost:3000${path}`);
  return response.status;
}

async function main() {
  const client = createTRPCProxyClient({
    links: [
      httpBatchLink({
        url: 'http://localhost:3000/api/trpc',
        transformer: superjson,
      }),
    ],
  });

  const [
    itemPriceCount,
    priceHistoryCount,
    samplePrices,
    recordedDates,
    catalog,
    cookingRanking,
    alchemyRanking,
    cookingHttp,
    alchemyHttp,
  ] = await Promise.all([
    prisma.itemPrice.count(),
    prisma.priceHistory.count(),
    prisma.itemPrice.findMany({
      select: {
        itemId: true,
        basePrice: true,
        currentStock: true,
        totalTrades: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: 'desc' },
      take: 5,
    }),
    prisma.priceHistory.groupBy({ by: ['recordedDate'] }),
    client.recipe.catalog.query({ types: ['cooking', 'alchemy', 'processing'], historyDays: 28 }),
    client.recipe.getRanking.query({ type: 'cooking', limit: 5 }),
    client.recipe.getRanking.query({ type: 'alchemy', limit: 5 }),
    getHttpStatus('/cooking'),
    getHttpStatus('/alchemy'),
  ]);

  const byType = { cooking: 0, alchemy: 0, processing: 0 };
  for (const recipe of catalog) {
    if (Object.prototype.hasOwnProperty.call(byType, recipe.type)) {
      byType[recipe.type] += 1;
    }
  }

  console.log(JSON.stringify({
    db: {
      itemPriceCount,
      priceHistoryCount,
      distinctHistoryDays: recordedDates.length,
      samplePrices,
    },
    api: {
      catalogTotal: catalog.length,
      catalogByType: byType,
      cookingRankingCount: cookingRanking.length,
      alchemyRankingCount: alchemyRanking.length,
      cookingTop: cookingRanking.slice(0, 3).map((row) => ({
        id: row.id,
        name: row.name,
        dailyVolume: row.dailyVolume,
        silverPerHour: row.silverPerHour,
      })),
      alchemyTop: alchemyRanking.slice(0, 3).map((row) => ({
        id: row.id,
        name: row.name,
        dailyVolume: row.dailyVolume,
        silverPerHour: row.silverPerHour,
      })),
    },
    http: {
      cooking: cookingHttp,
      alchemy: alchemyHttp,
    },
  }, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

