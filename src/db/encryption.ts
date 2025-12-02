import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;

// Get or generate master key
function getMasterKey(): string {
    const envKey = process.env.MASTER_KEY;
    
    if (envKey) {
        return envKey;
    }

    // Generate a new key on first run
    const newKey = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  No MASTER_KEY found in environment.');
    console.warn('🔑 Generated new key. Add this to your .env file:');
    console.warn(`MASTER_KEY=${newKey}`);
    console.warn('');
    
    return newKey;
}

const MASTER_KEY = getMasterKey();

/**
 * Encrypt sensitive data (credentials)
 */
export function encrypt(plaintext: string): string {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derive key from master key and salt
    const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, KEY_LENGTH, 'sha256');

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine: salt + iv + authTag + encrypted
    const combined = Buffer.concat([salt, iv, authTag, Buffer.from(encrypted, 'hex')]);

    return combined.toString('base64');
}

/**
 * Decrypt sensitive data (credentials)
 */
export function decrypt(ciphertext: string): string {
    // Decode from base64
    const combined = Buffer.from(ciphertext, 'base64');

    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive key from master key and salt
    const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, KEY_LENGTH, 'sha256');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Encrypt an object (converts to JSON first)
 */
export function encryptObject(obj: any): string {
    return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt to an object (parses JSON after decryption)
 */
export function decryptObject(ciphertext: string): any {
    return JSON.parse(decrypt(ciphertext));
}
