
const isElectron = () => {
    return window.api !== undefined;
};

// LocalStorage Keys
const KEYS = {
    TRANSACTIONS: 'pocketwall_transactions',
    PAYEES: 'pocketwall_payees',
    RECURRING: 'pocketwall_recurring',
    INVESTMENTS: 'pocketwall_investments',
    PENDING_INVESTMENTS: 'pocketwall_pending_investments',
    GOALS: 'pocketwall_goals',
    SETTINGS: 'pocketwall_settings',
    BUDGETS: 'budgetLimits', // Keeping existing key for compatibility
    ALERTS: 'pocketwall_alerts',
    FRIENDS: 'pocketwall_friends',
    SHARED_EXPENSES: 'pocketwall_shared_expenses',
    REMINDERS: 'pocketwall_reminders',
    LOANS: 'pocketwall_loans',
    ASSETS: 'pocketwall_assets',
    CHARITY: 'pocketwall_charity',
    TEMPLATES: 'pocketwall_transaction_templates',
    SIPS: 'pocketwall_sips',
    // Crypto keys (were missing - causing factory reset issues)
    CRYPTO_HOLDINGS: 'pocketwall_crypto_holdings',
    CRYPTO_WATCHLIST: 'pocketwall_crypto_watchlist',
    CRYPTO_PRICES: 'pocketwall_crypto_prices',
    STORED_PRICES: 'pocketwall_stored_prices',
    PIN: 'pocketwall_pin',
    // Additional keys
    RECYCLE_BIN: 'pocketwall_recycle_bin',
    CATEGORIES: 'pocketwall_categories',
    LAST_SYNC: 'pocketwall_last_sync'
};

// Cloud Sync enabled flag
let cloudSyncEnabled = true;

// Helper to simulate async delay for realism
const delay = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

const dispatchSaveEvent = (msg = 'Data Saved') => {
    document.dispatchEvent(new CustomEvent('dataSaved', { detail: { message: msg } }));
    // Auto-sync to cloud after every save (debounced)
    triggerCloudSync();
};

// Debounced cloud sync to avoid too many API calls
let syncTimeout = null;
const triggerCloudSync = async () => {
    if (!cloudSyncEnabled) return;

    // Debounce: wait 2 seconds after last change before syncing
    if (syncTimeout) clearTimeout(syncTimeout);

    syncTimeout = setTimeout(async () => {
        try {
            // Dynamic import to avoid circular dependencies
            const { pushToCloud } = await import('./CloudSync');
            const data = await WebAdapter.getAllData();
            await pushToCloud(data);
        } catch (error) {
            console.warn('Cloud sync failed:', error);
        }
    }, 2000);
};

// Enable/disable cloud sync
export const setCloudSyncEnabled = (enabled) => {
    cloudSyncEnabled = enabled;
    console.log('Cloud sync:', enabled ? 'enabled' : 'disabled');
};

// Helper to calculate next SIP due date
const calculateNextSIPDueDate = (sipDay, startDate) => {
    const today = new Date();
    const start = startDate ? new Date(startDate) : today;

    // Ensure sipDay is between 1-28 (to handle all months)
    const day = Math.min(Math.max(parseInt(sipDay) || 1, 1), 28);

    let nextDue = new Date(today.getFullYear(), today.getMonth(), day);

    // If start date is in future, use start month
    if (start > today) {
        nextDue = new Date(start.getFullYear(), start.getMonth(), day);
    }

    // If nextDue is in past or today has passed, move to next month
    if (nextDue <= today) {
        nextDue.setMonth(nextDue.getMonth() + 1);
    }

    return nextDue.toISOString().split('T')[0];
};

