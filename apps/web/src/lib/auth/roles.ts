export const APP_ROLES = {
    USER: 'USER',
    ADMIN: 'ADMIN',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export function isAdminRole(role?: AppRole | null) {
    return role === APP_ROLES.ADMIN;
}