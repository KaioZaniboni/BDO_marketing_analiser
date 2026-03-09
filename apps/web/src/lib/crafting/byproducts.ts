export interface ByproductOption {
    value: number;
    label: string;
}

export const COOKING_BYPRODUCT_OPTIONS: ByproductOption[] = [
    { value: 9065, label: 'Leite' },
    { value: 9061, label: 'Creme' },
    { value: 9062, label: 'Queijo' },
    { value: 9213, label: 'Cerveja' },
    { value: 9063, label: 'Manteiga' },
    { value: 9780, label: 'Iguaria da Bruxa' },
];

export const ALCHEMY_BYPRODUCT_OPTIONS: ByproductOption[] = [
    { value: 4801, label: 'Po de Escuridao' },
    { value: 4802, label: 'Po de Chama' },
    { value: 4803, label: 'Po de Rachadura' },
    { value: 4804, label: 'Po da Terra' },
    { value: 4805, label: 'Po do Tempo' },
    { value: 5301, label: 'Reagente Liquido Limpo' },
    { value: 9733, label: 'Po Brilhante' },
    { value: 9781, label: 'Catalisador Misterioso' },
];

export const BYPRODUCT_ITEM_LABELS: Record<number, string> = Object.fromEntries(
    [...COOKING_BYPRODUCT_OPTIONS, ...ALCHEMY_BYPRODUCT_OPTIONS].map((option) => [option.value, option.label]),
);