const WebAdapter = {
    // In-memory cache
    cache: {
        transactions: null,
        payees: null,
        recurring: null
    },

    // --- Transactions ---
    getTransactions: async () => {
        await delay();
        if (WebAdapter.cache.transactions) return WebAdapter.cache.transactions;
        const data = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
        WebAdapter.cache.transactions = data;
        return data;
    },
    addTransaction: async (transaction) => {
        await delay();
        const txs = await WebAdapter.getTransactions();
        const newTx = { ...transaction, id: Date.now() }; // Simple ID generation
        txs.push(newTx);
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
        WebAdapter.cache.transactions = txs; // Update cache
        dispatchSaveEvent('Transaction Saved');
        return newTx;
    },
    updateTransaction: async (transaction) => {
        await delay();
        const txs = await WebAdapter.getTransactions();
        const index = txs.findIndex(t => t.id === transaction.id);
        if (index !== -1) {
            txs[index] = transaction;
            localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
            WebAdapter.cache.transactions = txs; // Update cache
            dispatchSaveEvent('Transaction Updated');
        }
        return transaction;
    },
    deleteTransaction: async (id) => {
        await delay();
        const txs = await WebAdapter.getTransactions();
        const filtered = txs.filter(t => t.id !== id);
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
        WebAdapter.cache.transactions = filtered; // Update cache
        dispatchSaveEvent('Transaction Deleted');
        return true;
    },
    reconcileTransaction: async (id, status) => {
        await delay();
        const txs = await WebAdapter.getTransactions();
        const index = txs.findIndex(t => t.id === id);
        if (index !== -1) {
            txs[index].reconciled = status;
            localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));
            WebAdapter.cache.transactions = txs; // Update cache
            dispatchSaveEvent('Reconciliation Saved');
        }
        return true;
    },

    // --- Transaction Templates ---
    getTransactionTemplates: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.TEMPLATES) || '[]');
    },
    saveTransactionTemplate: async (template) => {
        await delay();
        const templates = JSON.parse(localStorage.getItem(KEYS.TEMPLATES) || '[]');
        const newTemplate = { ...template, id: Date.now() };
        templates.push(newTemplate);
        localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
        return newTemplate;
    },
    deleteTransactionTemplate: async (id) => {
        await delay();
        const templates = JSON.parse(localStorage.getItem(KEYS.TEMPLATES) || '[]');
        const filtered = templates.filter(t => t.id !== id);
        localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(filtered));
        return true;
    },

    // --- Payees ---
    getPayees: async () => {
        await delay();
        if (WebAdapter.cache.payees) return WebAdapter.cache.payees;
        const data = JSON.parse(localStorage.getItem(KEYS.PAYEES) || '[]');
        WebAdapter.cache.payees = data;
        return data;
    },
    addPayee: async (payee) => {
        await delay();
        const payees = await WebAdapter.getPayees();
        const newPayee = { ...payee, id: Date.now() };
        payees.push(newPayee);
        localStorage.setItem(KEYS.PAYEES, JSON.stringify(payees));
        WebAdapter.cache.payees = payees;
        return newPayee;
    },
    updatePayee: async (payee) => {
        await delay();
        const payees = await WebAdapter.getPayees();
        const index = payees.findIndex(p => p.id === payee.id);
        if (index !== -1) {
            payees[index] = payee;
            localStorage.setItem(KEYS.PAYEES, JSON.stringify(payees));
            WebAdapter.cache.payees = payees;
        }
        return payee;
    },
    deletePayee: async (id) => {
        await delay();
        const payees = await WebAdapter.getPayees();
        const filtered = payees.filter(p => p.id !== id);
        localStorage.setItem(KEYS.PAYEES, JSON.stringify(filtered));
        WebAdapter.cache.payees = filtered;
        return true;
    },

    // --- Recurring Rules ---
    getRecurringRules: async () => {
        await delay();
        if (WebAdapter.cache.recurring) return WebAdapter.cache.recurring;
        const data = JSON.parse(localStorage.getItem(KEYS.RECURRING) || '[]');
        WebAdapter.cache.recurring = data;
        return data;
    },
    addRecurringRule: async (rule) => {
        await delay();
        const rules = await WebAdapter.getRecurringRules();
        const newRule = { ...rule, id: Date.now() };
        rules.push(newRule);
        localStorage.setItem(KEYS.RECURRING, JSON.stringify(rules));
        WebAdapter.cache.recurring = rules;
        return newRule;
    },
    updateRecurringRule: async (rule) => {
        await delay();
        const rules = await WebAdapter.getRecurringRules();
        const index = rules.findIndex(r => r.id === rule.id);
        if (index !== -1) {
            rules[index] = rule;
            localStorage.setItem(KEYS.RECURRING, JSON.stringify(rules));
            WebAdapter.cache.recurring = rules;
        }
        return rule;
    },
    deleteRecurringRule: async (id) => {
        await delay();
        const rules = await WebAdapter.getRecurringRules();
        const filtered = rules.filter(r => r.id !== id);
        localStorage.setItem(KEYS.RECURRING, JSON.stringify(filtered));
        WebAdapter.cache.recurring = filtered;
        return true;
    },

    // --- SIPs (Systematic Investment Plans) ---
    getSIPs: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.SIPS) || '[]');
    },
    getSIPById: async (id) => {
        await delay();
        const sips = JSON.parse(localStorage.getItem(KEYS.SIPS) || '[]');
        return sips.find(s => s.id === id) || null;
    },
    addSIP: async (sip) => {
        await delay();
        const sips = JSON.parse(localStorage.getItem(KEYS.SIPS) || '[]');
        const today = new Date().toISOString().split('T')[0];

        // Calculate next due date
        const sipDay = parseInt(sip.sipDay) || 1;
        const nextDue = calculateNextSIPDueDate(sipDay, sip.startDate);

        const newSIP = {
            ...sip,
            id: `sip_${Date.now()}`,
            status: 'active',
            skipCount: 0,
            totalInstallments: 0,
            totalInvested: 0,
            lastExecutedDate: null,
            nextDueDate: nextDue,
            createdAt: today
        };
        sips.push(newSIP);
        localStorage.setItem(KEYS.SIPS, JSON.stringify(sips));
        dispatchSaveEvent('SIP Created');
        return newSIP;
    },
    updateSIP: async (sip) => {
        await delay();
        const sips = JSON.parse(localStorage.getItem(KEYS.SIPS) || '[]');
        const index = sips.findIndex(s => s.id === sip.id);
        if (index !== -1) {
            sips[index] = { ...sips[index], ...sip };
            localStorage.setItem(KEYS.SIPS, JSON.stringify(sips));
            dispatchSaveEvent('SIP Updated');
        }
        return sip;
    },
    deleteSIP: async (id) => {
        await delay();
        const sips = JSON.parse(localStorage.getItem(KEYS.SIPS) || '[]');
        const filtered = sips.filter(s => s.id !== id);
        localStorage.setItem(KEYS.SIPS, JSON.stringify(filtered));
        dispatchSaveEvent('SIP Deleted');
        return true;
    },
    getDueSIPs: async () => {
        await delay();
        const sips = JSON.parse(localStorage.getItem(KEYS.SIPS) || '[]');
        const today = new Date().toISOString().split('T')[0];
        return sips.filter(s =>
            s.status === 'active' &&
            s.nextDueDate &&
            s.nextDueDate <= today
        );
    },

    // --- Investments ---
    getInvestments: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.INVESTMENTS) || '[]');
    },
    addInvestment: async (inv) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.INVESTMENTS) || '[]');
        const newItem = { ...inv, id: Date.now() };
        items.push(newItem);
        localStorage.setItem(KEYS.INVESTMENTS, JSON.stringify(items));
        dispatchSaveEvent('Investment Saved');
        return newItem;
    },
    updateInvestment: async (inv) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.INVESTMENTS) || '[]');
        const index = items.findIndex(i => i.id === inv.id);
        if (index !== -1) {
            items[index] = inv;
            localStorage.setItem(KEYS.INVESTMENTS, JSON.stringify(items));
            dispatchSaveEvent('Investment Updated');
        }
        return inv;
    },
    deleteInvestment: async (id) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.INVESTMENTS) || '[]');
        const filtered = items.filter(i => i.id !== id);
        localStorage.setItem(KEYS.INVESTMENTS, JSON.stringify(filtered));
        dispatchSaveEvent('Investment Deleted');
        return true;
    },

    // --- Reminders (v1.1) ---
    getReminders: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.REMINDERS) || '[]');
    },
    saveReminders: async (reminders) => {
        await delay();
        localStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders));
        dispatchSaveEvent('Reminders Saved');
        return true;
    },

    // --- Loans (v1.1) ---
    getLoans: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.LOANS) || '[]');
    },
    saveLoans: async (loans) => {
        await delay();
        localStorage.setItem(KEYS.LOANS, JSON.stringify(loans));
        dispatchSaveEvent('Loans Saved');
        return true;
    },

    // --- Assets (v1.1) ---
    getAssets: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.ASSETS) || '[]');
    },
    saveAssets: async (assets) => {
        await delay();
        localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
        dispatchSaveEvent('Assets Saved');
        return true;
    },

    // --- Charity (v1.1) ---
    getCharity: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.CHARITY) || '[]');
    },
    saveCharity: async (charityData) => {
        await delay();
        localStorage.setItem(KEYS.CHARITY, JSON.stringify(charityData));
        dispatchSaveEvent('Charity Saved');
        return true;
    },

    // --- Goals ---
    getGoals: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.GOALS) || '[]');
    },
    addGoal: async (goal) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.GOALS) || '[]');
        const newItem = { ...goal, id: Date.now() };
        items.push(newItem);
        localStorage.setItem(KEYS.GOALS, JSON.stringify(items));
        return newItem;
    },
    updateGoal: async (goal) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.GOALS) || '[]');
        const index = items.findIndex(g => g.id === goal.id);
        if (index !== -1) {
            items[index] = goal;
            localStorage.setItem(KEYS.GOALS, JSON.stringify(items));
        }
        return goal;
    },
    deleteGoal: async (id) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.GOALS) || '[]');
        const filtered = items.filter(g => g.id !== id);
        localStorage.setItem(KEYS.GOALS, JSON.stringify(filtered));
        return true;
    },

    // --- Budgets ---
    getBudgets: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.BUDGETS) || '{}');
    },
    saveBudgets: async (budgets) => {
        await delay();
        localStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
        return budgets;
    },

    // --- Settings ---
    getUserSettings: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}');
    },
    updateUserSettings: async (settings) => {
        await delay();
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
        dispatchSaveEvent('Settings Saved');
        return settings;
    },

    // --- Alerts ---
    getAlerts: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.ALERTS) || '[]');
    },
    addAlert: async (alert) => {
        await delay();
        const alerts = JSON.parse(localStorage.getItem(KEYS.ALERTS) || '[]');
        const newAlert = { ...alert, id: Date.now() };
        alerts.push(newAlert);
        localStorage.setItem(KEYS.ALERTS, JSON.stringify(alerts));
        return newAlert;
    },
    updateAlert: async (alert) => {
        await delay();
        const alerts = JSON.parse(localStorage.getItem(KEYS.ALERTS) || '[]');
        const index = alerts.findIndex(a => a.id === alert.id);
        if (index !== -1) {
            alerts[index] = alert;
            localStorage.setItem(KEYS.ALERTS, JSON.stringify(alerts));
        }
        return alert;
    },
    deleteAlert: async (id) => {
        await delay();
        const alerts = JSON.parse(localStorage.getItem(KEYS.ALERTS) || '[]');
        const filtered = alerts.filter(a => a.id !== id);
        localStorage.setItem(KEYS.ALERTS, JSON.stringify(filtered));
        return true;
    },

    // --- Friends ---
    getFriends: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.FRIENDS) || '[]');
    },
    addFriend: async (friend) => {
        await delay();
        const friends = JSON.parse(localStorage.getItem(KEYS.FRIENDS) || '[]');
        const newFriend = { ...friend, id: Date.now() };
        friends.push(newFriend);
        localStorage.setItem(KEYS.FRIENDS, JSON.stringify(friends));
        return newFriend;
    },
    updateFriend: async (friend) => {
        await delay();
        const friends = JSON.parse(localStorage.getItem(KEYS.FRIENDS) || '[]');
        const index = friends.findIndex(f => f.id === friend.id);
        if (index !== -1) {
            friends[index] = friend;
            localStorage.setItem(KEYS.FRIENDS, JSON.stringify(friends));
        }
        return friend;
    },
    deleteFriend: async (id) => {
        await delay();
        const friends = JSON.parse(localStorage.getItem(KEYS.FRIENDS) || '[]');
        const filtered = friends.filter(f => f.id !== id);
        localStorage.setItem(KEYS.FRIENDS, JSON.stringify(filtered));
        return true;
    },

    // --- Shared Expenses ---
    getSharedExpenses: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.SHARED_EXPENSES) || '[]');
    },
    addSharedExpense: async (expense) => {
        await delay();
        const expenses = JSON.parse(localStorage.getItem(KEYS.SHARED_EXPENSES) || '[]');
        const newExpense = { ...expense, id: Date.now() };
        expenses.push(newExpense);
        localStorage.setItem(KEYS.SHARED_EXPENSES, JSON.stringify(expenses));
        return newExpense;
    },
    updateSharedExpense: async (expense) => {
        await delay();
        const expenses = JSON.parse(localStorage.getItem(KEYS.SHARED_EXPENSES) || '[]');
        const index = expenses.findIndex(e => e.id === expense.id);
        if (index !== -1) {
            expenses[index] = expense;
            localStorage.setItem(KEYS.SHARED_EXPENSES, JSON.stringify(expenses));
        }
        return true;
    },
    deleteSharedExpense: async (id) => {
        await delay();
        const expenses = JSON.parse(localStorage.getItem(KEYS.SHARED_EXPENSES) || '[]');
        const filtered = expenses.filter(e => e.id !== id);
        localStorage.setItem(KEYS.SHARED_EXPENSES, JSON.stringify(filtered));
        return true;
    },

    // --- Pending Investments (IPO/NFO/Bonds/ETF) ---
    getPendingInvestments: async () => {
        await delay();
        return JSON.parse(localStorage.getItem(KEYS.PENDING_INVESTMENTS) || '[]');
    },
    addPendingInvestment: async (item) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.PENDING_INVESTMENTS) || '[]');
        const newItem = { ...item, id: Date.now(), createdAt: new Date().toISOString() };
        items.push(newItem);
        localStorage.setItem(KEYS.PENDING_INVESTMENTS, JSON.stringify(items));
        dispatchSaveEvent('Pending Investment Added');
        return newItem;
    },
    updatePendingInvestment: async (item) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.PENDING_INVESTMENTS) || '[]');
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = { ...items[index], ...item, updatedAt: new Date().toISOString() };
            localStorage.setItem(KEYS.PENDING_INVESTMENTS, JSON.stringify(items));
            dispatchSaveEvent('Pending Investment Updated');
        }
        return item;
    },
    deletePendingInvestment: async (id) => {
        await delay();
        const items = JSON.parse(localStorage.getItem(KEYS.PENDING_INVESTMENTS) || '[]');
        const filtered = items.filter(i => i.id !== id);
        localStorage.setItem(KEYS.PENDING_INVESTMENTS, JSON.stringify(filtered));
        dispatchSaveEvent('Pending Investment Deleted');
        return true;
    },

    // --- Prices ---
    getStoredPrice: async (symbol, exchange) => {
        await delay();
        const prices = JSON.parse(localStorage.getItem('pocketwall_prices') || '{}');
        const key = `${symbol}_${exchange}`;
        return prices[key] || null;
    },
    saveStoredPrice: async (symbol, exchange, priceData) => {
        await delay();
        const prices = JSON.parse(localStorage.getItem('pocketwall_prices') || '{}');
        const key = `${symbol}_${exchange}`;
        prices[key] = priceData;
        localStorage.setItem('pocketwall_prices', JSON.stringify(prices));
        return true;
    },

    // --- Accounts (Derived) ---
    getAccounts: async () => {
        await delay();
        const txs = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
        const accounts = new Set(['Cash', 'Bank Account', 'Credit Card']); // Defaults
        txs.forEach(t => {
            if (t.account) accounts.add(t.account);
        });
        return Array.from(accounts).map(name => ({ id: name, name, type: 'asset' }));
    },

    // --- Files / Misc ---
    selectFile: async () => {
        alert("File selection is not fully supported in web version yet.");
        return null;
    },
    saveAttachment: async (file) => {
        console.warn("Attachment saving not implemented for web.");
        return null;
    },
    openPath: async (path) => {
        console.warn("Cannot open local paths in web version.");
    },
    getAllData: async () => {
        await delay();
        return {
            transactions: JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]'),
            payees: JSON.parse(localStorage.getItem(KEYS.PAYEES) || '[]'),
            recurring: JSON.parse(localStorage.getItem(KEYS.RECURRING) || '[]'),
            investments: JSON.parse(localStorage.getItem(KEYS.INVESTMENTS) || '[]'),
            goals: JSON.parse(localStorage.getItem(KEYS.GOALS) || '[]'),
            settings: JSON.parse(localStorage.getItem(KEYS.SETTINGS) || '{}'),
            budgets: JSON.parse(localStorage.getItem(KEYS.BUDGETS) || '{}'),
            friends: JSON.parse(localStorage.getItem(KEYS.FRIENDS) || '[]'),
            shared_expenses: JSON.parse(localStorage.getItem(KEYS.SHARED_EXPENSES) || '[]'),
            alerts: JSON.parse(localStorage.getItem(KEYS.ALERTS) || '[]'),
            crypto_holdings: JSON.parse(localStorage.getItem('pocketwall_crypto_holdings') || '{}'),
            crypto_watchlist: JSON.parse(localStorage.getItem('pocketwall_crypto_watchlist') || '[]'),
            prices: JSON.parse(localStorage.getItem('pocketwall_prices') || '{}'),
            trial_data: JSON.parse(localStorage.getItem('pocketwall_trial_data') || '{}'),
            feature_flags: JSON.parse(localStorage.getItem('feature_flags') || '{}'),
            reminders: JSON.parse(localStorage.getItem(KEYS.REMINDERS) || '[]'),
            loans: JSON.parse(localStorage.getItem(KEYS.LOANS) || '[]'),
            assets: JSON.parse(localStorage.getItem(KEYS.ASSETS) || '[]'),
            charity: JSON.parse(localStorage.getItem(KEYS.CHARITY) || '[]')
        };
    },
    exportData: async () => {
        const data = await WebAdapter.getAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pocketwall_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    },
    importData: async (json) => {
        try {
            const data = JSON.parse(json);
            if (data.transactions) localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(data.transactions));
            if (data.payees) localStorage.setItem(KEYS.PAYEES, JSON.stringify(data.payees));
            if (data.recurring) localStorage.setItem(KEYS.RECURRING, JSON.stringify(data.recurring));
            if (data.investments) localStorage.setItem(KEYS.INVESTMENTS, JSON.stringify(data.investments));
            if (data.goals) localStorage.setItem(KEYS.GOALS, JSON.stringify(data.goals));
            if (data.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
            if (data.budgets) localStorage.setItem(KEYS.BUDGETS, JSON.stringify(data.budgets));
            if (data.friends) localStorage.setItem(KEYS.FRIENDS, JSON.stringify(data.friends));
            if (data.shared_expenses) localStorage.setItem(KEYS.SHARED_EXPENSES, JSON.stringify(data.shared_expenses));
            if (data.alerts) localStorage.setItem(KEYS.ALERTS, JSON.stringify(data.alerts));
            if (data.crypto_holdings) localStorage.setItem('pocketwall_crypto_holdings', JSON.stringify(data.crypto_holdings));
            if (data.crypto_watchlist) localStorage.setItem('pocketwall_crypto_watchlist', JSON.stringify(data.crypto_watchlist));
            if (data.prices) localStorage.setItem('pocketwall_prices', JSON.stringify(data.prices));
            if (data.trial_data) localStorage.setItem('pocketwall_trial_data', JSON.stringify(data.trial_data));
            if (data.feature_flags) localStorage.setItem('feature_flags', JSON.stringify(data.feature_flags));
            if (data.reminders) localStorage.setItem(KEYS.REMINDERS, JSON.stringify(data.reminders));
            if (data.loans) localStorage.setItem(KEYS.LOANS, JSON.stringify(data.loans));
            if (data.assets) localStorage.setItem(KEYS.ASSETS, JSON.stringify(data.assets));
            if (data.charity) localStorage.setItem(KEYS.CHARITY, JSON.stringify(data.charity));

            dispatchSaveEvent('Data Imported');
            // Clear cache after import
            WebAdapter.cache = { transactions: null, payees: null, recurring: null };
            return true;
        } catch (e) {
            return false;
        }
    },
    clearAllData: async () => {
        await delay();

        console.log('=== CLEAR ALL DATA START ===');

        // Keys to PRESERVE (Settings, Theme, etc.)
        const preservedKeys = [
            KEYS.SETTINGS,
            'feature_flags',
            'pocketwall_pin'
        ];

        // Get all keys from localStorage
        const allKeys = Object.keys(localStorage);

        // Filter keys that start with 'pocketwall_' but are NOT in preserved list
        const keysToRemove = allKeys.filter(key =>
            key.startsWith('pocketwall_') && !preservedKeys.includes(key)
        );

        // Also remove budgetLimits manually as it doesn't start with pocketwall_
        if (localStorage.getItem(KEYS.BUDGETS)) {
            keysToRemove.push(KEYS.BUDGETS);
        }

        console.log('Keys to remove:', keysToRemove);

        // Remove each key
        keysToRemove.forEach(key => {
            console.log(`Removing key: ${key}`);
            localStorage.removeItem(key);
        });

        console.log('=== CLEAR ALL DATA END ===');

        // Dispatch event to notify components
        // Dispatch event to notify components
        dispatchSaveEvent('All Data Cleared');
        // Clear cache
        WebAdapter.cache = { transactions: null, payees: null, recurring: null };
        return true;
    },

    resetApp: async () => {
        await delay();
        console.log('=== FACTORY RESET START ===');

        // 1. Clear all keys from KEYS object
        Object.values(KEYS).forEach(key => {
            console.log(`Removing KEYS: ${key}`);
            localStorage.removeItem(key);
        });

        // 2. Clear ALL pocketwall_ prefixed keys (catches any missed ones)
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            if (key.startsWith('pocketwall_') ||
                key === 'budgetLimits' ||
                key === 'feature_flags' ||
                key === 'trial_data' ||
                key === 'activation_key') {
                console.log(`Removing: ${key}`);
                localStorage.removeItem(key);
            }
        });

        // 3. Clear sessionStorage too
        sessionStorage.clear();

        // 4. Clear cache
        WebAdapter.cache = { transactions: null, payees: null, recurring: null };

        console.log('=== FACTORY RESET COMPLETE ===');
        console.log('Remaining localStorage keys:', Object.keys(localStorage));
        return true;
    },

    // Cloud Sync: Pull data from cloud and merge with local
    syncFromCloud: async () => {
        try {
            const { pullFromCloud } = await import('./CloudSync');
            const cloudResult = await pullFromCloud();

            if (!cloudResult || !cloudResult.data) {
                console.log('CloudSync: No cloud data to sync');
                return { success: true, message: 'No cloud data found' };
            }

            const cloudData = cloudResult.data;
            console.log('CloudSync: Importing cloud data...');

            // Import cloud data (merge with local)
            if (cloudData.transactions) {
                const local = JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS) || '[]');
                // Merge: cloud data takes precedence for same IDs
                const merged = [...local];
                cloudData.transactions.forEach(ct => {
                    const idx = merged.findIndex(lt => lt.id === ct.id);
                    if (idx >= 0) merged[idx] = ct;
                    else merged.push(ct);
                });
                localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(merged));
            }

            if (cloudData.investments) localStorage.setItem(KEYS.INVESTMENTS, JSON.stringify(cloudData.investments));
            if (cloudData.goals) localStorage.setItem(KEYS.GOALS, JSON.stringify(cloudData.goals));
            if (cloudData.recurring) localStorage.setItem(KEYS.RECURRING, JSON.stringify(cloudData.recurring));
            if (cloudData.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(cloudData.settings));
            if (cloudData.budgets) localStorage.setItem(KEYS.BUDGETS, JSON.stringify(cloudData.budgets));
            if (cloudData.friends) localStorage.setItem(KEYS.FRIENDS, JSON.stringify(cloudData.friends));
            if (cloudData.shared_expenses) localStorage.setItem(KEYS.SHARED_EXPENSES, JSON.stringify(cloudData.shared_expenses));
            if (cloudData.reminders) localStorage.setItem(KEYS.REMINDERS, JSON.stringify(cloudData.reminders));
            if (cloudData.loans) localStorage.setItem(KEYS.LOANS, JSON.stringify(cloudData.loans));
            if (cloudData.assets) localStorage.setItem(KEYS.ASSETS, JSON.stringify(cloudData.assets));
            if (cloudData.charity) localStorage.setItem(KEYS.CHARITY, JSON.stringify(cloudData.charity));
            if (cloudData.crypto_holdings) localStorage.setItem(KEYS.CRYPTO_HOLDINGS, JSON.stringify(cloudData.crypto_holdings));
            if (cloudData.crypto_watchlist) localStorage.setItem(KEYS.CRYPTO_WATCHLIST, JSON.stringify(cloudData.crypto_watchlist));
            if (cloudData.sips) localStorage.setItem(KEYS.SIPS, JSON.stringify(cloudData.sips));
            if (cloudData.templates) localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(cloudData.templates));

            // Save last sync time
            localStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());

            // Clear cache to force reload
            WebAdapter.cache = { transactions: null, payees: null, recurring: null };

            console.log('CloudSync: Data synced successfully');
            return { success: true, message: 'Data synced from cloud' };
        } catch (error) {
            console.error('CloudSync: Sync failed', error);
            return { success: false, message: error.message };
        }
    },

    // Get last sync time
    getLastSyncTime: () => {
        return localStorage.getItem(KEYS.LAST_SYNC);
    }
};

