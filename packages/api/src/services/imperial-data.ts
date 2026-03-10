import type { ImperialRecipeMappingEntry, ImperialTier, ImperialTierKey, ImperialType } from '../types';
export { getImperialBonus } from './imperial-mastery';

export const IMPERIAL_TIERS: Record<ImperialTierKey, ImperialTier> = {
    APPRENTICE: { key: 'APPRENTICE', name: 'Aprendiz', basePrice: 52_000, sortOrder: 1 },
    SKILLED: { key: 'SKILLED', name: 'Habilidoso', basePrice: 80_000, sortOrder: 2 },
    PROFESSIONAL: { key: 'PROFESSIONAL', name: 'Profissional', basePrice: 120_000, sortOrder: 3 },
    ARTISAN: { key: 'ARTISAN', name: 'Artesão', basePrice: 160_000, sortOrder: 4 },
    MASTER: { key: 'MASTER', name: 'Mestre', basePrice: 220_000, sortOrder: 5 },
    GURU: { key: 'GURU', name: 'Guru', basePrice: 320_000, sortOrder: 6 },
};

function getImperialBoxName(type: ImperialType, tierKey: ImperialTierKey): string {
    const typeLabel = type === 'cooking' ? 'Culinária' : 'Alquimia';
    return `Caixa Imperial de ${typeLabel} - ${IMPERIAL_TIERS[tierKey].name}`;
}

function createImperialEntry(
    resultItemId: number,
    type: ImperialType,
    tierKey: ImperialTierKey,
    qtyRequired: number,
): ImperialRecipeMappingEntry {
    return {
        resultItemId,
        type,
        tierKey,
        tier: IMPERIAL_TIERS[tierKey],
        qtyRequired,
        boxName: getImperialBoxName(type, tierKey),
    };
}

