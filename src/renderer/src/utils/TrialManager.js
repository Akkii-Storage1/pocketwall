import { encryptData, decryptData } from './encryptionUtils';

const TRIAL_DURATION_HOURS = 72;
const STORAGE_KEY = 'pocketwall_trial_data';
// In a real app, this would be more secure or server-side. 
// For a local-first app, we use an obfuscated key to prevent casual tampering.
const SYSTEM_KEY = 'pw_sys_trial_v1_secure_key_998877';

export const TrialManager = {
    /**
     * Initialize or check trial status
     * @returns {Promise<{isActive: boolean, remainingHours: number, isExpired: boolean}>}
     */
    async checkTrialStatus() {
        try {
            const storedData = localStorage.getItem(STORAGE_KEY);

            if (!storedData) {
                // First launch - Start Trial
                return await this.startTrial();
            }

            // Decrypt data
            const data = await decryptData(JSON.parse(storedData), SYSTEM_KEY);

            if (!data || !data.startTime) {
                // Corrupted data - Restart trial (or could block, but let's be nice)
                return await this.startTrial();
            }

            const startTime = new Date(data.startTime).getTime();
            const now = Date.now();
            const elapsedHours = (now - startTime) / (1000 * 60 * 60);
            const remainingHours = Math.max(0, TRIAL_DURATION_HOURS - elapsedHours);
            const isExpired = remainingHours <= 0;

            return {
                isActive: !isExpired,
                remainingHours,
                isExpired,
                startTime: data.startTime
            };

        } catch (error) {
            console.error('Trial check failed:', error);
            // Fallback to expired to be safe, or restart if we want to be lenient
            return { isActive: false, remainingHours: 0, isExpired: true };
        }
    },

    /**
     * Start a new trial
     */
    async startTrial() {
        const data = {
            startTime: new Date().toISOString(),
            version: '1.0'
        };

        const encrypted = await encryptData(data, SYSTEM_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));

        return {
            isActive: true,
            remainingHours: TRIAL_DURATION_HOURS,
            isExpired: false,
            startTime: data.startTime
        };
    },

    /**
     * Manually expire trial (for testing/debugging)
     */
    async expireTrial() {
        const data = {
            startTime: new Date(Date.now() - (TRIAL_DURATION_HOURS + 1) * 60 * 60 * 1000).toISOString(),
            version: '1.0'
        };
        const encrypted = await encryptData(data, SYSTEM_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
        return { isActive: false, remainingHours: 0, isExpired: true };
    },

    /**
     * Reset trial (for testing/admin)
     */
    async resetTrial() {
        return await this.startTrial();
    }
};

export default TrialManager;
