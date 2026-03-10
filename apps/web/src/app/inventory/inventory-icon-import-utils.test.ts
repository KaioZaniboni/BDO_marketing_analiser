import { describe, expect, it } from 'vitest';
import {
    chooseBestInventoryGridEvaluation,
    parseInventoryVisualQuantity,
    parseInventoryVisualQuantityText,
    rankInventoryIconCandidates,
    scoreInventoryGridEvaluation,
} from './inventory-icon-import-utils';

describe('inventory icon import utils', () => {
    it('converte quantidades abreviadas da V2', () => {
        expect(parseInventoryVisualQuantity('224.6k')).toBe(224600);
        expect(parseInventoryVisualQuantity('1,2m')).toBe(1200000);
        expect(parseInventoryVisualQuantity('x 450')).toBe(450);
        expect(parseInventoryVisualQuantity('')).toBeNull();
    });

    it('extrai quantidades do OCR bruto da folha consolidada', () => {
        expect(parseInventoryVisualQuantityText('224.6k\n379.9k\n115.0k', 3)).toEqual([
            224600,
            379900,
            115000,
        ]);

        expect(parseInventoryVisualQuantityText('224.6k 379.9k', 3)).toEqual([
            224600,
            379900,
            1,
        ]);
    });

    it('prioriza o catálogo visual pelo score calculado', () => {
        const slotFingerprint = {
            values: [1, 0, 0],
            brightness: 0.3,
            saturation: 0.4,
            contrast: 0.2,
        };

        const ranked = rankInventoryIconCandidates(slotFingerprint, [
            {
                id: 2,
                name: 'Leite',
                iconUrl: '/icons/leite.webp',
                grade: 0,
                fingerprint: {
                    values: [0.6, 0.4, 0],
                    brightness: 0.35,
                    saturation: 0.42,
                    contrast: 0.22,
                },
            },
            {
                id: 1,
                name: 'Açúcar',
                iconUrl: '/icons/acucar.webp',
                grade: 1,
                fingerprint: {
                    values: [1, 0, 0],
                    brightness: 0.3,
                    saturation: 0.4,
                    contrast: 0.2,
                },
            },
        ]);

        expect(ranked.map((candidate) => candidate.id)).toEqual([1, 2]);
        expect(ranked[0]?.score ?? 0).toBeGreaterThan(ranked[1]?.score ?? 0);
    });

    it('prioriza layouts de grade com mais ocupação e sinal mais forte', () => {
        const scoreSparse = scoreInventoryGridEvaluation({
            occupiedCount: 3,
            totalSlots: 80,
            averageOccupancy: 0.21,
            averageTopOccupancy: 0.25,
        });

        const scorePanel = scoreInventoryGridEvaluation({
            occupiedCount: 52,
            totalSlots: 80,
            averageOccupancy: 0.29,
            averageTopOccupancy: 0.34,
        });

        expect(scorePanel).toBeGreaterThan(scoreSparse);
    });

    it('escolhe automaticamente o melhor layout candidato', () => {
        const best = chooseBestInventoryGridEvaluation([
            {
                presetName: 'game-right-panel',
                occupiedCount: 11,
                totalSlots: 72,
                averageOccupancy: 0.16,
                averageTopOccupancy: 0.19,
            },
            {
                presetName: 'panel-cropped',
                occupiedCount: 57,
                totalSlots: 80,
                averageOccupancy: 0.28,
                averageTopOccupancy: 0.33,
            },
        ]);

        expect(best?.presetName).toBe('panel-cropped');
    });
});