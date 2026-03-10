import type { CanonicalReadableRecipe } from './canonical-recipe-reader';

const COOKING_RARE_BASE_CHANCE = 0.2;
const ALCHEMY_RARE_BASE_CHANCE = 0.2;

type CookingImperialMasteryEntry = {
    massProduceChance: number;
    maxProcChance: number;
    rareAdditionalChance: number;
    imperialBonus: number;
};

type AlchemyImperialMasteryEntry = {
    maxProcChance: number;
    imperialBonus: number;
};

const COOKING_IMPERIAL_MASTERY_TABLE: Record<number, CookingImperialMasteryEntry> = {
    0: { massProduceChance: 0, maxProcChance: 0, rareAdditionalChance: 0, imperialBonus: 0 },
    50: { massProduceChance: 0.1089, maxProcChance: 0.0064, rareAdditionalChance: 0.0025, imperialBonus: 0.0185 },
    100: { massProduceChance: 0.1176, maxProcChance: 0.0096, rareAdditionalChance: 0.0036, imperialBonus: 0.0296 },
    150: { massProduceChance: 0.1267, maxProcChance: 0.0135, rareAdditionalChance: 0.0049, imperialBonus: 0.0433 },
    200: { massProduceChance: 0.1362, maxProcChance: 0.018, rareAdditionalChance: 0.0064, imperialBonus: 0.0595 },
    250: { massProduceChance: 0.1459, maxProcChance: 0.0231, rareAdditionalChance: 0.0081, imperialBonus: 0.0784 },
    300: { massProduceChance: 0.156, maxProcChance: 0.0289, rareAdditionalChance: 0.01, imperialBonus: 0.0999 },
    350: { massProduceChance: 0.1665, maxProcChance: 0.0353, rareAdditionalChance: 0.0121, imperialBonus: 0.1239 },
    400: { massProduceChance: 0.1772, maxProcChance: 0.0424, rareAdditionalChance: 0.0144, imperialBonus: 0.1505 },
    450: { massProduceChance: 0.1884, maxProcChance: 0.0502, rareAdditionalChance: 0.0169, imperialBonus: 0.1798 },
    500: { massProduceChance: 0.1998, maxProcChance: 0.0586, rareAdditionalChance: 0.0196, imperialBonus: 0.2116 },
    550: { massProduceChance: 0.2116, maxProcChance: 0.0676, rareAdditionalChance: 0.0225, imperialBonus: 0.246 },
    600: { massProduceChance: 0.2237, maxProcChance: 0.0773, rareAdditionalChance: 0.0256, imperialBonus: 0.283 },
    650: { massProduceChance: 0.2362, maxProcChance: 0.0876, rareAdditionalChance: 0.0289, imperialBonus: 0.3226 },
    700: { massProduceChance: 0.249, maxProcChance: 0.0986, rareAdditionalChance: 0.0324, imperialBonus: 0.3648 },
    750: { massProduceChance: 0.2621, maxProcChance: 0.1102, rareAdditionalChance: 0.0361, imperialBonus: 0.4096 },
    800: { massProduceChance: 0.2756, maxProcChance: 0.1225, rareAdditionalChance: 0.04, imperialBonus: 0.457 },
    850: { massProduceChance: 0.2894, maxProcChance: 0.1354, rareAdditionalChance: 0.0441, imperialBonus: 0.5069 },
    900: { massProduceChance: 0.3058, maxProcChance: 0.149, rareAdditionalChance: 0.0484, imperialBonus: 0.5595 },
    950: { massProduceChance: 0.3226, maxProcChance: 0.1632, rareAdditionalChance: 0.0529, imperialBonus: 0.6147 },
    1000: { massProduceChance: 0.3399, maxProcChance: 0.1781, rareAdditionalChance: 0.0576, imperialBonus: 0.6724 },
    1050: { massProduceChance: 0.3576, maxProcChance: 0.1936, rareAdditionalChance: 0.0625, imperialBonus: 0.7327 },
    1100: { massProduceChance: 0.3758, maxProcChance: 0.2098, rareAdditionalChance: 0.0676, imperialBonus: 0.7957 },
    1150: { massProduceChance: 0.3944, maxProcChance: 0.2266, rareAdditionalChance: 0.0729, imperialBonus: 0.8612 },
    1200: { massProduceChance: 0.4134, maxProcChance: 0.244, rareAdditionalChance: 0.0784, imperialBonus: 0.9293 },
    1250: { massProduceChance: 0.4422, maxProcChance: 0.2621, rareAdditionalChance: 0.0841, imperialBonus: 0.9584 },
    1300: { massProduceChance: 0.472, maxProcChance: 0.2809, rareAdditionalChance: 0.09, imperialBonus: 0.988 },
    1350: { massProduceChance: 0.5027, maxProcChance: 0.3003, rareAdditionalChance: 0.0961, imperialBonus: 1.0181 },
    1400: { massProduceChance: 0.5344, maxProcChance: 0.3204, rareAdditionalChance: 0.1024, imperialBonus: 1.0486 },
    1450: { massProduceChance: 0.567, maxProcChance: 0.3411, rareAdditionalChance: 0.1089, imperialBonus: 1.0795 },
    1500: { massProduceChance: 0.6006, maxProcChance: 0.3624, rareAdditionalChance: 0.1156, imperialBonus: 1.1109 },
    1550: { massProduceChance: 0.6352, maxProcChance: 0.3844, rareAdditionalChance: 0.1225, imperialBonus: 1.1428 },
    1600: { massProduceChance: 0.6708, maxProcChance: 0.407, rareAdditionalChance: 0.1296, imperialBonus: 1.1751 },
    1650: { massProduceChance: 0.7073, maxProcChance: 0.4303, rareAdditionalChance: 0.1369, imperialBonus: 1.2078 },
    1700: { massProduceChance: 0.7448, maxProcChance: 0.4543, rareAdditionalChance: 0.1444, imperialBonus: 1.241 },
    1750: { massProduceChance: 0.7832, maxProcChance: 0.4789, rareAdditionalChance: 0.1521, imperialBonus: 1.2746 },
    1800: { massProduceChance: 0.8226, maxProcChance: 0.5041, rareAdditionalChance: 0.16, imperialBonus: 1.3087 },
    1850: { massProduceChance: 0.863, maxProcChance: 0.53, rareAdditionalChance: 0.1681, imperialBonus: 1.3433 },
    1900: { massProduceChance: 0.9044, maxProcChance: 0.5565, rareAdditionalChance: 0.1764, imperialBonus: 1.3783 },
    1950: { massProduceChance: 0.995, maxProcChance: 0.5837, rareAdditionalChance: 0.1849, imperialBonus: 1.4137 },
    2000: { massProduceChance: 1, maxProcChance: 0.6115, rareAdditionalChance: 0.1936, imperialBonus: 1.4496 },
};