import { db, auth } from './firebase';
import { doc, setDoc, deleteDoc, collection } from 'firebase/firestore';

// ... (Existing WebAdapter code remains mostly same, but we focus on the Proxy at the end)

// --- Real-time Listeners ---
import { onSnapshot } from 'firebase/firestore';

let unsubscribeFunctions = [];

export const initRealtimeListeners = (userId) => {
    // Unsubscribe previous listeners if any
    unsubscribeFunctions.forEach(unsub => unsub());
    unsubscribeFunctions = [];

    if (!userId) return;

    console.log('Initializing Real-time Listeners for:', userId);

    const collectionsToSync = [
        { name: 'transactions', localKey: KEYS.TRANSACTIONS },
        { name: 'payees', localKey: KEYS.PAYEES },
        { name: 'recurring', localKey: KEYS.RECURRING },
        { name: 'investments', localKey: KEYS.INVESTMENTS },
        { name: 'goals', localKey: KEYS.GOALS }
    ];

    collectionsToSync.forEach(col => {
        const q = collection(db, 'users', userId, col.name);
        const unsub = onSnapshot(q, (snapshot) => {
            // Skip if all changes are local (hasPendingWrites)
            // This prevents infinite loops where Local Write -> Cloud Sync -> Listener -> Local Write
            if (snapshot.metadata.hasPendingWrites) return;

            const remoteData = [];
            snapshot.forEach(doc => {
                remoteData.push(doc.data());
            });

            // If we received data from cloud (that isn't just our own local write echoing back)
            // We update the local storage to match.
            // NOTE: This is a "Cloud Wins" strategy for simplicity. 
            // Ideally we'd merge, but for a personal finance app, replacing is usually fine 
            // as long as we don't overwrite unsynced local changes (which is handled by hasPendingWrites check mostly)

            if (remoteData.length > 0) {
                console.log(`Received ${remoteData.length} items from cloud for ${col.name}`);
                localStorage.setItem(col.localKey, JSON.stringify(remoteData));

                // Update Cache
                if (WebAdapter.cache[col.name]) {
                    WebAdapter.cache[col.name] = remoteData;
                }

                // Notify UI
                dispatchSaveEvent(`Sync: ${col.name} updated from other device`);

                // Force reload if needed (some components might not listen to dataSaved)
                // For now, dataSaved event is used by App.jsx to show toast, 
                // but components usually reload on mount or when context changes.
                // We might need a global "DataVersion" context to force re-renders.
                window.dispatchEvent(new CustomEvent('cloudDataUpdated', { detail: { collection: col.name } }));
            }
        }, (error) => {
            console.error(`Listener Error (${col.name}):`, error);
        });
        unsubscribeFunctions.push(unsub);
    });
};

