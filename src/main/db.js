// Database using JSON file
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync, statSync } from 'fs'

let dbPath
let attachmentsPath
let db = { transactions: [], settings: {} }

export function initDatabase() {
    const userDataPath = app.getPath('userData')
    dbPath = join(userDataPath, 'pocketwall-data.json')

    console.log('Initializing database at:', dbPath)

    if (existsSync(dbPath)) {
        try {
            const data = readFileSync(dbPath, 'utf8')
            db = JSON.parse(data)
        } catch (err) {
            console.error('Error loading database:', err)
            db = { transactions: [], settings: {} }
        }
    }

    if (!db.transactions) db.transactions = []
    if (!db.settings) db.settings = {}
    if (!db.accounts) db.accounts = []

    // Migration: Create default account if none exist and assign transactions
    if (db.accounts.length === 0) {
        console.log('Migrating to Multi-Account: Creating default account');
        const defaultAccount = {
            id: 'acc_main',
            name: 'Main Account',
            type: 'Bank',
            balance: 0
        };
        db.accounts.push(defaultAccount);

        // Assign all existing transactions to this account
        let migratedCount = 0;
        db.transactions.forEach(t => {
            if (!t.accountId) {
                t.accountId = defaultAccount.id;
                t.reconciled = false;
                migratedCount++;
            }
        });
        console.log(`Migrated ${migratedCount} transactions to Main Account`);
        saveDb();
    }

    if (!db.payees) db.payees = [];

    // Initialize user settings with defaults
    if (!db.settings.user) {
        db.settings.user = {
            name: '',
            defaultCurrency: 'INR'
        };
        console.log('Initialized user settings with default currency: INR');
        saveDb();
    }

    // Initialize attachments folder
    attachmentsPath = join(userDataPath, 'attachments');
    if (!existsSync(attachmentsPath)) {
        mkdirSync(attachmentsPath, { recursive: true });
        console.log('Created attachments folder at:', attachmentsPath);
    }

    return db
}

function saveDb() {
    try {
        writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
    } catch (err) {
        console.error('Error saving database:', err)
    }
}