const ALCHEMY_IMPERIAL_MASTERY_TABLE: Record<number, AlchemyImperialMasteryEntry> = {
    0: { maxProcChance: 0, imperialBonus: 0 },
    50: { maxProcChance: 0.0576, imperialBonus: 0.018496 },
    100: { maxProcChance: 0.0635, imperialBonus: 0.029584 },
    150: { maxProcChance: 0.0697, imperialBonus: 0.043264 },
    200: { maxProcChance: 0.0762, imperialBonus: 0.059536 },
    250: { maxProcChance: 0.0829, imperialBonus: 0.0784 },
    300: { maxProcChance: 0.09, imperialBonus: 0.099856 },
    350: { maxProcChance: 0.0973, imperialBonus: 0.123904 },
    400: { maxProcChance: 0.105, imperialBonus: 0.150544 },
    450: { maxProcChance: 0.1129, imperialBonus: 0.179776 },
    500: { maxProcChance: 0.1211, imperialBonus: 0.2116 },
    550: { maxProcChance: 0.1296, imperialBonus: 0.246016 },
    600: { maxProcChance: 0.1384, imperialBonus: 0.283024 },
    650: { maxProcChance: 0.1475, imperialBonus: 0.322624 },
    700: { maxProcChance: 0.1568, imperialBonus: 0.364816 },
    750: { maxProcChance: 0.1665, imperialBonus: 0.4096 },
    800: { maxProcChance: 0.1764, imperialBonus: 0.456976 },
    850: { maxProcChance: 0.1866, imperialBonus: 0.506944 },
    900: { maxProcChance: 0.1971, imperialBonus: 0.559504 },
    950: { maxProcChance: 0.2079, imperialBonus: 0.614656 },
    1000: { maxProcChance: 0.219, imperialBonus: 0.6724 },
    1050: { maxProcChance: 0.2304, imperialBonus: 0.732736 },
    1100: { maxProcChance: 0.2421, imperialBonus: 0.795664 },
    1150: { maxProcChance: 0.254, imperialBonus: 0.861184 },
    1200: { maxProcChance: 0.2663, imperialBonus: 0.929296 },
    1250: { maxProcChance: 0.2788, imperialBonus: 0.958441 },
    1300: { maxProcChance: 0.2916, imperialBonus: 0.988036 },
    1350: { maxProcChance: 0.3047, imperialBonus: 1.018081 },
    1400: { maxProcChance: 0.3181, imperialBonus: 1.048576 },
    1450: { maxProcChance: 0.3318, imperialBonus: 1.079521 },
    1500: { maxProcChance: 0.3457, imperialBonus: 1.110916 },
    1550: { maxProcChance: 0.36, imperialBonus: 1.142761 },
    1600: { maxProcChance: 0.3745, imperialBonus: 1.175056 },
    1650: { maxProcChance: 0.3894, imperialBonus: 1.207801 },
    1700: { maxProcChance: 0.4045, imperialBonus: 1.240996 },
    1750: { maxProcChance: 0.4199, imperialBonus: 1.274641 },
    1800: { maxProcChance: 0.4356, imperialBonus: 1.308736 },
    1850: { maxProcChance: 0.4516, imperialBonus: 1.343281 },
    1900: { maxProcChance: 0.4679, imperialBonus: 1.377827 },
    1950: { maxProcChance: 0.4844, imperialBonus: 1.412721 },
    2000: { maxProcChance: 0.5, imperialBonus: 1.449616 },
};

