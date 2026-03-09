'use client';

import type { ReactNode } from 'react';
import {
    ChefHat,
    FlaskConical,
    Package2,
    Receipt,
    RotateCcw,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';
import {
    ALCHEMY_BYPRODUCT_OPTIONS,
    COOKING_BYPRODUCT_OPTIONS,
} from '@/lib/crafting/byproducts';
import type { GlobalSettings } from '@/stores/global-settings-store';

interface Option {
    value: number;
    label: string;
}

interface SettingsSectionProps {
    title: string;
    description: string;
    icon: LucideIcon;
    compact?: boolean;
    children: ReactNode;
}

interface ToggleFieldProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}

interface NumberFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    description?: string;
    step?: number;
    min?: number;
}

interface SelectFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    description?: string;
    options: Option[];
}

function formatPercent(value: number, fractionDigits = 2): string {
    return `${(value * 100).toLocaleString('pt-BR', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    })}%`;
}

function getNetSaleMultiplier(settings: Pick<GlobalSettings, 'hasValuePack' | 'hasMerchantRing' | 'familyFameBonus'>): number {
    return 0.65 + 0.65 * (
        (settings.hasValuePack ? 0.3 : 0) +
        (settings.hasMerchantRing ? 0.05 : 0) +
        settings.familyFameBonus
    );
}

function SettingsSection({ title, description, icon: Icon, compact = false, children }: SettingsSectionProps) {
    return (
        <section className={compact ? 'rounded-2xl border border-border bg-bg-primary/70 p-5' : 'card p-6'}>
            <div className="mb-5 flex items-start gap-3.5">
                <div className="rounded-xl bg-bg-hover p-2 text-gold">
                    <Icon size={16} />
                </div>
                <div>
                    <h2 className={compact ? 'text-sm font-semibold text-primary' : 'text-lg font-semibold text-primary'}>{title}</h2>
                    <p className="mt-1.5 text-xs leading-5 text-secondary">{description}</p>
                </div>
            </div>
            <div className="space-y-4">{children}</div>
        </section>
    );
}

function ToggleField({ label, description, checked, onChange }: ToggleFieldProps) {
    return (
        <label className="flex items-start justify-between gap-4 rounded-xl border border-border bg-bg-hover/20 px-4 py-4">
            <div className="space-y-1.5 pr-2">
                <p className="text-sm font-medium text-primary">{label}</p>
                <p className="text-xs leading-5 text-secondary">{description}</p>
            </div>
            <span className="relative mt-1 inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
                <span className="h-6 w-11 rounded-full bg-bg-primary transition-colors peer-checked:bg-gold peer-checked:after:translate-x-full after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-border after:bg-white after:transition-transform after:content-['']" />
            </span>
        </label>
    );
}

function NumberField({ label, value, onChange, description, step = 1, min = 0 }: NumberFieldProps) {
    return (
        <label className="flex flex-col gap-2 rounded-xl border border-border bg-bg-hover/20 px-4 py-4">
            <span className="text-sm font-medium text-primary">{label}</span>
            {description ? <span className="text-xs leading-5 text-secondary">{description}</span> : null}
            <input
                type="number"
                value={value}
                min={min}
                step={step}
                onChange={(event) => onChange(Number(event.target.value))}
                className="rounded-lg border border-border bg-bg-primary px-3 py-2.5 font-mono text-sm text-primary focus:border-gold focus:outline-none"
            />
        </label>
    );
}

