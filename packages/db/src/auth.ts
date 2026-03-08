import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const HASH_ALGORITHM = 'scrypt';
const SALT_LENGTH_BYTES = 16;
const KEY_LENGTH_BYTES = 64;

function deriveKey(password: string, salt: string) {
    return scryptSync(password, salt, KEY_LENGTH_BYTES).toString('hex');
}

export function hashPassword(password: string) {
    const normalizedPassword = password.trim();

    if (!normalizedPassword) {
        throw new Error('A senha não pode ser vazia.');
    }

    const salt = randomBytes(SALT_LENGTH_BYTES).toString('hex');
    const derivedKey = deriveKey(normalizedPassword, salt);
    return `${HASH_ALGORITHM}$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
    try {
        const normalizedPassword = password.trim();
        const [algorithm, salt, expectedHash] = storedHash.split('$');

        if (!normalizedPassword || algorithm !== HASH_ALGORITHM || !salt || !expectedHash) {
            return false;
        }

        const derivedBuffer = Buffer.from(deriveKey(normalizedPassword, salt), 'hex');
        const expectedBuffer = Buffer.from(expectedHash, 'hex');

        if (derivedBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return timingSafeEqual(derivedBuffer, expectedBuffer);
    } catch {
        return false;
    }
}