// --- Cloud Sync Helpers ---
const updateLastActive = async (userId) => {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { lastUpdated: new Date().toISOString() }, { merge: true });
    } catch (err) {
        // Ignore errors here, not critical
    }
};

const syncToCloud = async (collectionName, data, isDelete = false) => {
    const user = auth.currentUser;
    if (!user) return; // Not logged in, skip

    try {
        const ref = doc(db, 'users', user.uid, collectionName, String(data.id));
        if (isDelete) {
            await deleteDoc(ref);
        } else {
            // Remove undefined values to avoid Firestore errors
            const cleanData = JSON.parse(JSON.stringify(data));
            await setDoc(ref, cleanData, { merge: true });
        }
        // Update Last Active Timestamp
        updateLastActive(user.uid);
    } catch (err) {
        console.error(`Cloud Sync Error (${collectionName}):`, err);
    }
};

const syncSettingsToCloud = async (settings) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const ref = doc(db, 'users', user.uid);
        await setDoc(ref, { settings }, { merge: true });
    } catch (err) {
        console.error('Cloud Sync Error (Settings):', err);
    }
};

// --- Hybrid Adapter ---
// Intercepts calls to window.api (Local) and replicates to Cloud (Async)
const HybridAdapter = new Proxy({}, {
    get: (target, prop) => {
        // 1. Get the Local Function (Electron or Web)
        let localFunc;
        if (isElectron() && window.api && typeof window.api[prop] === 'function') {
            localFunc = window.api[prop];
        } else {
            localFunc = WebAdapter[prop];
        }

        if (!localFunc) return undefined;

        // 2. Return a wrapped function
        return async (...args) => {
            // A. Execute Local (Await for UI consistency)
            const result = await localFunc(...args);

            // B. Execute Cloud (Fire & Forget - Don't await)
            // We use the 'result' for adds (to get ID) or 'args' for updates/deletes
            (async () => {
                try {
                    switch (prop) {
                        // Transactions
                        case 'addTransaction':
                            syncToCloud('transactions', result);
                            break;
                        case 'deleteTransaction':
                            syncToCloud('transactions', { id: args[0] }, true);
                            break;

                        // Payees
                        case 'addPayee':
                        case 'updatePayee':
                            syncToCloud('payees', result || args[0]);
                            break;
                        case 'deletePayee':
                            syncToCloud('payees', { id: args[0] }, true);
                            break;

                        // Recurring
                        case 'addRecurringRule':
                        case 'updateRecurringRule':
                            syncToCloud('recurring', result || args[0]);
                            break;
                        case 'deleteRecurringRule':
                            syncToCloud('recurring', { id: args[0] }, true);
                            break;

                        // Investments
                        case 'addInvestment':
                        case 'updateInvestment':
                            syncToCloud('investments', result || args[0]);
                            break;
                        case 'deleteInvestment':
                            syncToCloud('investments', { id: args[0] }, true);
                            break;

                        // Goals
                        case 'addGoal':
                        case 'updateGoal':
                            syncToCloud('goals', result || args[0]);
                            break;
                        case 'deleteGoal':
                            syncToCloud('goals', { id: args[0] }, true);
                            break;

                        // Settings
                        case 'updateUserSettings':
                            syncSettingsToCloud(result || args[0]);
                            break;

                        // Reconcile
                        case 'reconcileTransaction':
                            // Special case: args[0] is id, args[1] is status
                            // We need to fetch the full transaction or just update the field?
                            // For simplicity, we might skip or handle partial updates.
                            // Ideally, we should update the specific doc.
                            const user = auth.currentUser;
                            if (user) {
                                const ref = doc(db, 'users', user.uid, 'transactions', String(args[0]));
                                setDoc(ref, { reconciled: args[1] }, { merge: true });
                            }
                            break;
                    }
                } catch (bgError) {
                    console.warn('Background Sync Failed:', bgError);
                }
            })();

            return result;
        };
    }
});

export default HybridAdapter;