function findClosestTableKey<T>(table: Record<number, T>, mastery: number): number {
    const keys = Object.keys(table)
        .map(Number)
        .sort((left, right) => left - right);

    let selected = keys[0] ?? 0;
    for (const key of keys) {
        if (key > mastery) {
            break;
        }
        selected = key;
    }

    return selected;
}

function getOutputRange(minimum: number | null | undefined, maximum: number | null | undefined) {
    const min = Math.max(minimum ?? 0, 0);
    const max = Math.max(maximum ?? min, min);

    return {
        min,
        max,
        average: (min + max) / 2,
    };
}

function getCookingMasteryEntry(mastery: number): CookingImperialMasteryEntry {
    return COOKING_IMPERIAL_MASTERY_TABLE[findClosestTableKey(COOKING_IMPERIAL_MASTERY_TABLE, mastery)];
}

function getAlchemyMasteryEntry(mastery: number): AlchemyImperialMasteryEntry {
    return ALCHEMY_IMPERIAL_MASTERY_TABLE[findClosestTableKey(ALCHEMY_IMPERIAL_MASTERY_TABLE, mastery)];
}

export function getImperialBonus(mastery: number): number {
    return getCookingMasteryEntry(mastery).imperialBonus * 100;
}

export function getExpectedImperialOutputPerCraft(
    recipe: CanonicalReadableRecipe,
    outputItemId: number,
    mastery: number,
): {
    expectedOutputPerCraft: number;
    massProcRate: number;
} {
    const normal = getOutputRange(recipe.resultQuantity, recipe.resultMaxQuantity);
    const rare = getOutputRange(recipe.procQuantity, recipe.procMaxQuantity);

    if (recipe.type === 'alchemy') {
        const masteryEntry = getAlchemyMasteryEntry(mastery);
        const normalProcRate = normal.average + (normal.max - normal.average) * masteryEntry.maxProcChance;
        const rareProcRate = rare.average * ALCHEMY_RARE_BASE_CHANCE;

        if (outputItemId === recipe.resultItemId) {
            return { expectedOutputPerCraft: normalProcRate, massProcRate: 1 };
        }

        if (outputItemId === recipe.procItemId) {
            return { expectedOutputPerCraft: rareProcRate, massProcRate: 1 };
        }

        return { expectedOutputPerCraft: 0, massProcRate: 1 };
    }

    const masteryEntry = getCookingMasteryEntry(mastery);
    const normalProcRate = normal.average + (normal.max - normal.average) * masteryEntry.maxProcChance;
    const rareProcRate = (rare.average + (rare.max - rare.average) * masteryEntry.maxProcChance)
        * (COOKING_RARE_BASE_CHANCE + masteryEntry.rareAdditionalChance);
    const massProcRate = 1 + (9 * masteryEntry.massProduceChance);

    if (outputItemId === recipe.resultItemId) {
        return { expectedOutputPerCraft: normalProcRate, massProcRate };
    }

    if (outputItemId === recipe.procItemId) {
        return { expectedOutputPerCraft: rareProcRate, massProcRate };
    }

    return { expectedOutputPerCraft: 0, massProcRate };
}
