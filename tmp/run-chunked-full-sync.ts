import fs from 'fs';
import path from 'path';
import { prisma } from '../packages/db/src';
import { syncMarketPrices } from '../packages/api/src/jobs/sync-market';

const logPath = path.join(process.cwd(), 'tmp', 'chunked-full-sync.log');
const chunkSize = Math.max(1, Number(process.env.SYNC_CHUNK_SIZE ?? 500));
const startIndex = Math.max(0, Number(process.env.SYNC_START_INDEX ?? 0));

fs.writeFileSync(logPath, '');

const logger = {
  log: (...args: unknown[]) => {
    fs.appendFileSync(logPath, `${args.map(String).join(' ')}\n`);
  },
  error: (...args: unknown[]) => {
    fs.appendFileSync(logPath, `ERROR ${args.map(String).join(' ')}\n`);
  },
};

async function main() {
  const tradeableItems = await prisma.item.findMany({
    where: { isTradeable: true },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const itemIds = tradeableItems.map((item) => item.id);
  const totalChunks = Math.ceil(itemIds.length / chunkSize);

  logger.log(`Tradeable total: ${itemIds.length}`);
  logger.log(`Chunk size: ${chunkSize}`);
  logger.log(`Starting from index: ${startIndex}`);
  logger.log(`Total chunks: ${totalChunks}`);

  for (let index = startIndex; index < itemIds.length; index += chunkSize) {
    const chunkIds = itemIds.slice(index, index + chunkSize);
    const chunkNumber = Math.floor(index / chunkSize) + 1;
    logger.log(`=== Chunk ${chunkNumber}/${totalChunks} | items ${index}-${index + chunkIds.length - 1} | size ${chunkIds.length} ===`);

    await syncMarketPrices({
      itemIds: chunkIds,
      progressEvery: 100,
      fetchBatchSize: 5,
      logger,
    });

    logger.log(`=== Chunk ${chunkNumber}/${totalChunks} concluído ===`);
  }

  logger.log('DONE');
}

main()
  .catch((error) => {
    logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

