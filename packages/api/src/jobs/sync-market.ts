import { prisma } from '@bdo/db';
import { getMultipleItemPrices } from '../services/market';

/**
 * Job para sincronizar preços do mercado periodicamente no banco.
 * Obtem todos os itens "tradeable", e usa o serviço `getMultipleItemPrices`.
 */
export async function syncMarketPrices() {
    console.log('Inciando job de sync. Buscando itens de interesse...');

    // Pegar todos os itens cadastrados no db
    const tradeableItems = await prisma.item.findMany({
        where: { isTradeable: true },
        select: { id: true },
    });

    const itemIds = tradeableItems.map((i: { id: number }) => i.id);
    console.log(`Encontrados ${itemIds.length} itens.`);

    // Buscar todos os preços via api.arsha.io agrupado
    console.log('Buscando preços atualizados da API...');
    const marketData = await getMultipleItemPrices(itemIds);

    console.log(`Recebidas ${marketData.size} respostas do mercado. Atualizando DB...`);

    let upsertCount = 0;
    for (const [id, data] of marketData) {
        if (!data) continue;

        // Upsert no ItemPrice do BD
        await prisma.itemPrice.upsert({
            where: {
                itemId_enhancementLevel: {
                    itemId: id,
                    enhancementLevel: 0
                }
            },
            update: {
                basePrice: BigInt(data.basePrice),
                lastSoldPrice: BigInt(data.lastSoldPrice || data.basePrice),
                priceMin: BigInt(data.priceMin || 0),
                priceMax: BigInt(data.priceMax || 0),
                currentStock: data.currentStock,
                totalTrades: BigInt(data.totalTrades),
                recordedAt: new Date()
            },
            create: {
                itemId: id,
                enhancementLevel: 0,
                basePrice: BigInt(data.basePrice),
                lastSoldPrice: BigInt(data.lastSoldPrice || data.basePrice),
                priceMin: BigInt(data.priceMin || 0),
                priceMax: BigInt(data.priceMax || 0),
                currentStock: data.currentStock,
                totalTrades: BigInt(data.totalTrades),
                recordedAt: new Date()
            }
        });
        upsertCount++;

        // Registrar log diário para gráficos no historico
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await prisma.priceHistory.upsert({
            where: {
                itemId_enhancementLevel_recordedDate: {
                    itemId: id,
                    enhancementLevel: 0,
                    recordedDate: today
                }
            },
            update: {
                price: BigInt(data.lastSoldPrice || data.basePrice),
                volume: data.totalTrades
            },
            create: {
                itemId: id,
                recordedDate: today,
                price: BigInt(data.lastSoldPrice || data.basePrice),
                volume: data.totalTrades
            }
        });
    }

    console.log(`✅ Sincronização Finalizada. ${upsertCount} registros afetados.`);
}
