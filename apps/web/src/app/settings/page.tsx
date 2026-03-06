'use client';

import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <SettingsIcon size={24} />
                    Configurações da Conta
                </h1>
                <p className="text-sm text-secondary">
                    Ajuste seus bônus, maestria e pacotes para que a calculadora fiscal seja 100% precisa.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Packotes e Buffs */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-primary mb-6">Taxas e Bônus</h2>

                    <div className="space-y-6">
                        {/* Value Pack */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm text-primary">Pacote Econômico (Value Pack)</p>
                                <p className="text-xs text-secondary mt-1">Reduz a taxa do mercado em 30%</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-bg-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                            </label>
                        </div>

                        {/* Merchant Ring */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm text-primary">Anel de Mercador</p>
                                <p className="text-xs text-secondary mt-1">Adiciona +5% de receita nas vendas</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-bg-hover peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                            </label>
                        </div>

                        {/* Family Fame */}
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Fama de Família</label>
                            <input
                                type="number"
                                defaultValue={1500}
                                className="w-full bg-bg-primary border border-border rounded-md px-3 py-2 focus:outline-none focus:border-gold font-mono"
                            />
                            <p className="text-[10px] text-muted mt-2">Dá bônus percentual na coleta de market a depender da bracket.</p>
                        </div>
                    </div>
                </div>

                {/* Maestria de LifeSkill */}
                <div className="card p-6 opacity-75">
                    <h2 className="text-lg font-semibold text-primary mb-6">Maestria de Profissão (Em breve)</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Culinária (Cooking)</label>
                            <input
                                disabled
                                type="number"
                                placeholder="Ex: 800"
                                className="w-full bg-bg-primary/50 border border-border rounded-md px-3 py-2 font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Alquimia (Alchemy)</label>
                            <input
                                disabled
                                type="number"
                                placeholder="Ex: 400"
                                className="w-full bg-bg-primary/50 border border-border rounded-md px-3 py-2 font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button className="bg-gold text-bg-primary px-6 py-2 rounded-md font-bold flex items-center gap-2 hover:bg-gold/90 transition-colors">
                    <Save size={18} />
                    Salvar Configurações
                </button>
            </div>
        </div>
    );
}
