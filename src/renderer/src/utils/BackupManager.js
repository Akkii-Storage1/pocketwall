/**
 * BackupManager with AES-256 Encryption & User-Specific Protection
 * - Password-protected backups with real encryption
 * - User ID embedded in backup to prevent cross-user restore
 * - Backward compatible with old backups
 */

import DataAdapter from './dataAdapter';

// AES-256 Encryption using Web Crypto API
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptData(data, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(data)
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Return as Base64
    return btoa(String.fromCharCode(...combined));
}

async function decryptData(encryptedBase64, password) {
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    const key = await deriveKey(password, salt);

    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
    );

    return new TextDecoder().decode(decrypted);
}

class BackupManager {
    /**
     * Create encrypted backup with user identification
     * @param {boolean} encrypt - Whether to encrypt the backup
     * @param {string} password - Password for encryption (required if encrypt=true)
     * @param {string} userId - User email/ID to embed in backup
     */
    static async createBackup(encrypt = false, password = '', userId = '') {
        try {
            console.log('BackupManager: Starting backup...');

            const data = await DataAdapter.getAllData();

            // Add metadata for user identification
            const backupData = {
                ...data,
                _meta: {
                    version: '2.0',
                    createdAt: new Date().toISOString(),
                    userId: userId || 'anonymous',
                    encrypted: encrypt
                }
            };

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            let filename = `pocketwall_backup_${timestamp}.json`;
            let content;

            if (encrypt && password) {
                // Use real AES-256 encryption
                content = await encryptData(JSON.stringify(backupData), password);
                filename = `pocketwall_backup_${timestamp}.enc.pwb`;
            } else {
                content = JSON.stringify(backupData, null, 2);
            }

            // Use Electron Native Save Dialog
            if (window.api && window.api.saveBackup) {
                const success = await window.api.saveBackup(content, filename);
                return success;
            }

            // Fallback for Web
            const blob = new Blob([content], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Backup failed:', error);
            throw error;
        }
    }

    /**
     * Restore backup with user validation
     * @param {File} file - Backup file to restore
     * @param {string} password - Password for encrypted backups
     * @param {string} currentUserId - Current logged-in user ID
     * @param {boolean} forceRestore - Skip user validation (admin only)
     */
    static async restoreBackup(file, password = '', currentUserId = '', forceRestore = false) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    let content = e.target.result;
                    let data;

                    // Check if encrypted (.enc.pwb or doesn't start with {)
                    const isEncrypted = file.name.endsWith('.enc.pwb') ||
                        file.name.endsWith('.enc') ||
                        !content.trim().startsWith('{');

                    if (isEncrypted) {
                        if (!password) {
                            reject(new Error('Password required for encrypted backup'));
                            return;
                        }

                        try {
                            content = await decryptData(content, password);
                        } catch (decryptError) {
                            // Try old Base64 fallback
                            try {
                                content = decodeURIComponent(escape(atob(content)));
                            } catch {
                                reject(new Error('Wrong password or corrupted backup'));
                                return;
                            }
                        }
                    }

                    data = JSON.parse(content);

                    // User validation (v2.0+ backups)
                    if (data._meta && data._meta.userId && data._meta.userId !== 'anonymous') {
                        if (!forceRestore && currentUserId && data._meta.userId !== currentUserId) {
                            reject(new Error(
                                `This backup belongs to "${data._meta.userId}". ` +
                                `You are logged in as "${currentUserId}". ` +
                                `Restore not allowed for security reasons.`
                            ));
                            return;
                        }
                    }

                    // Remove metadata before import
                    delete data._meta;

                    await DataAdapter.importData(data);
                    resolve(true);
                } catch (error) {
                    console.error('Restore failed:', error);
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    /**
     * Check if backup file is encrypted
     */
    static isEncryptedBackup(filename) {
        return filename.endsWith('.enc.pwb') || filename.endsWith('.enc');
    }
}

export default BackupManager;
