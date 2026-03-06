'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';

const XP_BUFFS = [
    { id: 'costume', label: 'Traje de Culinária (Canape/Venecia)', bonus: 0.15 },
    { id: 'food', label: 'Comida de XP (Sopa de Criâncio)', bonus: 0.10 },
    { id: 'scroll_life', label: 'Pergaminho de XP de Vida', bonus: 0.20 },
    { id: 'scroll_combat', label: 'Pergaminho 530%', bonus: 0.30 },
    { id: 'event', label: 'Evento Season / Bônus', bonus: 0.20 },
    { id: 'pet', label: 'Hedgehog / Pet de Life', bonus: 0.05 },
    { id: 'draught', label: 'Draught Verdure', bonus: 0.20 },
];

// Tabela simplificada de XP por nível (Cooking)
const LEVEL_XP: Record<string, number> = {
    'Aprendiz 1': 500, 'Aprendiz 2': 600, 'Aprendiz 3': 800, 'Aprendiz 4': 1000, 'Aprendiz 5': 1200,
    'Aprendiz 6': 1500, 'Aprendiz 7': 2000, 'Aprendiz 8': 2500, 'Aprendiz 9': 3000, 'Aprendiz 10': 4000,
    'Habilidoso 1': 5000, 'Habilidoso 2': 6000, 'Habilidoso 3': 8000, 'Habilidoso 4': 10000, 'Habilidoso 5': 12000,
    'Habilidoso 6': 15000, 'Habilidoso 7': 20000, 'Habilidoso 8': 25000, 'Habilidoso 9': 30000, 'Habilidoso 10': 40000,
    'Profissional 1': 50000, 'Profissional 2': 60000, 'Profissional 3': 80000, 'Profissional 4': 100000, 'Profissional 5': 120000,
    'Artesão 1': 200000, 'Artesão 2': 250000, 'Artesão 3': 300000, 'Artesão 4': 400000, 'Artesão 5': 500000,
    'Mestre 1': 1000000, 'Mestre 2': 1500000, 'Mestre 3': 2000000, 'Mestre 4': 3000000, 'Mestre 5': 5000000,
    'Guru 1': 10000000, 'Guru 5': 20000000, 'Guru 10': 50000000, 'Guru 20': 100000000, 'Guru 50': 500000000,
};

const levelKeys = Object.keys(LEVEL_XP);

export default function CookingXpPage() {
    const searchParams = useSearchParams();
    const initialXp = Number(searchParams.get('xp') ?? 400) || 400;
    const [currentLevel, setCurrentLevel] = useState('Profissional 1');
    const [targetLevel, setTargetLevel] = useState('Artesão 1');
    const [recipeXp, setRecipeXp] = useState(initialXp);
    const [activeBuffs, setActiveBuffs] = useState<Set<string>>(new Set());

    const toggleBuff = (id: string) => {
        setActiveBuffs(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const totalBuffBonus = XP_BUFFS
        .filter(b => activeBuffs.has(b.id))
        .reduce((sum, b) => sum + b.bonus, 0);

    const xpPerCraft = recipeXp * (1 + totalBuffBonus);

    const currentXp = LEVEL_XP[currentLevel] ?? 0;
    const targetXp = LEVEL_XP[targetLevel] ?? 0;
    const xpNeeded = Math.max(0, targetXp - currentXp);
    const craftsNeeded = xpPerCraft > 0 ? Math.ceil(xpNeeded / xpPerCraft) : 0;

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Sparkles size={24} className="text-gold" />
                    Calculadora de XP — Culinária
                </h1>
                <p className="text-sm text-secondary mt-1">
                    Descubra quantas produções precisa para ir de um nível a outro considerando seus buffs.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configuração de Nível */}
                <div className="card p-6">
                    <h2 className="font-semibold text-primary mb-4">Nível</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs text-secondary mb-1">Nível Atual</label>
                            <select
                                value={currentLevel}
                                onChange={e => setCurrentLevel(e.target.value)}
                                className="w-full bg-bg-hover border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
                            >
                                {levelKeys.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-secondary mb-1">Nível Meta</label>
                            <select
                                value={targetLevel}
                                onChange={e => setTargetLevel(e.target.value)}
                                className="w-full bg-bg-hover border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-gold"
                            >
                                {levelKeys.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-secondary mb-1">XP Base por Receita</label>
                            <input
                                type="number"
                                value={recipeXp}
                                onChange={e => setRecipeXp(parseInt(e.target.value) || 0)}
                                className="w-full bg-bg-hover border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-gold"
                            />
                        </div>
                    </div>
                </div>

                {/* Buffs */}
                <div className="card p-6">
                    <h2 className="font-semibold text-primary mb-4">Buffs Ativos</h2>
                    <div className="space-y-3">
                        {XP_BUFFS.map(buff => (
                            <label key={buff.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={activeBuffs.has(buff.id)}
                                    onChange={() => toggleBuff(buff.id)}
                                    className="accent-gold w-4 h-4"
                                />
                                <span className="text-sm text-primary group-hover:text-gold transition-colors flex-1">{buff.label}</span>
                                <span className="text-xs font-mono text-profit">+{(buff.bonus * 100).toFixed(0)}%</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Resultado */}
            <div className="card p-6 border-gold/20">
                <h2 className="font-semibold text-gold mb-4">Resultado do Cálculo</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-[10px] uppercase text-secondary tracking-wider mb-1">XP Necessário</p>
                        <p className="font-mono font-bold text-lg text-primary">{xpNeeded.toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase text-secondary tracking-wider mb-1">XP por Craft</p>
                        <p className="font-mono font-bold text-lg text-profit">{xpPerCraft.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase text-secondary tracking-wider mb-1">Bônus Total</p>
                        <p className="font-mono font-bold text-lg text-gold">+{(totalBuffBonus * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase text-secondary tracking-wider mb-1">Produções Necessárias</p>
                        <p className="font-mono font-bold text-2xl text-gold">{craftsNeeded.toLocaleString('pt-BR')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
