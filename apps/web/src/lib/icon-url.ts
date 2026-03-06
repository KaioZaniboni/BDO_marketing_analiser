const BDOLYTICS_ICON_CDN = 'https://cdn.bdolytics.com/img';

export function resolveBdoIconUrl(iconUrl?: string | null): string | null {
    if (!iconUrl) {
        return null;
    }

    if (/^https?:\/\//i.test(iconUrl)) {
        return iconUrl;
    }

    const sanitizedPath = iconUrl.replace(/^\/+/, '');
    if (!sanitizedPath) {
        return null;
    }

    const normalizedPath = sanitizedPath.toLowerCase();
    const withExtension = /\.[a-z0-9]+$/i.test(normalizedPath)
        ? normalizedPath
        : `${normalizedPath}.webp`;

    return `${BDOLYTICS_ICON_CDN}/${withExtension}`;
}
