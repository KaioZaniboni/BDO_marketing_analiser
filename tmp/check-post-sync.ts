import { PrismaClient } from '@prisma/client';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import {
  buildOverviewRows,
  getDefaultCalculatorState,
  getDefaultCraftingSettings,
} from '../apps/web/src/lib/crafting/calculator';

const prisma = new PrismaClient();

async function getHttpStatus(path: string) {
  const response = await fetch(`http://localhost:3000${path}`);
  return response.status;
}

async function main() {
  const client = createTRPCProxyClient({
    links: [httpBatchLink({ url: 'http://localhost:3000/api/trpc', transformer: superjson })],
  });

  const [
    itemPriceCount,
    priceHistoryCount,
    latestPrices,
    latestHistory,
    catalog,
    cookingRanking,
    alchemyRanking,
    cookingHttp,
    alchemyHttp,
  ] = await Promise.all([
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
    client.recipe.catalog.query({ types: ['cooking', 'alchemy', 'processing'], historyDays: 28 }),
    client.recipe.getRanking.query({ type: 'cooking', limit: 5 }),
    client.recipe.getRanking.query({ type: 'alchemy', limit: 5 }),
    getHttpStatus('/cooking'),
    getHttpStatus('/alchemy'),
  ]);

  const byType = { cooking: 0, alchemy: 0, processing: 0 };
  for (const recipe of catalog) {
    if (Object.prototype.hasOwnProperty.call(byType, recipe.type)) {
      byType[recipe.type as keyof typeof byType] += 1;
    }
  }

  const state = getDefaultCalculatorState();
  const settings = getDefaultCraftingSettings();
  const cookingOverview = buildOverviewRows(catalog as never, 'cooking', settings, state);
  const alchemyOverview = buildOverviewRows(catalog as never, 'alchemy', settings, state);
  const summarize = (rows: typeof cookingOverview) => ({
    count: rows.length,
    positiveSilver: rows.filter((row) => row.silverPerHour > 0).length,
    positiveVolume: rows.filter((row) => row.dailyVolume > 0).length,
    maxSilver: Math.max(...rows.map((row) => row.silverPerHour)),
    maxVolume: Math.max(...rows.map((row) => row.dailyVolume)),
  });

  console.log(
    JSON.stringify(
      {
        db: { itemPriceCount, priceHistoryCount, latestPrices, latestHistory },
        api: {
          catalogTotal: catalog.length,
          catalogByType: byType,
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
        http: { cooking: cookingHttp, alchemy: alchemyHttp },
        overview: {
          cooking: summarize(cookingOverview),
          alchemy: summarize(alchemyOverview),
        },
      },
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