'use client';

import { Package2, Scale, TreePine, type LucideIcon } from 'lucide-react';

export type DetailTab = 'overview' | 'analytics' | 'weight';

const DETAIL_TABS: Array<{ id: DetailTab; label: string; icon: LucideIcon }> = [
    { id: 'overview', label: 'Entrada & saída', icon: Package2 },
    { id: 'analytics', label: 'Análise', icon: TreePine },
    { id: 'weight', label: 'Peso', icon: Scale },
];

export function DetailTabsHeader({
    activeTab,
    onChange,
}: {
    activeTab: DetailTab;
    onChange: (tab: DetailTab) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-hover/20 p-3">
            {DETAIL_TABS.map(({ id, label, icon: TabIcon }) => (
                <button
                    key={id}
                    type="button"
                    data-tab={id}
                    aria-pressed={activeTab === id}
                    onClick={() => onChange(id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${activeTab === id
                        ? 'bg-gold/10 text-gold'
                        : 'text-secondary hover:text-primary'
                        }`}
                >
                    <TabIcon size={15} />
                    {label}
                </button>
            ))}
        </div>
    );
}