function SelectField({ label, value, onChange, description, options }: SelectFieldProps) {
    return (
        <label className="flex flex-col gap-2 rounded-xl border border-border bg-bg-hover/20 px-4 py-4">
            <span className="text-sm font-medium text-primary">{label}</span>
            {description ? <span className="text-xs leading-5 text-secondary">{description}</span> : null}
            <select
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="rounded-lg border border-border bg-bg-primary px-3 py-2.5 text-sm text-primary focus:border-gold focus:outline-none"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function GlobalSettingsOverviewCard({ settings, onReset }: { settings: GlobalSettings; onReset: () => void }) {
    const netSaleMultiplier = getNetSaleMultiplier(settings);

    return (
        <section className="card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-primary">
                        <Sparkles size={18} className="text-gold" />
                        <h2 className="text-lg font-semibold">Salvamento automático</h2>
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-secondary">
                        Todas as alterações são persistidas automaticamente neste navegador e passam a valer nas telas de crafting, mercado e imperial.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onReset}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-gold hover:text-gold"
                >
                    <RotateCcw size={16} />
                    Restaurar padrões
                </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border bg-bg-hover/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Receita líquida</p>
                    <p className="mt-1 text-lg font-semibold text-profit">{formatPercent(netSaleMultiplier)}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg-hover/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Fama da família</p>
                    <p className="mt-1 text-lg font-semibold text-primary">{settings.familyFame.toLocaleString('pt-BR')}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg-hover/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Cooking rápido</p>
                    <p className="mt-1 text-lg font-semibold text-primary">{settings.speedCookingMastery}</p>
                </div>
                <div className="rounded-xl border border-border bg-bg-hover/20 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted">Tempo de alquimia</p>
                    <p className="mt-1 text-lg font-semibold text-primary">{settings.alchemyTimeSeconds.toFixed(1)}s</p>
                </div>
            </div>
        </section>
    );
}

export function GlobalSettingsMarketSection({ settings, compact = false }: { settings: GlobalSettings; compact?: boolean }) {
    return (
        <SettingsSection title="Taxas e mercado" description="Controle o multiplicador líquido usado no mercado SA e nos cálculos imperiais." icon={Receipt} compact={compact}>
            <ToggleField
                label="Pacote Econômico"
                description="Reduz a taxa base do mercado em 30%."
                checked={settings.hasValuePack}
                onChange={settings.setValuePack}
            />
            <ToggleField
                label="Anel de Mercador"
                description="Aplica bônus absoluto adicional de 5% na venda."
                checked={settings.hasMerchantRing}
                onChange={settings.setMerchantRing}
            />

            <div className={compact ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2'}>
                <NumberField
                    label="Fama da Família"
                    value={settings.familyFame}
                    onChange={settings.setFamilyFame}
                    description="Atualiza automaticamente o bônus aplicado no mercado."
                />
                <NumberField
                    label="Bônus da fama (%)"
                    value={Number((settings.familyFameBonus * 100).toFixed(3))}
                    onChange={(value) => settings.setFamilyFameBonus(value / 100)}
                    description="Máximo efetivo: 0,5%."
                    step={0.01}
                    min={0}
                />
            </div>
        </SettingsSection>
    );
}

export function GlobalSettingsInventorySection({ settings, compact = false }: { settings: GlobalSettings; compact?: boolean }) {
    return (
        <SettingsSection title="Peso e inventário" description="Usado para estimar quantos crafts cabem antes de estourar o limite de LT." icon={Package2} compact={compact}>
            <div className={compact ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2'}>
                <NumberField
                    label="Peso total (LT)"
                    value={settings.weight}
                    onChange={settings.setWeight}
                    description="Capacidade total disponível no personagem." 
                />
                <NumberField
                    label="Peso já usado (LT)"
                    value={settings.usedWeight}
                    onChange={settings.setUsedWeight}
                    description="Carga ocupada antes de iniciar o craft."
                />
            </div>
        </SettingsSection>
    );
}

export function GlobalSettingsCookingSection({ settings, compact = false }: { settings: GlobalSettings; compact?: boolean }) {
    return (
        <SettingsSection title="Cooking" description="Maestria, tempos e valorização de byproduct usados no cálculo detalhado e na imperial." icon={ChefHat} compact={compact}>
            <div className={compact ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2'}>
                <NumberField
                    label="Maestria rápida"
                    value={settings.speedCookingMastery}
                    onChange={settings.setSpeedCookingMastery}
                    description="Também alimenta a referência principal da Culinária Imperial."
                />
                <NumberField
                    label="Tempo rápido (s)"
                    value={settings.speedCookingTime}
                    onChange={settings.setSpeedCookingTime}
                    description="Tempo por ação do cook otimizado."
                    step={0.1}
                    min={0.1}
                />
                <NumberField
                    label="Maestria slow cook"
                    value={settings.slowCookingMastery}
                    onChange={settings.setSlowCookingMastery}
                    description="Usada quando o detalhe da receita está em modo slow cook."
                />
                <NumberField
                    label="Tempo slow cook (s)"
                    value={settings.slowCookingTime}
                    onChange={settings.setSlowCookingTime}
                    description="Tempo por ação no cenário conservador."
                    step={0.1}
                    min={0.1}
                />
            </div>
            <SelectField
                label="Item alvo do subproduto"
                value={settings.cookingByproductUsage}
                onChange={settings.setCookingByproductUsage}
                description="Escolhe qual troca de Witch's Delicacy será usada para valorar o byproduct."
                options={COOKING_BYPRODUCT_OPTIONS}
            />
        </SettingsSection>
    );
}

export function GlobalSettingsAlchemySection({ settings, compact = false }: { settings: GlobalSettings; compact?: boolean }) {
    return (
        <SettingsSection title="Alchemy" description="Maestria, tempo e troca de byproduct usados no cálculo detalhado e na imperial." icon={FlaskConical} compact={compact}>
            <div className={compact ? 'grid gap-4' : 'grid gap-4 md:grid-cols-2'}>
                <NumberField
                    label="Maestria de alquimia"
                    value={settings.alchemyMastery}
                    onChange={settings.setAlchemyMastery}
                    description="Também alimenta a Alquimia Imperial."
                />
                <NumberField
                    label="Tempo por craft (s)"
                    value={settings.alchemyTimeSeconds}
                    onChange={settings.setAlchemyTimeSeconds}
                    description="Tempo por ação usado no overview e no detalhe."
                    step={0.1}
                    min={0.1}
                />
            </div>
            <SelectField
                label="Item alvo do subproduto"
                value={settings.alchemyByproductUsage}
                onChange={settings.setAlchemyByproductUsage}
                description="Escolhe qual troca de Mysterious Catalyst será usada para valorar o byproduct."
                options={ALCHEMY_BYPRODUCT_OPTIONS}
            />
        </SettingsSection>
    );
}
