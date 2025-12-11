import DataAdapter from './dataAdapter';
import encryptionUtils from './encryptionUtils';

// Secret salt for checksum generation (In a real app, this would be more obfuscated)
const LICENSE_SALT = 'POCKETWALL_SECURE_SALT_2024_v1';

const TIERS_MAP = {
    'STR': 'starter',
    'PRO': 'pro',
    'ELT': 'elite'
};

const REVERSE_TIERS_MAP = {
    'starter': 'STR',
    'pro': 'PRO',
    'elite': 'ELT'
};

class LicenseManager {
    /**
     * Generates a valid license key for a specific tier and duration.
     * Format: PW-{TIER}-{DURATION}-{BATCH}-{CHECKSUM}
     * Example: PW-PRO-12M-X7Z9-A1B2
     * Duration: 1M, 3M, 6M, 12M (1 Year)
     */
    static generateLicenseKey(tier, duration = '12M') {
        const tierCode = REVERSE_TIERS_MAP[tier];
        if (!tierCode) throw new Error('Invalid tier');

        // Generate random 4-char batch ID
        const batchId = Math.random().toString(36).substring(2, 6).toUpperCase();

        const checksum = this._generateChecksum(tierCode, batchId, duration);

        return `PW-${tierCode}-${duration}-${batchId}-${checksum}`;
    }

    /**
     * Generates a checksum for the given tier, batch, and duration.
     */
    static _generateChecksum(tierCode, batchId, duration) {
        const data = `${tierCode}-${duration}-${batchId}-${LICENSE_SALT}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Convert to hex and take last 4 chars
        return Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(-4);
    }

    /**
     * Validates a license key.
     * Returns { isValid: boolean, tier: string|null, duration: string|null, error: string|null }
     */
    static validateLicenseKey(key) {
        try {
            if (!key || typeof key !== 'string') return { isValid: false, error: 'Empty key' };

            const parts = key.trim().toUpperCase().split('-');

            // Support legacy format (without duration) for backward compatibility if needed
            // But for now, we enforce new format: PW-TIER-DUR-BATCH-CHECKSUM
            if (parts.length !== 5) return { isValid: false, error: 'Invalid format' };

            const [prefix, tierCode, duration, batchId, checksum] = parts;

            if (prefix !== 'PW') return { isValid: false, error: 'Invalid prefix' };
            if (!TIERS_MAP[tierCode]) return { isValid: false, error: 'Unknown tier' };

            const expectedChecksum = this._generateChecksum(tierCode, batchId, duration);
            if (checksum !== expectedChecksum) {
                return { isValid: false, error: 'Invalid checksum' };
            }

            return {
                isValid: true,
                tier: TIERS_MAP[tierCode],
                duration: duration
            };
        } catch (error) {
            console.error('License validation error:', error);
            return { isValid: false, error: 'Validation error' };
        }
    }

    /**
     * Activates a license key for the current user.
     */
    static async activateLicense(key) {
        const validation = this.validateLicenseKey(key);
        if (!validation.isValid) {
            throw new Error(validation.error || 'Invalid license key');
        }

        // Calculate expiration date
        const durationMonths = parseInt(validation.duration.replace('M', ''));
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + durationMonths);

        // Save to user settings
        const settings = await DataAdapter.getUserSettings();
        const updatedSettings = {
            ...settings,
            licenseKey: key,
            licenseTier: validation.tier,
            licenseDuration: validation.duration,
            licenseActivatedAt: new Date().toISOString(),
            licenseExpiresAt: expirationDate.toISOString()
        };

        await DataAdapter.updateUserSettings(updatedSettings);
        return validation.tier;
    }

    /**
     * Deactivates the current license.
     */
    static async deactivateLicense() {
        const settings = await DataAdapter.getUserSettings();
        const updatedSettings = {
            ...settings,
            licenseKey: null,
            licenseTier: null,
            licenseDuration: null,
            licenseActivatedAt: null,
            licenseExpiresAt: null
        };
        await DataAdapter.updateUserSettings(updatedSettings);
    }
}

export default LicenseManager;