const COOKING_IMPERIAL_RECIPES: ImperialRecipeMappingEntry[] = [
    // Guru
    createImperialEntry(9632, 'cooking', 'GURU', 27), // Refeicao Especial de Arehaza
    createImperialEntry(9639, 'cooking', 'GURU', 5), // Refeicao de O'dyllita Especial
    createImperialEntry(9606, 'cooking', 'GURU', 6), // Refeicao Especial de Calpheon
    createImperialEntry(9609, 'cooking', 'GURU', 18), // Refeicao de Valencia
    createImperialEntry(9610, 'cooking', 'GURU', 6), // Refeicao de Valencia Especial
    createImperialEntry(9605, 'cooking', 'GURU', 18), // Refeicao de Calpheon
    createImperialEntry(9638, 'cooking', 'GURU', 15), // Refeicao de O'dyllita
    createImperialEntry(9608, 'cooking', 'GURU', 5), // Refeicao de Mediah Especial
    createImperialEntry(9480, 'cooking', 'GURU', 4), // Molusco Cozido Enorme
    createImperialEntry(9604, 'cooking', 'GURU', 7), // Refeicao Especial de Serendia
    createImperialEntry(9478, 'cooking', 'GURU', 7), // Lagosta Assada em Manteiga Amarelada
    createImperialEntry(9607, 'cooking', 'GURU', 15), // Refeicao de Mediah
    createImperialEntry(9602, 'cooking', 'GURU', 8), // Refeicao Especial de Balenos
    createImperialEntry(9601, 'cooking', 'GURU', 24), // Refeicao de Balenos
    createImperialEntry(9603, 'cooking', 'GURU', 21), // Refeicao de Serendia

    // Mestre
    createImperialEntry(9298, 'cooking', 'MASTER', 9), // Pratos Abundante de Acompanhamentos
    createImperialEntry(9289, 'cooking', 'MASTER', 6), // Biscoito de Colmeia Crocante
    createImperialEntry(9319, 'cooking', 'MASTER', 6), // Samambaia Frita Bem Gostosa
    createImperialEntry(9329, 'cooking', 'MASTER', 21), // Cha com Leite de Delotia
    createImperialEntry(9277, 'cooking', 'MASTER', 6), // Cha com Leite Suave
    createImperialEntry(9487, 'cooking', 'MASTER', 5), // Holmick de Caldo Grosso
    createImperialEntry(9330, 'cooking', 'MASTER', 7), // Cha com Leite Aromatico de Delotia
    createImperialEntry(9290, 'cooking', 'MASTER', 5), // Sanduiche de Presunto Alta Qualidade
    createImperialEntry(9334, 'cooking', 'MASTER', 6), // Refogado de Carne e Samambaia Leve
    createImperialEntry(9338, 'cooking', 'MASTER', 7), // Sanduiche Frank de Alta Qualidade
    createImperialEntry(9432, 'cooking', 'MASTER', 6), // Carne Frita Especial
    createImperialEntry(9326, 'cooking', 'MASTER', 6), // Pudim Vermelhor de Delotia
    createImperialEntry(9435, 'cooking', 'MASTER', 6), // Salada de Carne de Qualidade Superior
    createImperialEntry(9438, 'cooking', 'MASTER', 6), // Croquete de Carne Crocante
    createImperialEntry(9266, 'cooking', 'MASTER', 18), // Biscoito de Colmeia
    createImperialEntry(9464, 'cooking', 'MASTER', 5), // Hamburguer Grande do Rei da Selva
    createImperialEntry(9491, 'cooking', 'MASTER', 6), // Espetinho de Queijo de Lhama Apimentado
    createImperialEntry(9282, 'cooking', 'MASTER', 6), // Queijo Gratin Gostoso
    createImperialEntry(820820, 'cooking', 'MASTER', 6), // Ensopado de Pasta de Soja Saboroso
    createImperialEntry(9263, 'cooking', 'MASTER', 18), // Cha com Leite
    createImperialEntry(820830, 'cooking', 'MASTER', 5), // Sanjeok Macio
    createImperialEntry(9296, 'cooking', 'MASTER', 6), // Cha Sute Saudavel
    createImperialEntry(9443, 'cooking', 'MASTER', 5), // Sanduiche de Carne de Alta Qualidade
    createImperialEntry(9460, 'cooking', 'MASTER', 6), // Salada de Cacador Fresca
    createImperialEntry(820802, 'cooking', 'MASTER', 7), // Kimchi Branco Refrescante
    createImperialEntry(820801, 'cooking', 'MASTER', 21), // Kimchi Branco
    createImperialEntry(9337, 'cooking', 'MASTER', 21), // Sanduiche Frank
    createImperialEntry(820805, 'cooking', 'MASTER', 24), // Dongchimi
    createImperialEntry(9318, 'cooking', 'MASTER', 18), // Samambaia Frita
    createImperialEntry(9209, 'cooking', 'MASTER', 27), // Acompanhamentos Variados
    createImperialEntry(9267, 'cooking', 'MASTER', 15), // Sanduiche de Presunto

    // Artesao
    createImperialEntry(9444, 'cooking', 'ARTISAN', 5), // Macarrao com Carne Limpa
    createImperialEntry(9416, 'cooking', 'ARTISAN', 15), // Macarrao com Carne
    createImperialEntry(9324, 'cooking', 'ARTISAN', 6), // Tartar de Delotia de Luxo
    createImperialEntry(9424, 'cooking', 'ARTISAN', 18), // Sopa de Carne
    createImperialEntry(9430, 'cooking', 'ARTISAN', 5), // Bife Suculento
    createImperialEntry(9273, 'cooking', 'ARTISAN', 5), // Torta de Queijo de Alta Qualidade
    createImperialEntry(9312, 'cooking', 'ARTISAN', 12), // Peixe Coco Frito Crocante
    createImperialEntry(9310, 'cooking', 'ARTISAN', 18), // Coquetel de Coco Gelado
    createImperialEntry(820812, 'cooking', 'ARTISAN', 7), // Mexido de Broto de Feijao Crocante
    createImperialEntry(9452, 'cooking', 'ARTISAN', 5), // Borscht Perfumado
    createImperialEntry(9276, 'cooking', 'ARTISAN', 5), // Aveia Refinada
    createImperialEntry(9311, 'cooking', 'ARTISAN', 7), // Macarrao de Coco Delicioso
    createImperialEntry(820822, 'cooking', 'ARTISAN', 5), // Nokdujeon Crocante
    createImperialEntry(9451, 'cooking', 'ARTISAN', 5), // Kebab de Lagarto Delicioso
    createImperialEntry(9307, 'cooking', 'ARTISAN', 54), // Coquetel de Coco
    createImperialEntry(9431, 'cooking', 'ARTISAN', 5), // Linguica Defumada
    createImperialEntry(9303, 'cooking', 'ARTISAN', 6), // Sanduiche Teff Apimentado
    createImperialEntry(9323, 'cooking', 'ARTISAN', 18), // Tartar de Delotia
    createImperialEntry(9406, 'cooking', 'ARTISAN', 15), // Kebab de Lagarto
    createImperialEntry(820811, 'cooking', 'ARTISAN', 21), // Mexido de Broto de Feijao
    createImperialEntry(9268, 'cooking', 'ARTISAN', 15), // Torta de Queijo
    createImperialEntry(9434, 'cooking', 'ARTISAN', 6), // Sopa de Carne Especial
    createImperialEntry(9408, 'cooking', 'ARTISAN', 15), // Borscht
    createImperialEntry(9309, 'cooking', 'ARTISAN', 36), // Peixe Coco Frito
    createImperialEntry(820824, 'cooking', 'ARTISAN', 12), // Memil-Muk Suave

    // Profissional
    createImperialEntry(9449, 'cooking', 'PROFESSIONAL', 8), // Salada de Filet de Peixes Fresco
    createImperialEntry(9442, 'cooking', 'PROFESSIONAL', 6), // Ensopado de Carne Forte
    createImperialEntry(9274, 'cooking', 'PROFESSIONAL', 5), // Pudim de Fruta Especial
    createImperialEntry(820816, 'cooking', 'PROFESSIONAL', 5), // Arroz no Vapor
    createImperialEntry(9259, 'cooking', 'PROFESSIONAL', 15), // Pudim de Fruta
    createImperialEntry(9281, 'cooking', 'PROFESSIONAL', 6), // Legume em Conserva Doce e Azedo
    createImperialEntry(9423, 'cooking', 'PROFESSIONAL', 24), // Salada da Filet de Peixe
    createImperialEntry(9437, 'cooking', 'PROFESSIONAL', 8), // Passaro Recem-Frito
    createImperialEntry(820815, 'cooking', 'PROFESSIONAL', 15), // Arroz Cozido
    createImperialEntry(9287, 'cooking', 'PROFESSIONAL', 8), // Torta da Fruta Doce
    createImperialEntry(9410, 'cooking', 'PROFESSIONAL', 18), // Bolinho do Deserto
    createImperialEntry(9264, 'cooking', 'PROFESSIONAL', 24), // Torta de Fruta
    createImperialEntry(9202, 'cooking', 'PROFESSIONAL', 18), // Legumes Em Conserva
    createImperialEntry(9288, 'cooking', 'PROFESSIONAL', 7), // Torta de Carne Deliciosa
    createImperialEntry(9420, 'cooking', 'PROFESSIONAL', 21), // Frutos do Mar Frito
    createImperialEntry(9447, 'cooking', 'PROFESSIONAL', 7), // Frutos do Mar Frito Especial
    createImperialEntry(9453, 'cooking', 'PROFESSIONAL', 6), // Bolinho Deserto Gostoso
    createImperialEntry(820826, 'cooking', 'PROFESSIONAL', 5), // Mingau de Feijao Vermelho com Bolinhos de Arroz
    createImperialEntry(9293, 'cooking', 'PROFESSIONAL', 6), // Iogurte de Aloes Forte
];

