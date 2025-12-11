import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    getTransactions: () => ipcRenderer.invoke('get-transactions'),
    addTransaction: (transaction) => ipcRenderer.invoke('add-transaction', transaction),
    deleteTransaction: (id) => ipcRenderer.invoke('delete-transaction', id),
    // Recurring
    getRecurringRules: () => ipcRenderer.invoke('get-recurring'),
    addRecurringRule: (rule) => ipcRenderer.invoke('add-recurring', rule),
    updateRecurringRule: (rule) => ipcRenderer.invoke('update-recurring', rule),
    deleteRecurringRule: (id) => ipcRenderer.invoke('delete-recurring', id),
    // Investments
    getInvestments: () => ipcRenderer.invoke('get-investments'),
    addInvestment: (inv) => ipcRenderer.invoke('add-investment', inv),
    updateInvestment: (inv) => ipcRenderer.invoke('update-investment', inv),
    deleteInvestment: (id) => ipcRenderer.invoke('delete-investment', id),
    // Backup & Restore
    getAllData: () => ipcRenderer.invoke('export-data'),
    exportData: () => ipcRenderer.invoke('export-data'),
    importData: (data) => ipcRenderer.invoke('import-data', data),
    // Goals
    getGoals: () => ipcRenderer.invoke('get-goals'),
    addGoal: (goal) => ipcRenderer.invoke('add-goal', goal),
    updateGoal: (goal) => ipcRenderer.invoke('update-goal', goal),
    deleteGoal: (id) => ipcRenderer.invoke('delete-goal', id),
    // Budgets
    getBudgets: () => ipcRenderer.invoke('get-budgets'),
    saveBudgets: (budgets) => ipcRenderer.invoke('save-budgets', budgets),
    // Prices
    getStoredPrice: (symbol, exchange) => ipcRenderer.invoke('get-stored-price', symbol, exchange),
    saveStoredPrice: (symbol, exchange, priceData) => ipcRenderer.invoke('save-stored-price', symbol, exchange, priceData),
    // Alerts
    getAlerts: () => ipcRenderer.invoke('get-alerts'),
    addAlert: (alert) => ipcRenderer.invoke('add-alert', alert),
    updateAlert: (alert) => ipcRenderer.invoke('update-alert', alert),
    deleteAlert: (id) => ipcRenderer.invoke('delete-alert', id),
    // Payees
    getPayees: () => ipcRenderer.invoke('get-payees'),
    addPayee: (payee) => ipcRenderer.invoke('add-payee', payee),
    updatePayee: (payee) => ipcRenderer.invoke('update-payee', payee),
    deletePayee: (id) => ipcRenderer.invoke('delete-payee', id),
    // Accounts
    getAccounts: () => ipcRenderer.invoke('get-accounts'),
    addAccount: (account) => ipcRenderer.invoke('add-account', account),
    updateAccount: (account) => ipcRenderer.invoke('update-account', account),
    deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
    reconcileTransaction: (id, status) => ipcRenderer.invoke('reconcile-transaction', id, status),
    // Attachments
    selectFile: () => ipcRenderer.invoke('select-file'),
    saveAttachment: (filePath, transactionId) => ipcRenderer.invoke('save-attachment', filePath, transactionId),
    getAttachmentPath: (attachmentId, filename) => ipcRenderer.invoke('get-attachment-path', attachmentId, filename),
    deleteAttachment: (transactionId, attachmentId) => ipcRenderer.invoke('delete-attachment', transactionId, attachmentId),
    // User Settings
    fetchStockPrice: (symbol, exchange) => ipcRenderer.invoke('fetch-stock-price', symbol, exchange),
    getUserSettings: () => ipcRenderer.invoke('get-user-settings'),
    updateUserSettings: (settings) => ipcRenderer.invoke('update-user-settings', settings),
    // Data Management
    clearAllData: () => ipcRenderer.invoke('clear-all-data'),
    resetApp: () => ipcRenderer.invoke('reset-app'),
    saveBackup: (content, filename) => ipcRenderer.invoke('save-backup', content, filename),
    // Window Focus Events
    onWindowFocus: (callback) => ipcRenderer.on('window-focus', callback),
    onWindowBlur: (callback) => ipcRenderer.on('window-blur', callback),
    removeWindowFocusListener: () => ipcRenderer.removeAllListeners('window-focus'),
    removeWindowBlurListener: () => ipcRenderer.removeAllListeners('window-blur'),
    // TradingView Auth Intercept
    onTradingViewAuth: (callback) => ipcRenderer.on('tradingview-auth-required', callback),
    removeTradingViewAuthListener: () => ipcRenderer.removeAllListeners('tradingview-auth-required')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    window.electron = electronAPI
    window.api = api
}
