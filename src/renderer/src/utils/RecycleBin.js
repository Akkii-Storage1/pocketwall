/**
 * RecycleBin - Soft delete with recovery for 30 days
 * Supports: Transactions, Investments, Goals, Budgets
 * Tab-specific recycling with auto-cleanup
 */

const RECYCLE_BIN_KEY = 'pocketwall_recycle_bin';
const RETENTION_DAYS = 30;

// In-memory cache
let recycleBin = {
    transactions: [],
    investments: [],
    goals: [],
    budgets: [],
    accounts: []
};

// Load from localStorage
function loadRecycleBin() {
    try {
        const stored = localStorage.getItem(RECYCLE_BIN_KEY);
        if (stored) {
            recycleBin = JSON.parse(stored);
            // Clean up expired items
            cleanupExpired();
        }
    } catch (error) {
        console.warn('[RecycleBin] Failed to load:', error);
    }
}

// Save to localStorage
function saveRecycleBin() {
    try {
        localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycleBin));
    } catch (error) {
        console.warn('[RecycleBin] Failed to save:', error);
    }
}

// Remove items older than 30 days
function cleanupExpired() {
    const cutoff = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    let changed = false;

    for (const key of Object.keys(recycleBin)) {
        const before = recycleBin[key].length;
        recycleBin[key] = recycleBin[key].filter(item => item._deletedAt > cutoff);
        if (recycleBin[key].length !== before) changed = true;
    }

    if (changed) saveRecycleBin();
}

// Initialize
loadRecycleBin();

export const RecycleBin = {
    /**
     * Move item to recycle bin instead of permanent delete
     * @param {string} type - 'transactions', 'investments', 'goals', 'budgets', 'accounts'
     * @param {object} item - The item to delete (must have .id)
     */
    add(type, item) {
        if (!recycleBin[type]) recycleBin[type] = [];

        recycleBin[type].push({
            ...item,
            _deletedAt: Date.now(),
            _originalType: type
        });

        saveRecycleBin();
        console.log(`[RecycleBin] Item moved to ${type} bin:`, item.id || item.name);
    },

    /**
     * Restore item from recycle bin
     * @param {string} type - Item type
     * @param {string} itemId - The item's ID
     * @returns {object|null} - The restored item or null
     */
    restore(type, itemId) {
        if (!recycleBin[type]) return null;

        const index = recycleBin[type].findIndex(item => item.id === itemId);
        if (index === -1) return null;

        const [item] = recycleBin[type].splice(index, 1);
        delete item._deletedAt;
        delete item._originalType;

        saveRecycleBin();
        console.log(`[RecycleBin] Item restored from ${type}:`, itemId);
        return item;
    },

    /**
     * Permanently delete from recycle bin
     */
    permanentDelete(type, itemId) {
        if (!recycleBin[type]) return false;

        const index = recycleBin[type].findIndex(item => item.id === itemId);
        if (index === -1) return false;

        recycleBin[type].splice(index, 1);
        saveRecycleBin();
        return true;
    },

    /**
     * Get all deleted items of a type
     */
    getDeleted(type) {
        return recycleBin[type] || [];
    },

    /**
     * Get count of deleted items per type
     */
    getCounts() {
        return {
            transactions: recycleBin.transactions?.length || 0,
            investments: recycleBin.investments?.length || 0,
            goals: recycleBin.goals?.length || 0,
            budgets: recycleBin.budgets?.length || 0,
            accounts: recycleBin.accounts?.length || 0,
            total: Object.values(recycleBin).reduce((sum, arr) => sum + (arr?.length || 0), 0)
        };
    },

    /**
     * Empty entire recycle bin or specific type
     */
    empty(type = null) {
        if (type) {
            recycleBin[type] = [];
        } else {
            for (const key of Object.keys(recycleBin)) {
                recycleBin[key] = [];
            }
        }
        saveRecycleBin();
    },

    /**
     * Get days remaining before auto-delete
     */
    getDaysRemaining(deletedAt) {
        const elapsed = Date.now() - deletedAt;
        const remaining = RETENTION_DAYS - Math.floor(elapsed / (24 * 60 * 60 * 1000));
        return Math.max(0, remaining);
    }
};

export default RecycleBin;