const ALCHEMY_IMPERIAL_RECIPES: ImperialRecipeMappingEntry[] = [
    // Guru
    createImperialEntry(673, 'alchemy', 'GURU', 2), // Elixir do Frenesi Infinito
    createImperialEntry(687, 'alchemy', 'GURU', 2), // Elixir de Morte Brutal
    createImperialEntry(1409, 'alchemy', 'GURU', 6), // Elixir de Edania
    createImperialEntry(686, 'alchemy', 'GURU', 6), // Elixir da Morte
    createImperialEntry(741, 'alchemy', 'GURU', 2), // Elixir de Grifo Poderoso
    createImperialEntry(721, 'alchemy', 'GURU', 2), // Elixir do Ceu Impiedoso
    createImperialEntry(672, 'alchemy', 'GURU', 6), // Elixir do Frenesi
    createImperialEntry(713, 'alchemy', 'GURU', 2), // Elixir de Ceifador de Alma
    createImperialEntry(740, 'alchemy', 'GURU', 6), // Elixir de Grifo
    createImperialEntry(720, 'alchemy', 'GURU', 6), // Elixir do Ceu
    createImperialEntry(1410, 'alchemy', 'GURU', 2), // Elixir de Edania Poderoso
    createImperialEntry(712, 'alchemy', 'GURU', 6), // Elixir do Ceifador
    createImperialEntry(699, 'alchemy', 'GURU', 2), // Elixir de Deteccao Afiada
    createImperialEntry(698, 'alchemy', 'GURU', 6), // Elixir de Deteccao

    // Mestre
    createImperialEntry(1185, 'alchemy', 'MASTER', 2), // Elixir da Persistencia Continua
    createImperialEntry(1189, 'alchemy', 'MASTER', 2), // Elixir da Forca Fisica Honesto
    createImperialEntry(1154, 'alchemy', 'MASTER', 2), // Elixir da Habilidade Infinita
    createImperialEntry(783, 'alchemy', 'MASTER', 3), // Elixir de Espiral Brilhante
    createImperialEntry(1152, 'alchemy', 'MASTER', 6), // Elixir da Habilidade
    createImperialEntry(681, 'alchemy', 'MASTER', 2), // Elixir de Perfuracao Brutal
    createImperialEntry(685, 'alchemy', 'MASTER', 8), // Elixir das Asas Ascendentes
    createImperialEntry(1188, 'alchemy', 'MASTER', 6), // Elixir da Forca Fisica
    createImperialEntry(782, 'alchemy', 'MASTER', 9), // Elixir de Espiral
    createImperialEntry(1184, 'alchemy', 'MASTER', 6), // Elixir da Persistencia
    createImperialEntry(680, 'alchemy', 'MASTER', 6), // Elixir de Perfuracao
    createImperialEntry(675, 'alchemy', 'MASTER', 3), // Elixir de Gloriosa Mao Dourada
    createImperialEntry(684, 'alchemy', 'MASTER', 24), // Elixir das Asas
    createImperialEntry(718, 'alchemy', 'MASTER', 6), // Elixir de Carnificina
    createImperialEntry(719, 'alchemy', 'MASTER', 2), // Elixir de Carnificina Brutal
    createImperialEntry(1181, 'alchemy', 'MASTER', 2), // Elixir da Destruicao Fatal
    createImperialEntry(1180, 'alchemy', 'MASTER', 6), // Elixir da Destruicao
    createImperialEntry(674, 'alchemy', 'MASTER', 9), // Elixir de Mao Dourada
    createImperialEntry(696, 'alchemy', 'MASTER', 12), // Elixir de Assassinato
    createImperialEntry(1158, 'alchemy', 'MASTER', 2), // Elixir da Maestria Aprimorado
    createImperialEntry(697, 'alchemy', 'MASTER', 4), // Elixir de Assassino Letal
    createImperialEntry(761, 'alchemy', 'MASTER', 9), // Reagente de Marcacao
    createImperialEntry(1155, 'alchemy', 'MASTER', 6), // Elixir da Maestria

    // Artesao
    createImperialEntry(778, 'alchemy', 'ARTISAN', 3), // Elixir de Espirito Looney Poderoso
    createImperialEntry(693, 'alchemy', 'ARTISAN', 4), // Elixir de Feitico Agil
    createImperialEntry(777, 'alchemy', 'ARTISAN', 9), // Elixir de Espirito Looney
    createImperialEntry(701, 'alchemy', 'ARTISAN', 8), // Elixir de Concentracao Avancada
    createImperialEntry(1156, 'alchemy', 'ARTISAN', 15), // Elixir do Trabalho
    createImperialEntry(691, 'alchemy', 'ARTISAN', 4), // Elixir da Rapidez Intrepida
    createImperialEntry(664, 'alchemy', 'ARTISAN', 12), // Elixir de Amizade
    createImperialEntry(692, 'alchemy', 'ARTISAN', 12), // Elixir de Feitico
    createImperialEntry(690, 'alchemy', 'ARTISAN', 12), // Elixir de Rapidez
    createImperialEntry(665, 'alchemy', 'ARTISAN', 4), // Elixir de Melhoria de Amizade
    createImperialEntry(700, 'alchemy', 'ARTISAN', 24), // Elixir da Concentracao
    createImperialEntry(723, 'alchemy', 'ARTISAN', 7), // Elixir de Estamina Esmagadora
    createImperialEntry(722, 'alchemy', 'ARTISAN', 21), // Elixir de Estamina
    createImperialEntry(1159, 'alchemy', 'ARTISAN', 5), // Elixir do Trabalho Duro
    createImperialEntry(676, 'alchemy', 'ARTISAN', 15), // Elixir de Pilhagem

    // Profissional
    createImperialEntry(705, 'alchemy', 'PROFESSIONAL', 4), // Elixir da Furia Infinita
    createImperialEntry(727, 'alchemy', 'PROFESSIONAL', 4), // Elixir de Pescador Habilidoso
    createImperialEntry(753, 'alchemy', 'PROFESSIONAL', 12), // Elixir de Treinamento
    createImperialEntry(774, 'alchemy', 'PROFESSIONAL', 4), // Elixir de Espirito Weenie Afluente
    createImperialEntry(704, 'alchemy', 'PROFESSIONAL', 12), // Elixir de Furia
    createImperialEntry(717, 'alchemy', 'PROFESSIONAL', 4), // Elixir de Defesa de Aco
    createImperialEntry(750, 'alchemy', 'PROFESSIONAL', 4), // Elixir de Tempo Fluente
    createImperialEntry(773, 'alchemy', 'PROFESSIONAL', 12), // Elixir de Espirito Weenie
    createImperialEntry(688, 'alchemy', 'PROFESSIONAL', 12), // Elixir do Vento
    createImperialEntry(689, 'alchemy', 'PROFESSIONAL', 4), // Elixir do Vento Fluente
    createImperialEntry(754, 'alchemy', 'PROFESSIONAL', 4), // Elixir de Treinamento de Especialistas
    createImperialEntry(716, 'alchemy', 'PROFESSIONAL', 12), // Elixir da Defesa
    createImperialEntry(726, 'alchemy', 'PROFESSIONAL', 12), // Elixir de Pescador
    createImperialEntry(749, 'alchemy', 'PROFESSIONAL', 12), // Elixir do Tempo

    // Habilidoso
    createImperialEntry(725, 'alchemy', 'SKILLED', 7), // Elixir de Trabalhador Habilidoso
    createImperialEntry(707, 'alchemy', 'SKILLED', 3), // Elixir de Resistencia Afiada
    createImperialEntry(679, 'alchemy', 'SKILLED', 5), // Elixir de Caca a Humanoide Feroz
    createImperialEntry(706, 'alchemy', 'SKILLED', 9), // Elixir de Resistencia
    createImperialEntry(678, 'alchemy', 'SKILLED', 15), // Elixir de Caca a Humanoide
    createImperialEntry(670, 'alchemy', 'SKILLED', 15), // Elixir de Caca a Humano
    createImperialEntry(715, 'alchemy', 'SKILLED', 6), // Elixir de Experiencia Esplendida
    createImperialEntry(671, 'alchemy', 'SKILLED', 5), // Elixir Perfeito de Caca a Humano
    createImperialEntry(763, 'alchemy', 'SKILLED', 5), // Elixir de Choque Poderoso
    createImperialEntry(762, 'alchemy', 'SKILLED', 15), // Elixir de Choque

    // Aprendiz
    createImperialEntry(683, 'alchemy', 'APPRENTICE', 3), // Elixir de Energia Afluente
    createImperialEntry(711, 'alchemy', 'APPRENTICE', 4), // Elixir de Mentalidade Limpa
    createImperialEntry(695, 'alchemy', 'APPRENTICE', 3), // Elixir do Selo Agil
    createImperialEntry(669, 'alchemy', 'APPRENTICE', 6), // Elixir de Ressurreicao Poderosa
    createImperialEntry(703, 'alchemy', 'APPRENTICE', 3), // Elixir da Vontade Extraordinaria
    createImperialEntry(710, 'alchemy', 'APPRENTICE', 12), // Elixir de Mentalidade
    createImperialEntry(668, 'alchemy', 'APPRENTICE', 18), // Elixir de Ressurreicao
    createImperialEntry(708, 'alchemy', 'APPRENTICE', 9), // Elixir da HP
    createImperialEntry(709, 'alchemy', 'APPRENTICE', 3), // Elixir Poderoso de Vida
    createImperialEntry(694, 'alchemy', 'APPRENTICE', 9), // Elixir do Selo
    createImperialEntry(682, 'alchemy', 'APPRENTICE', 9), // Elixir da Energia
    createImperialEntry(702, 'alchemy', 'APPRENTICE', 9), // Elixir da Vontade
];

