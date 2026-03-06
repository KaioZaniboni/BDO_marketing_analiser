import { describe, expect, it } from 'vitest';
import { resolveBdoIconUrl } from '@/lib/icon-url';

describe('resolveBdoIconUrl', () => {
    it('returns null for empty values', () => {
        expect(resolveBdoIconUrl(null)).toBeNull();
        expect(resolveBdoIconUrl(undefined)).toBeNull();
        expect(resolveBdoIconUrl('')).toBeNull();
    });

    it('keeps absolute URLs unchanged', () => {
        const iconUrl = 'https://cdn.example.com/icons/item.webp';

        expect(resolveBdoIconUrl(iconUrl)).toBe(iconUrl);
    });

    it('normalizes relative BDO icon paths to the BDOLytics CDN', () => {
        expect(resolveBdoIconUrl('New_Icon/03_ETC/08_Potion/00000504')).toBe(
            'https://cdn.bdolytics.com/img/new_icon/03_etc/08_potion/00000504.webp',
        );
    });
});
