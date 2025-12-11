/**
 * Encryption Utilities
 * Provides AES-256-GCM encryption using Web Crypto API
 * No external dependencies required
 */

/**
 * Derive encryption key from password
 * @param {string} password - User password
 * @param {Uint8Array} salt - Salt for key derivation
 * @returns {Promise<CryptoKey>} - Derived key
 */
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive AES key
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Convert ArrayBuffer to Base64 string
 * @param {ArrayBuffer} buffer - ArrayBuffer to convert
 * @returns {string} - Base64 encoded string
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 * @param {string} base64 - Base64 string
 * @returns {Uint8Array} - Decoded array buffer
 */
function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Encrypt data with AES-256-GCM
 * @param {any} data - Data to encrypt (will be JSON stringified)
 * @param {string} password - Encryption password
 * @returns {Promise<object>} - Encrypted data package
 */
export async function encryptData(data, password) {
    try {
        const encoder = new TextEncoder();
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        const dataBuffer = encoder.encode(dataString);

        // Generate salt and IV
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Derive key
        const key = await deriveKey(password, salt);

        // Encrypt
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            dataBuffer
        );

        return {
            encrypted: arrayBufferToBase64(encrypted),
            iv: arrayBufferToBase64(iv),
            salt: arrayBufferToBase64(salt),
            version: '1' // For future compatibility
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypt data with AES-256-GCM
 * @param {object} encryptedPackage - Encrypted data package
 * @param {string} password - Decryption password
 * @returns {Promise<any>} - Decrypted data
 */
export async function decryptData(encryptedPackage, password) {
    try {
        const { encrypted, iv, salt } = encryptedPackage;

        // Convert from Base64
        const encryptedBuffer = base64ToArrayBuffer(encrypted);
        const ivBuffer = base64ToArrayBuffer(iv);
        const saltBuffer = base64ToArrayBuffer(salt);

        // Derive key
        const key = await deriveKey(password, saltBuffer);

        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: ivBuffer },
            key,
            encryptedBuffer
        );

        // Decode
        const decoder = new TextDecoder();
        const decryptedString = decoder.decode(decrypted);

        // Try to parse as JSON
        try {
            return JSON.parse(decryptedString);
        } catch {
            return decryptedString;
        }
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data. Wrong password?');
    }
}

/**
 * Check if encryption is available
 * @returns {boolean} - Whether encryption is supported
 */
export function isEncryptionSupported() {
    return typeof crypto !== 'undefined' &&
        typeof crypto.subtle !== 'undefined';
}

/**
 * Generate a random encryption password
 * @param {number} length - Password length (default: 32)
 * @returns {string} - Random password
 */
export function generatePassword(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return arrayBufferToBase64(array).substring(0, length);
}

/**
 * Hash a password (for verification without storing plaintext)
 * @param {string} password - Password to hash
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return arrayBufferToBase64(hashBuffer);
}

export default {
    encryptData,
    decryptData,
    isEncryptionSupported,
    generatePassword,
    hashPassword
};
