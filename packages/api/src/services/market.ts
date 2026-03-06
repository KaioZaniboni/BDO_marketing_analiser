import type { MarketItem } from '../types';

const ARSHA_BASE_URL = 'https://api.arsha.io';
const SA_REGION = 'sa';
const DEFAULT_LANG = 'pt';

// Rate limiting simples em memória
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 200; // 5 req/s

/**
 * Aguarda o intervalo mínimo entre requisições para respeitar rate limiting.
 */
async function throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_INTERVAL_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestTime = Date.now();
}

/**
 * Faz uma requisição ao api.arsha.io com retry e backoff exponencial.
 */
async function fetchWithRetry(
    url: string,
    maxRetries: number = 3,
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await throttle();
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'BDO-Market-Analyzer/1.0',
                    Accept: 'application/json',
                },
            });

            if (response.status === 429) {
                // Rate limited — esperar mais
                const backoff = Math.pow(2, attempt + 1) * 1000;
                await new Promise((resolve) => setTimeout(resolve, backoff));
                continue;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries - 1) {
                const backoff = Math.pow(2, attempt) * 1000;
                await new Promise((resolve) => setTimeout(resolve, backoff));
            }
        }
    }

    throw lastError ?? new Error('Falha ao conectar com api.arsha.io');
}

/**
 * Busca dados de um item específico via api.arsha.io v2.
 */
export async function getItemPrice(
    itemId: number,
    sid?: number,
): Promise<MarketItem | null> {
    try {
        let url = `${ARSHA_BASE_URL}/v2/${SA_REGION}/item?id=${itemId}&lang=${DEFAULT_LANG}`;
        if (sid !== undefined) {
            url += `&sid=${sid}`;
        }

        const response = await fetchWithRetry(url);
        const data = await response.json();

        if (!data || data.resultCode !== 0) return null;

        return {
            id: data.id ?? itemId,
            minEnhance: data.minEnhance ?? 0,
            maxEnhance: data.maxEnhance ?? 0,
            basePrice: data.basePrice ?? 0,
            currentStock: data.currentStock ?? 0,
            totalTrades: data.totalTrades ?? 0,
            priceMin: data.priceMin ?? 0,
            priceMax: data.priceMax ?? 0,
            lastSoldPrice: data.lastSoldPrice ?? 0,
            lastSoldTime: data.lastSoldTime ?? 0,
        };
    } catch (error) {
        console.error(`Erro ao buscar item ${itemId}:`, error);
        return null;
    }
}

// L1 In-Memory Cache simple
const cacheL1 = new Map<number, { data: MarketItem; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/**
 * Busca preços de múltiplos itens em paralelo (com throttle e cache L1).
 */
export async function getMultipleItemPrices(
    itemIds: number[],
): Promise<Map<number, MarketItem>> {
    const results = new Map<number, MarketItem>();
    const missingIds: number[] = [];

    const now = Date.now();

    // 1. Verifica no Cache L1
    for (const id of itemIds) {
        const cached = cacheL1.get(id);
        if (cached && cached.expiresAt > now) {
            results.set(id, cached.data);
        } else {
            missingIds.push(id);
        }
    }

    if (missingIds.length === 0) return results;

    // Processar itens não em cache (missingIds) em lotes de 5
    const batchSize = 5;
    for (let i = 0; i < missingIds.length; i += batchSize) {
        const batch = missingIds.slice(i, i + batchSize);
        const promises = batch.map(async (id) => {
            const item = await getItemPrice(id);
            if (item) {
                results.set(id, item);
                cacheL1.set(id, { data: item, expiresAt: Date.now() + CACHE_TTL_MS });
            }
        });
        await Promise.all(promises);
    }

    return results;
}

/**
 * Busca itens em alta no mercado (Hot List).
 */
export async function getHotList(): Promise<MarketItem[]> {
    try {
        const url = `${ARSHA_BASE_URL}/v2/${SA_REGION}/GetWorldMarketHotList`;
        const response = await fetchWithRetry(url);
        const data = await response.json();

        if (!Array.isArray(data)) return [];
        return data;
    } catch (error) {
        console.error('Erro ao buscar hot list:', error);
        return [];
    }
}

// ============================================================
// Parsing de respostas pipe-separated (fallback market.sa)
// ============================================================

/**
 * Parseia a string resultMsg do endpoint GetWorldMarketSubList.
 * Formato: "id-minEnh-maxEnh-basePrice-stock-trades-pMin-pMax-lastPrice-lastTime|..."
 */
export function parseMarketSubList(resultMsg: string): MarketItem[] {
    if (!resultMsg || resultMsg.trim() === '') return [];

    return resultMsg
        .split('|')
        .filter((entry) => entry.length > 0)
        .map((entry) => {
            const fields = entry.split('-');
            return {
                id: parseInt(fields[0], 10),
                minEnhance: parseInt(fields[1], 10),
                maxEnhance: parseInt(fields[2], 10),
                basePrice: parseInt(fields[3], 10),
                currentStock: parseInt(fields[4], 10),
                totalTrades: parseInt(fields[5], 10),
                priceMin: parseInt(fields[6], 10),
                priceMax: parseInt(fields[7], 10),
                lastSoldPrice: parseInt(fields[8], 10),
                lastSoldTime: parseInt(fields[9], 10),
            };
        })
        .filter((item) => !isNaN(item.id));
}
