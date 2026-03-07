import type { MarketItem } from '../types';

interface GetMultipleItemPricesProgress {
    processed: number;
    total: number;
    fetched: number;
    cached: number;
}

interface GetMultipleItemPricesOptions {
    batchSize?: number;
    onProgress?: (progress: GetMultipleItemPricesProgress) => void;
}

interface MarketItemApiResponse {
    id?: number;
    minEnhance?: number;
    maxEnhance?: number;
    basePrice?: number;
    currentStock?: number;
    totalTrades?: number;
    priceMin?: number;
    priceMax?: number;
    lastSoldPrice?: number;
    lastSoldTime?: number;
    resultCode?: number | null;
}

interface MarketServiceConfig {
    baseUrl: string;
    region: string;
    lang: string;
}

const DEFAULT_ARSHA_BASE_URL = 'https://api.arsha.io';
const REQUIRED_MARKET_REGION = 'sa';
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

function normalizeConfigValue(value: string | undefined, fallback: string): string {
    const trimmedValue = value?.trim();
    return trimmedValue && trimmedValue.length > 0 ? trimmedValue : fallback;
}

export function resolveMarketServiceConfig(env: NodeJS.ProcessEnv = process.env): MarketServiceConfig {
    return {
        baseUrl: normalizeConfigValue(env.ARSHA_API_URL, DEFAULT_ARSHA_BASE_URL).replace(/\/+$/, ''),
        region: normalizeConfigValue(env.ARSHA_REGION, REQUIRED_MARKET_REGION).toLowerCase(),
        lang: normalizeConfigValue(env.ARSHA_LANG, DEFAULT_LANG).toLowerCase(),
    };
}

export function assertSupportedMarketRegion(region: string): 'sa' {
    const normalizedRegion = String(region ?? '').trim().toLowerCase();

    if (normalizedRegion !== REQUIRED_MARKET_REGION) {
        throw new Error(`Região de mercado inválida: esperado 'sa', recebido '${normalizedRegion || 'vazio'}'.`);
    }

    return REQUIRED_MARKET_REGION;
}

export function getConfiguredMarketRegion(env: NodeJS.ProcessEnv = process.env): 'sa' {
    return assertSupportedMarketRegion(resolveMarketServiceConfig(env).region);
}

/**
 * Busca dados de um item específico via api.arsha.io v2.
 */
export function parseMarketItemResponse(
    data: MarketItemApiResponse | null | undefined,
    fallbackItemId: number,
): MarketItem | null {
    if (!data || (data.resultCode != null && data.resultCode !== 0)) {
        return null;
    }

    return {
        id: data.id ?? fallbackItemId,
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
}

export async function getItemPrice(
    itemId: number,
    sid?: number,
): Promise<MarketItem | null> {
    const config = resolveMarketServiceConfig();
    const region = assertSupportedMarketRegion(config.region);

    try {
        let url = `${config.baseUrl}/v2/${region}/item?id=${itemId}&lang=${config.lang}`;
        if (sid !== undefined) {
            url += `&sid=${sid}`;
        }

        const response = await fetchWithRetry(url);
        const data = await response.json();

        return parseMarketItemResponse(data, itemId);
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
    options: GetMultipleItemPricesOptions = {},
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

    const cachedCount = results.size;
    const totalCount = itemIds.length;
    const totalMissing = missingIds.length;

    if (totalMissing === 0) {
        options.onProgress?.({
            processed: totalCount,
            total: totalCount,
            fetched: 0,
            cached: cachedCount,
        });
        return results;
    }

    // Processar itens não em cache (missingIds) em lotes de 5
    const batchSize = Math.max(1, Math.trunc(options.batchSize ?? 5));
    let fetchedCount = 0;

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

        fetchedCount += batch.length;
        options.onProgress?.({
            processed: cachedCount + fetchedCount,
            total: totalCount,
            fetched: fetchedCount,
            cached: cachedCount,
        });
    }

    return results;
}

/**
 * Busca itens em alta no mercado (Hot List).
 */
export async function getHotList(): Promise<MarketItem[]> {
    const config = resolveMarketServiceConfig();
    const region = assertSupportedMarketRegion(config.region);

    try {
        const url = `${config.baseUrl}/v2/${region}/GetWorldMarketHotList`;
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
