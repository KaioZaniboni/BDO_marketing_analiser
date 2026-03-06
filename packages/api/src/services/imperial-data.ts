// pacakges/api/src/services/imperial-data.ts

export const IMPERIAL_TIERS = {
    APPRENTICE: { name: 'Aprendiz', basePrice: 52000 },
    SKILLED: { name: 'Habilidoso', basePrice: 80000 },
    PROFESSIONAL: { name: 'Profissional', basePrice: 120000 },
    ARTISAN: { name: 'Artesão', basePrice: 160000 },
    MASTER: { name: 'Mestre', basePrice: 220000 },
    GURU: { name: 'Guru', basePrice: 320000 },
};

// Tabela de Proficiência e Bônus Imperial (% de lucro adicional sobre o preço base)
export const IMPERIAL_MASTERY_TABLE: Record<number, number> = {
    0: 0.0,
    50: 0.5,
    100: 1.0,
    150: 2.1,
    200: 4.2,
    250: 7.2,
    300: 11.2,
    350: 16.0,
    400: 21.6,
    450: 27.6,
    500: 34.0,
    550: 40.5,
    600: 47.1,
    650: 53.6,
    700: 59.9,
    750: 65.9,
    800: 71.6,
    850: 77.0,
    900: 82.2,
    950: 87.2,
    1000: 92.0,
    1050: 96.6,
    1100: 101.0,
    1150: 105.3,
    1200: 109.5,
    1250: 113.8,
    1300: 117.8,
    1350: 121.3,
    1400: 124.5,
    1450: 127.4,
    1500: 130.1,
    1550: 132.6,
    1600: 134.9,
    1650: 137.0,
    1700: 138.9,
    1750: 140.7,
    1800: 142.3,
    1850: 143.8,
    1900: 144.3,
    1950: 144.6,
    2000: 144.9,
};

export function getImperialBonus(mastery: number): number {
    let closestKey = 0;
    for (const key of Object.keys(IMPERIAL_MASTERY_TABLE)) {
        const num = parseInt(key);
        if (num <= mastery && num > closestKey) {
            closestKey = num;
        }
    }
    return IMPERIAL_MASTERY_TABLE[closestKey] || 0;
}

// Mapeamento de quais itens resultam em quais Caixas Imperiais
// Estrutura: { [resultItemId]: { tier: string, qtyRequired: number, type: 'cooking' | 'alchemy' } }
export const IMPERIAL_RECIPES_MAPPING: Record<number, { tier: any, qtyRequired: number, type: string }> = {
    // === CULINÁRIA ===
    672: { tier: IMPERIAL_TIERS.APPRENTICE, qtyRequired: 60, type: 'cooking' }, // Cerveja
    9065: { tier: IMPERIAL_TIERS.APPRENTICE, qtyRequired: 60, type: 'cooking' }, // Essência de Licores
    7313: { tier: IMPERIAL_TIERS.APPRENTICE, qtyRequired: 60, type: 'cooking' }, // Vinagre

    9002: { tier: IMPERIAL_TIERS.SKILLED, qtyRequired: 60, type: 'cooking' }, // Carne de Ave Grelhada
    9005: { tier: IMPERIAL_TIERS.SKILLED, qtyRequired: 30, type: 'cooking' }, // Panqueca (?) - ajustar

    9011: { tier: IMPERIAL_TIERS.PROFESSIONAL, qtyRequired: 18, type: 'cooking' }, // Escondidinho de Carne
    9006: { tier: IMPERIAL_TIERS.PROFESSIONAL, qtyRequired: 18, type: 'cooking' }, // Chá de Leite
    9003: { tier: IMPERIAL_TIERS.PROFESSIONAL, qtyRequired: 18, type: 'cooking' }, // Omelete (exemplo) -> Wait

    9213: { tier: IMPERIAL_TIERS.GURU, qtyRequired: 18, type: 'cooking' }, // Refeição Especial de Valência
    9066: { tier: IMPERIAL_TIERS.GURU, qtyRequired: 24, type: 'cooking' }, // Refeição Especial de Balenos
    6354: { tier: IMPERIAL_TIERS.MASTER, qtyRequired: 15, type: 'cooking' }, // Refeição Especial de Serendia

    // === ALQUIMIA ===
    5005: { tier: IMPERIAL_TIERS.APPRENTICE, qtyRequired: 33, type: 'alchemy' }, // Reagente Líquido Limpo
    5006: { tier: IMPERIAL_TIERS.APPRENTICE, qtyRequired: 33, type: 'alchemy' }, // Pó Reagente Puro

    5001: { tier: IMPERIAL_TIERS.SKILLED, qtyRequired: 15, type: 'alchemy' }, // Sangue do Pecador
    5002: { tier: IMPERIAL_TIERS.SKILLED, qtyRequired: 15, type: 'alchemy' }, // Sangue de Tirano

    // ... we will dynamically fill more if needed, but these are seeds
};
