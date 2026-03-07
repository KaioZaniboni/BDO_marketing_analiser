import fs from 'fs';
import path from 'path';
import { syncMarketPrices } from '../packages/api/src/jobs/sync-market';

const logPath = path.join(process.cwd(), 'tmp', 'full-sync.log');
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
  await syncMarketPrices({
    progressEvery: 500,
    fetchBatchSize: 5,
    logger,
  });
  fs.appendFileSync(logPath, 'DONE\n');
}

main().catch((error) => {
  fs.appendFileSync(logPath, `FATAL ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});