export function getTransactions() {
    return db.transactions.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function addTransaction(transaction) {
    const newTransaction = {
        id: Date.now(),
        ...transaction,
        amount: parseFloat(transaction.amount),
        accountId: transaction.accountId || (db.accounts[0] ? db.accounts[0].id : 'acc_main'),
        reconciled: false,
        attachments: transaction.attachments || []
    }
    db.transactions.push(newTransaction)
    saveDb()
    return newTransaction
}

// --- Attachments ---

export function getAttachmentsPath() {
    return attachmentsPath;
}

export function saveAttachment(sourceFilePath) {
    try {
        const timestamp = Date.now();
        const originalName = sourceFilePath.split(/[\\/]/).pop(); // Get filename from path
        const ext = originalName.split('.').pop();
        const attachmentId = `att_${timestamp}`;
        const filename = `${attachmentId}.${ext}`;
        const destPath = join(attachmentsPath, filename);

        // Copy file to attachments folder
        copyFileSync(sourceFilePath, destPath);

        // Get file stats
        const stats = statSync(destPath);

        return {
            id: attachmentId,
            filename: filename,
            originalName: originalName,
            size: stats.size,
            type: `image/${ext}`,
            addedAt: new Date().toISOString()
        };
    } catch (err) {
        console.error('Error saving attachment:', err);
        throw err;
    }
}

export function deleteAttachment(attachmentId) {
    try {
        const files = db.transactions.flatMap(t => t.attachments || []);
        const attachment = files.find(a => a.id === attachmentId);

        if (attachment) {
            const filePath = join(attachmentsPath, attachment.filename);
            if (existsSync(filePath)) {
                unlinkSync(filePath);
            }
        }
        return true;
    } catch (err) {
        console.error('Error deleting attachment:', err);
        return false;
    }
}

export function addAttachmentToTransaction(transactionId, attachmentMeta) {
    const transaction = db.transactions.find(t => t.id === parseInt(transactionId));
    if (transaction) {
        if (!transaction.attachments) {
            transaction.attachments = [];
        }
        transaction.attachments.push(attachmentMeta);
        saveDb();
        return transaction;
    }
    return null;
}

export function removeAttachmentFromTransaction(transactionId, attachmentId) {
    const transaction = db.transactions.find(t => t.id === parseInt(transactionId));
    if (transaction && transaction.attachments) {
        // Delete the file
        deleteAttachment(attachmentId);

        // Remove from transaction
        transaction.attachments = transaction.attachments.filter(a => a.id !== attachmentId);
        saveDb();
        return transaction;
    }
    return null;
}

export function deleteTransaction(id) {
    db.transactions = db.transactions.filter((t) => t.id !== id)
    saveDb()
    return true
}

// Recurring Rules
export function getRecurringRules() {
    return db.recurring || []
}

export function addRecurringRule(rule) {
    if (!db.recurring) db.recurring = []
    const newRule = {
        id: Date.now(),
        ...rule,
        amount: parseFloat(rule.amount)
    }
    db.recurring.push(newRule)
    saveDb()
    return newRule
}

export function updateRecurringRule(rule) {
    if (!db.recurring) return null
    db.recurring = db.recurring.map(r => r.id === rule.id ? rule : r)
    saveDb()
    return rule
}

export function deleteRecurringRule(id) {
    if (!db.recurring) return false
    db.recurring = db.recurring.filter(r => r.id !== id)
    saveDb()
    return true
}

// Investments
export function getInvestments() {
    return db.investments || []
}

export function addInvestment(investment) {
    if (!db.investments) db.investments = []
    const newInv = {
        id: Date.now(),
        ...investment
    }
    db.investments.push(newInv)
    saveDb()
    return newInv
}

export function updateInvestment(investment) {
    if (!db.investments) return null
    db.investments = db.investments.map(i => i.id === investment.id ? investment : i)
    saveDb()
    return investment
}

export function deleteInvestment(id) {
    if (!db.investments) return false
    db.investments = db.investments.filter(i => i.id !== id)
    saveDb()
    return true
}

// Goals
export function getGoals() {
    return db.goals || []
}

export function addGoal(goal) {
    if (!db.goals) db.goals = []
    const newGoal = {
        id: Date.now(),
        ...goal,
        currentAmount: parseFloat(goal.currentAmount) || 0,
        targetAmount: parseFloat(goal.targetAmount)
    }
    db.goals.push(newGoal)
    saveDb()
    return newGoal
}

export function updateGoal(goal) {
    if (!db.goals) return null
    db.goals = db.goals.map(g => g.id === goal.id ? goal : g)
    saveDb()
    return goal
}

export function deleteGoal(id) {
    if (!db.goals) return false
    db.goals = db.goals.filter(g => g.id !== id)
    saveDb()
    return true
}

// Budgets
export function getBudgets() {
    return db.budgets || {}
}

export function saveBudgets(budgets) {
    db.budgets = budgets
    saveDb()
    return budgets
}

// Prices (Persistence)
export function getStoredPrice(symbol, exchange) {
    if (!db.prices) return null;
    const key = `${symbol}_${exchange}`;
    return db.prices[key] || null;
}

export function saveStoredPrice(symbol, exchange, priceData) {
    if (!db.prices) db.prices = {};
    const key = `${symbol}_${exchange}`;
    db.prices[key] = priceData;
    saveDb();
    return true;
}

// Payees
export function getPayees() {
    const payees = {};

    // Start with manual payees
    db.payees.forEach(p => {
        payees[p.name] = {
            name: p.name,
            count: 0,
            lastCategory: '',
            totalSpent: 0,
            isManual: true
        };
    });

    // Add/merge transaction-based payees
    db.transactions.forEach(t => {
        if (t.payee) {
            if (!payees[t.payee]) {
                payees[t.payee] = { name: t.payee, count: 0, lastCategory: t.category, totalSpent: 0, isManual: false };
            }
            payees[t.payee].count++;
            if (t.type === 'expense') {
                payees[t.payee].totalSpent += parseFloat(t.amount);
            }
            // Update last category from most recent transaction
            payees[t.payee].lastCategory = t.category;
        }
    });
    return Object.values(payees).sort((a, b) => b.count - a.count);
}

export function addPayee(payee) {
    const newPayee = {
        id: 'payee_' + Date.now(),
        name: payee.name
    };
    db.payees.push(newPayee);
    saveDb();
    return newPayee;
}

export function updatePayee(payee) {
    const index = db.payees.findIndex(p => p.id === payee.id);
    if (index !== -1) {
        db.payees[index] = { ...db.payees[index], ...payee };
        saveDb();
        return db.payees[index];
    }
    return null;
}

export function deletePayee(id) {
    db.payees = db.payees.filter(p => p.id !== id);
    saveDb();
    return true;
}

// --- Accounts ---

export function getAccounts() {
    // Calculate dynamic balance for each account based on transactions
    return db.accounts.map(acc => {
        const balance = db.transactions
            .filter(t => t.accountId === acc.id)
            .reduce((sum, t) => {
                const amount = parseFloat(t.amount);
                return t.type === 'income' ? sum + amount : sum - amount;
            }, parseFloat(acc.initialBalance || 0));

        return { ...acc, currentBalance: balance };
    });
}

export function addAccount(account) {
    const newAccount = {
        id: 'acc_' + Date.now(),
        ...account,
        initialBalance: parseFloat(account.initialBalance || 0)
    };
    db.accounts.push(newAccount);
    saveDb();
    return newAccount;
}

export function updateAccount(account) {
    const index = db.accounts.findIndex(a => a.id === account.id);
    if (index !== -1) {
        db.accounts[index] = { ...db.accounts[index], ...account };
        saveDb();
    }
}

export function deleteAccount(id) {
    // Prevent deleting if transactions exist? For now, just delete.
    db.accounts = db.accounts.filter(a => a.id !== id);
    // Optional: Remove transactions or move them?
    saveDb();
}

export function reconcileTransaction(id, status) {
    const index = db.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        db.transactions[index].reconciled = status;
        saveDb();
    }
}

