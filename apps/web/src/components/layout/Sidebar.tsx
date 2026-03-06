'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    LayoutDashboard,
    ChefHat,
    FlaskConical,
    Hammer,
    Pickaxe,
    ShoppingCart,
    Package,
    Settings,
    Sword,
    ChevronDown,
    Calculator,
    Crown,
    Sparkles,
    MapPin,
} from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    {
        href: '/cooking',
        label: 'Culinária',
        icon: ChefHat,
        children: [
            { href: '/cooking', label: 'Calculadora de Mercado' },
            { href: '/cooking/imperial', label: 'Entrega Imperial' },
            { href: '/cooking/xp', label: 'XP de Culinária' },
            { href: '/cooking/cp', label: 'Pontos de Contribuição' },
        ],
    },
    {
        href: '/alchemy',
        label: 'Alquimia',
        icon: FlaskConical,
        children: [
            { href: '/alchemy', label: 'Calculadora de Mercado' },
            { href: '/alchemy/imperial', label: 'Entrega Imperial' },
            { href: '/alchemy/xp', label: 'XP de Alquimia' },
        ],
    },
    {
        href: '/processing',
        label: 'Processamento',
        icon: Hammer,
        children: [
            { href: '/processing', label: 'Calculadora de Mercado' },
        ],
    },
    { href: '/market', label: 'Mercado', icon: ShoppingCart },
    { href: '/inventory', label: 'Inventário', icon: Package },
    { href: '/settings', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const [expandedSections, setExpandedSections] = useState<string[]>(() => {
        // Auto-expand a seção ativa na primeira renderização
        for (const item of navItems) {
            if (item.children && pathname.startsWith(item.href)) {
                return [item.href];
            }
        }
        return [];
    });

    const toggleSection = (href: string) => {
        setExpandedSections((prev) =>
            prev.includes(href)
                ? prev.filter((h) => h !== href)
                : [...prev, href]
        );
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div style={{
                padding: '20px 16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            }}>
                <Sword size={28} style={{ color: 'var(--color-gold)' }} />
                <div>
                    <h1 style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: 'var(--color-gold)',
                        lineHeight: 1.2,
                    }}>
                        BDO Market
                    </h1>
                    <span style={{
                        fontSize: '0.7rem',
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                    }}>
                        Analyzer SA
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ padding: '12px 0', flex: 1, overflowY: 'auto' }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const hasChildren = !!item.children;
                    const isExpanded = expandedSections.includes(item.href);
                    const isActive = hasChildren
                        ? pathname.startsWith(item.href)
                        : pathname === item.href;

                    return (
                        <div key={item.href}>
                            {/* Item principal */}
                            {hasChildren ? (
                                <button
                                    onClick={() => toggleSection(item.href)}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                    style={{ width: '100%', justifyContent: 'space-between' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Icon size={20} />
                                        {item.label}
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        style={{
                                            transition: 'transform 0.2s ease',
                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            opacity: 0.5,
                                        }}
                                    />
                                </button>
                            ) : (
                                <Link
                                    href={item.href}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                >
                                    <Icon size={20} />
                                    {item.label}
                                </Link>
                            )}

                            {/* Sub-itens */}
                            {hasChildren && isExpanded && (
                                <div style={{
                                    overflow: 'hidden',
                                    paddingLeft: '16px',
                                    borderLeft: '2px solid var(--color-border)',
                                    marginLeft: '24px',
                                    marginTop: '2px',
                                    marginBottom: '4px',
                                }}>
                                    {item.children!.map((child) => {
                                        const childActive = pathname === child.href;
                                        return (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                className={`sidebar-link ${childActive ? 'active' : ''}`}
                                                style={{
                                                    fontSize: '0.82rem',
                                                    padding: '8px 12px',
                                                }}
                                            >
                                                {child.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid var(--color-border)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
            }}>
                Servidor SA • v0.2.0
            </div>
        </aside>
    );
}
