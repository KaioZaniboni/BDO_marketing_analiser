import { prisma } from '@bdo/db';
import { getMultipleItemPrices } from '../services/market';
import {
    getMarketPriceValue,
    getPriceHistoryRecordedDate,
    normalizePositiveIds,
    normalizePositiveLimit,
    normalizeSyncMarketPersistMode,
    shouldLogProgress,
    shouldPersistItemPrice,
    shouldPersistPriceHistory,
    toPriceHistoryVolume,
    type SyncMarketPersistMode,
} from './sync-market-utils';

interface SyncMarketPricesOptions {
    itemIds?: number[];
    limit?: number;
    progressEvery?: number;
    fetchBatchSize?: number;
    persistMode?: SyncMarketPersistMode;
    logger?: Pick<Console, 'log' | 'error'>;
}

export interface SyncMarketPricesResult {
    persistMode: SyncMarketPersistMode;
    requestedItemCount: number;
    receivedItemCount: number;
    processedItemCount: number;
    itemPriceUpserts: number;
    priceHistoryUpserts: number;
}

const DEFAULT_SYNC_PROGRESS_EVERY = 250;

/**
 * Job para sincronizar preços do mercado periodicamente no banco.
 * Obtem todos os itens "tradeable", e usa o serviço `getMultipleItemPrices`.
 */
export async function syncMarketPrices(options: SyncMarketPricesOptions = {}): Promise<SyncMarketPricesResult> {
    const logger = options.logger ?? console;
    const progressEvery = normalizePositiveLimit(options.progressEvery) ?? DEFAULT_SYNC_PROGRESS_EVERY;
    const persistMode = normalizeSyncMarketPersistMode(options.persistMode);
    const persistItemPrice = shouldPersistItemPrice(persistMode);
    const persistPriceHistory = shouldPersistPriceHistory(persistMode);

    logger.log('Iniciando job de sync. Buscando itens de interesse...');

    // Pegar todos os itens cadastrados no db
    const tradeableItems = await prisma.item.findMany({
        where: { isTradeable: true },
        select: { id: true },
    });

    const allItemIds = tradeableItems.map((i: { id: number }) => i.id);
    const explicitItemIds = normalizePositiveIds(options.itemIds);
    const limit = normalizePositiveLimit(options.limit);
    const itemIds = explicitItemIds.length > 0
        ? explicitItemIds
        : (limit ? allItemIds.slice(0, limit) : allItemIds);

    logger.log(`Encontrados ${allItemIds.length} itens tradeable.`);
    logger.log(`Modo de persistência ativo: ${persistMode}.`);
    if (explicitItemIds.length > 0) {
        logger.log(`Modo direcionado ativo para validação: processando ${itemIds.length} IDs explícitos.`);
    } else if (limit) {
        logger.log(`Modo limitado ativo para validação: processando ${itemIds.length} itens.`);
    }

    // Buscar todos os preços via api.arsha.io agrupado
    logger.log('Buscando preços atualizados da API...');
    const marketData = await getMultipleItemPrices(itemIds, {
        batchSize: options.fetchBatchSize,
        onProgress: ({ processed, total }) => {
            if (shouldLogProgress(processed, total, progressEvery)) {
                logger.log(`Progresso da coleta de mercado: ${processed}/${total}`);
            }
        },
    });

    logger.log(`Recebidas ${marketData.size} respostas do mercado. Atualizando DB...`);

    if (marketData.size === 0) {
        logger.log('Nenhum snapshot retornado pela API para os itens selecionados.');
        return {
            persistMode,
            requestedItemCount: itemIds.length,
            receivedItemCount: 0,
            processedItemCount: 0,
            itemPriceUpserts: 0,
            priceHistoryUpserts: 0,
        };
    }

    let processedItemCount = 0;
    let itemPriceUpserts = 0;
    let priceHistoryUpserts = 0;
    const totalUpserts = marketData.size;

    for (const [id, data] of marketData) {
        if (!data) continue;

        const recordedAt = new Date();
        const recordedDate = getPriceHistoryRecordedDate(recordedAt);
        const marketPrice = getMarketPriceValue(data);

        if (persistItemPrice) {
            await prisma.itemPrice.upsert({
                where: {
                    itemId_enhancementLevel: {
                        itemId: id,
                        enhancementLevel: 0,
                    },
                },
                update: {
                    basePrice: BigInt(data.basePrice),
                    lastSoldPrice: marketPrice,
                    priceMin: BigInt(data.priceMin || 0),
                    priceMax: BigInt(data.priceMax || 0),
                    currentStock: data.currentStock,
                    totalTrades: BigInt(data.totalTrades),
                    recordedAt,
                },
                create: {
                    itemId: id,
                    enhancementLevel: 0,
                    basePrice: BigInt(data.basePrice),
                    lastSoldPrice: marketPrice,
                    priceMin: BigInt(data.priceMin || 0),
                    priceMax: BigInt(data.priceMax || 0),
                    currentStock: data.currentStock,
                    totalTrades: BigInt(data.totalTrades),
                    recordedAt,
                },
            });
            itemPriceUpserts++;
        }

        if (persistPriceHistory) {
            await prisma.priceHistory.upsert({
                where: {
                    itemId_enhancementLevel_recordedDate: {
                        itemId: id,
                        enhancementLevel: 0,
                        recordedDate,
                    },
                },
                update: {
                    price: marketPrice,
                    volume: toPriceHistoryVolume(data.totalTrades),
                },
                create: {
                    itemId: id,
                    enhancementLevel: 0,
                    recordedDate,
                    price: marketPrice,
                    volume: toPriceHistoryVolume(data.totalTrades),
                },
            });
            priceHistoryUpserts++;
        }

        processedItemCount++;

        if (shouldLogProgress(processedItemCount, totalUpserts, progressEvery)) {
            logger.log(`Progresso da persistência: ${processedItemCount}/${totalUpserts}`);
        }
    }

    logger.log(
        `✅ Sincronização finalizada. ${processedItemCount} itens afetados. itemPrice=${itemPriceUpserts}, priceHistory=${priceHistoryUpserts}`,
    );

    return {
        persistMode,
        requestedItemCount: itemIds.length,
        receivedItemCount: marketData.size,
        processedItemCount,
        itemPriceUpserts,
        priceHistoryUpserts,
    };
}

export function syncMarketSnapshotPrices(options: Omit<SyncMarketPricesOptions, 'persistMode'> = {}) {
    return syncMarketPrices({ ...options, persistMode: 'snapshot' });
}

export function syncMarketHistoryPrices(options: Omit<SyncMarketPricesOptions, 'persistMode'> = {}) {
    return syncMarketPrices({ ...options, persistMode: 'history' });
}