export function getData() {
    return db
}

export function importData(newData) {
    if (!newData || typeof newData !== 'object') return false
    db = newData
    // Ensure structure
    if (!db.transactions) db.transactions = []
    if (!db.settings) db.settings = {}
    if (!db.recurring) db.recurring = []
    if (!db.investments) db.investments = []
    if (!db.goals) db.goals = []

    saveDb()
    return true
}

// User Settings
export function getUserSettings() {
    return db.settings.user || { name: '', defaultCurrency: 'INR' };
}

export function updateUserSettings(userSettings) {
    db.settings.user = { ...db.settings.user, ...userSettings };
    saveDb();
    return db.settings.user;
}

// Alerts
export function getAlerts() {
    return db.alerts || [];
}

export function addAlert(alert) {
    if (!db.alerts) db.alerts = [];
    const newAlert = {
        id: 'alert_' + Date.now(),
        ...alert,
        createdAt: new Date().toISOString()
    };
    db.alerts.push(newAlert);
    saveDb();
    return newAlert;
}

export function updateAlert(alert) {
    if (!db.alerts) return null;
    const index = db.alerts.findIndex(a => a.id === alert.id);
    if (index !== -1) {
        db.alerts[index] = { ...db.alerts[index], ...alert };
        saveDb();
        return db.alerts[index];
    }
    return null;
}

export function deleteAlert(id) {
    if (!db.alerts) return false;
    db.alerts = db.alerts.filter(a => a.id !== id);
    saveDb();
    return true;
}

export function clearAllData() {
    console.log('Main Process: Clearing User Data (Keeping Settings)');

    // Keep settings
    const settings = { ...db.settings };

    // Reset DB structure
    db = {
        transactions: [],
        settings: settings,
        accounts: [],
        payees: [],
        recurring: [],
        investments: [],
        goals: [],
        budgets: {},
        alerts: [],
        friends: [],
        shared_expenses: [],
        reminders: [],
        loans: [],
        assets: [],
        charity: [],
        prices: {}
    };

    // Re-initialize default account
    const defaultAccount = {
        id: 'acc_main',
        name: 'Main Account',
        type: 'Bank',
        balance: 0
    };
    db.accounts.push(defaultAccount);

    saveDb();
    console.log('Data Cleared Successfully');
    return true;
}

export function resetApp() {
    console.log('Main Process: Performing Factory Reset');

    try {
        // 1. Delete the database file
        if (existsSync(dbPath)) {
            try {
                unlinkSync(dbPath);
                console.log('Deleted database file');
            } catch (e) {
                console.error('Failed to delete db file', e);
                throw new Error(`Failed to delete database file: ${e.message}`);
            }
        }

        // 2. Delete attachments
        if (existsSync(attachmentsPath)) {
            try {
                rmSync(attachmentsPath, { recursive: true, force: true });
                console.log('Deleted attachments folder');
            } catch (e) {
                console.error('Failed to delete attachments', e);
                // We don't throw here, as this is less critical than the DB
            }
        }

        // Recreate empty attachments folder
        if (!existsSync(attachmentsPath)) {
            mkdirSync(attachmentsPath, { recursive: true });
        }

        // 3. Reset Memory State
        db = {
            transactions: [],
            settings: {
                user: {
                    name: '',
                    defaultCurrency: 'INR'
                }
            },
            accounts: [],
            payees: [],
            recurring: [],
            investments: [],
            goals: [],
            budgets: {},
            alerts: [],
            friends: [],
            shared_expenses: [],
            reminders: [],
            loans: [],
            assets: [],
            charity: [],
            prices: {}
        };

        // 4. Re-initialize default account
        const defaultAccount = {
            id: 'acc_main',
            name: 'Main Account',
            type: 'Bank',
            balance: 0
        };
        db.accounts.push(defaultAccount);

        // 5. Save new fresh DB
        saveDb();

        console.log('Factory Reset Complete');
        return true;
    } catch (error) {
        console.error('Factory Reset Failed:', error);
        throw error;
    }
}
