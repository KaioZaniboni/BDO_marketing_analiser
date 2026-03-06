'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';

// CP necessário por nível (simplificado — escala logarítmica)
const CP_TABLE = Array.from({ length: 400 }, (_, i) => {
    const level = i + 1;
    // Fórmula aproximada do BDO
    if (level <= 100) return { level, xpRequired: level * 50 };
    if (level <= 200) return { level, xpRequired: level * 150 };
    if (level <= 300) return { level, xpRequired: level * 500 };
    return { level, xpRequired: level * 1500 };
});

export default function CookingCpPage() {
    const [currentCp, setCurrentCp] = useState(300);
    const [targetCp, setTargetCp] = useState(350);

    // CP XP que cada sub-produto dá (Prato com Textura Peculiar → 1 CP XP via troca, byproduct → ~2 CP XP via entrega)
    const cpXpPerByproduct = 2;

    const xpNeeded = CP_TABLE
        .filter(c => c.level > currentCp && c.level <= targetCp)
        .reduce((sum, c) => sum + c.xpRequired, 0);

    const byproductsNeeded = Math.ceil(xpNeeded / cpXpPerByproduct);

    // Estimativa: ~1 byproduct a cada 3 crafts (média BDO)
    const craftsNeeded = Math.ceil(byproductsNeeded * 3);

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <MapPin size={24} className="text-gold" />
                    Calculadora de Pontos de Contribuição
                </h1>
                <p className="text-sm text-secondary mt-1">
                    Calcule quantos subprodutos de cooking são necessários para alcançar seu CP alvo.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6">
                    <h2 className="font-semibold text-primary mb-4">Configuração</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-secondary mb-1">CP Atual</label>
                            <input
                                type="number"
                                value={currentCp}
                                onChange={e => setCurrentCp(parseInt(e.target.value) || 0)}
                                className="w-full bg-bg-hover border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-secondary mb-1">CP Meta</label>
                            <input
                                type="number"
                                value={targetCp}
                                onChange={e => setTargetCp(parseInt(e.target.value) || 0)}
                                className="w-full bg-bg-hover border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold"
                            />
                        </div>
                    </div>
                </div>

                <div className="card p-6 border-gold/20">
                    <h2 className="font-semibold text-gold mb-4">Resultado</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] uppercase text-secondary tracking-wider mb-1">CP XP Necessário</p>
                            <p className="font-mono font-bold text-xl text-primary">{xpNeeded.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-secondary tracking-wider mb-1">Subprodutos Necessários</p>
                            <p className="font-mono font-bold text-xl text-gold">{byproductsNeeded.toLocaleString('pt-BR')}</p>
                            <p className="text-[10px] text-muted mt-1">Prato c/ Textura Peculiar, Ingrediente Sombrio, etc.</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase text-secondary tracking-wider mb-1">Crafts Estimados (~1 drop a cada 3)</p>
                            <p className="font-mono font-bold text-xl text-info">{craftsNeeded.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