function assertImperialEntries(entries: ImperialRecipeMappingEntry[]): void {
    const seen = new Set<number>();

    for (const entry of entries) {
        if (seen.has(entry.resultItemId)) {
            throw new Error(`Item imperial duplicado no mapping: ${entry.resultItemId}`);
        }

        if (entry.qtyRequired <= 0) {
            throw new Error(`Quantidade imperial invalida para item ${entry.resultItemId}`);
        }

        if (!IMPERIAL_TIERS[entry.tierKey]) {
            throw new Error(`Tier imperial invalido para item ${entry.resultItemId}`);
        }

        seen.add(entry.resultItemId);
    }
}

export const IMPERIAL_RECIPE_ENTRIES = [
    ...COOKING_IMPERIAL_RECIPES,
    ...ALCHEMY_IMPERIAL_RECIPES,
] as const;

assertImperialEntries([...IMPERIAL_RECIPE_ENTRIES]);

export const IMPERIAL_RECIPES_MAPPING: Record<number, ImperialRecipeMappingEntry> = Object.freeze(
    Object.fromEntries(IMPERIAL_RECIPE_ENTRIES.map((entry) => [entry.resultItemId, entry])),
);

export function getImperialRecipeEntry(itemId: number | null | undefined): ImperialRecipeMappingEntry | null {
    if (itemId == null) {
        return null;
    }

    return IMPERIAL_RECIPES_MAPPING[itemId] ?? null;
}
