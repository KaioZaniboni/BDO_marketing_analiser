import {
    ChefHat,
    FlaskConical,
    Hammer,
    LayoutDashboard,
    Package,
    Settings,
    ShoppingCart,
    Sparkles,
} from 'lucide-react';
import { APP_ROLES, type AppRole } from '@/lib/auth/roles';

export interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    children?: { href: string; label: string }[];
    adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
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
        children: [{ href: '/processing', label: 'Calculadora de Mercado' }],
    },
    { href: '/market', label: 'Mercado', icon: ShoppingCart },
    { href: '/inventory', label: 'Inventário', icon: Package },
    { href: '/operations/recipe-curation', label: 'Curadoria', icon: Sparkles, adminOnly: true },
    { href: '/settings', label: 'Configurações', icon: Settings },
];

export function getSidebarNavItems(role?: AppRole | null) {
    return NAV_ITEMS.filter((item) => !item.adminOnly || role === APP_ROLES.ADMIN);
}