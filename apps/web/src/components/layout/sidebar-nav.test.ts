import { describe, expect, it } from 'vitest';
import { APP_ROLES } from '@/lib/auth/roles';
import { getSidebarNavItems } from './sidebar-nav';

describe('getSidebarNavItems', () => {
    it('expõe Curadoria apenas para admin', () => {
        expect(getSidebarNavItems().some((item) => item.href === '/operations/recipe-curation')).toBe(false);
        expect(getSidebarNavItems(APP_ROLES.USER).some((item) => item.href === '/operations/recipe-curation')).toBe(false);
        expect(getSidebarNavItems(APP_ROLES.ADMIN).some((item) => item.href === '/operations/recipe-curation')).toBe(true);
    });
});