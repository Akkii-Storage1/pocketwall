import { app, shell, BrowserWindow, ipcMain, dialog, net } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import {
    initDatabase,
    getTransactions,
    addTransaction,
    deleteTransaction,
    getRecurringRules,
    addRecurringRule,
    updateRecurringRule,
    deleteRecurringRule,
    getInvestments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    getData,
    importData,
    getGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    getBudgets,
    saveBudgets,
    getStoredPrice,
    saveStoredPrice,
    getAlerts,
    addAlert,
    updateAlert,
    deleteAlert,
    getPayees,
    addPayee,
    updatePayee,
    deletePayee,
    getAccounts,
    addAccount,
    updateAccount,
    deleteAccount,
    reconcileTransaction,
    getAttachmentsPath,
    saveAttachment,
    addAttachmentToTransaction,
    removeAttachmentFromTransaction,
    getUserSettings,
    updateUserSettings,
    clearAllData,
    resetApp
} from './db'

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            webviewTag: true,  // Enable webview for embedding external sites
            // Voice/Microphone permissions for Web Speech API
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    // Enable microphone permissions for Web Speech API
    const { session } = require('electron');
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'microphone', 'audioCapture'];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
    });

    // Also allow permission check handler
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        const allowedPermissions = ['media', 'microphone', 'audioCapture'];
        return allowedPermissions.includes(permission);
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    // FIX: Input focus blocking issue
    // When window loses and regains focus, force a re-render of the webContents
    mainWindow.on('focus', () => {
        // Send focus event to renderer
        mainWindow.webContents.send('window-focus');
        // Force repaint to fix input focus
        mainWindow.webContents.invalidate();
    })

    mainWindow.on('blur', () => {
        mainWindow.webContents.send('window-blur');
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        const url = details.url.toLowerCase();

        // INTERCEPT: TradingView auth/login/signup - don't open browser, notify renderer
        if (url.includes('tradingview.com/accounts') ||
            url.includes('tradingview.com/pricing') ||
            url.includes('tradingview.com/gopro') ||
            url.includes('tradingview.com/#signin') ||
            url.includes('accounts.tradingview.com')) {
            console.log('🚫 Intercepted TradingView auth:', url);
            mainWindow.webContents.send('tradingview-auth-required');
            return { action: 'deny' }
        }

        // Allow Google Sign-In and Firebase Auth popups to open in a new window
        if (url.includes('google.com') || url.includes('firebaseapp.com') || url.includes('auth')) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    autoHideMenuBar: true,
                    width: 600,
                    height: 700,
                    center: true,
                    alwaysOnTop: true
                }
            }
        }

        // Open other external links in the default browser
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // INTERCEPT: Handle webview new-window events for TradingView charts
    app.on('web-contents-created', (_, contents) => {
        if (contents.getType() === 'webview') {
            contents.setWindowOpenHandler((details) => {
                const url = details.url.toLowerCase();
                if (url.includes('tradingview.com/accounts') ||
                    url.includes('tradingview.com/pricing') ||
                    url.includes('tradingview.com/gopro') ||
                    url.includes('accounts.tradingview.com')) {
                    console.log('🚫 Webview: Intercepted TradingView auth:', url);
                    mainWindow.webContents.send('tradingview-auth-required');
                    return { action: 'deny' }
                }
                // Deny all other new windows from webview
                return { action: 'deny' }
            });

            // Also intercept navigation within webview
            contents.on('will-navigate', (event, url) => {
                if (url.includes('tradingview.com/accounts') ||
                    url.includes('tradingview.com/pricing') ||
                    url.includes('tradingview.com/gopro')) {
                    console.log('🚫 Webview navigate blocked:', url);
                    event.preventDefault();
                    mainWindow.webContents.send('tradingview-auth-required');
                }
            });
        }
    });

    // Load the remote URL for development or the local html file for production.
    if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        // DevTools can be opened with F12 if needed
        // mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Enable F12 to toggle DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') {
            mainWindow.webContents.toggleDevTools()
        }
    })
}

app.whenReady().then(() => {
    // Set app user model id for windows
    app.setAppUserModelId('com.pocketwall')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
        // optimizer.watchWindowShortcuts(window)
    })

    // Initialize Database
    initDatabase()

    // IPC Handlers
    ipcMain.handle('get-transactions', () => {
        return getTransactions()
    })

    ipcMain.handle('add-transaction', (event, transaction) => {
        return addTransaction(transaction)
    })

    ipcMain.handle('delete-transaction', (event, id) => {
        return deleteTransaction(id)
    })

    // Recurring IPC
    ipcMain.handle('get-recurring', () => getRecurringRules())
    ipcMain.handle('add-recurring', (e, rule) => addRecurringRule(rule))
    ipcMain.handle('update-recurring', (e, rule) => updateRecurringRule(rule))
    ipcMain.handle('delete-recurring', (e, id) => deleteRecurringRule(id))

    // Investment IPC
    ipcMain.handle('get-investments', () => getInvestments())
    ipcMain.handle('add-investment', (e, inv) => addInvestment(inv))
    ipcMain.handle('update-investment', (e, inv) => updateInvestment(inv))
    ipcMain.handle('delete-investment', (e, id) => deleteInvestment(id))

    // Backup & Restore IPC
    ipcMain.handle('export-data', () => getData())
    ipcMain.handle('import-data', (e, data) => importData(data))

    // Goals IPC
    ipcMain.handle('get-goals', () => getGoals())
    ipcMain.handle('add-goal', (e, goal) => addGoal(goal))
    ipcMain.handle('update-goal', (e, goal) => updateGoal(goal))
    ipcMain.handle('delete-goal', (e, id) => deleteGoal(id))

    // Budgets IPC
    ipcMain.handle('get-budgets', () => getBudgets())
    ipcMain.handle('save-budgets', (e, budgets) => saveBudgets(budgets))

    // Prices IPC
    ipcMain.handle('get-stored-price', (_, s, e) => getStoredPrice(s, e))
    ipcMain.handle('save-stored-price', (_, s, e, p) => saveStoredPrice(s, e, p))

    // Alerts IPC
    ipcMain.handle('get-alerts', () => getAlerts())
    ipcMain.handle('add-alert', (_, alert) => addAlert(alert))
    ipcMain.handle('update-alert', (_, alert) => updateAlert(alert))
    ipcMain.handle('delete-alert', (_, id) => deleteAlert(id))

    // Payees IPC
    ipcMain.handle('get-payees', () => getPayees())
    ipcMain.handle('add-payee', (_, payee) => addPayee(payee))
    ipcMain.handle('update-payee', (_, payee) => updatePayee(payee))
    ipcMain.handle('delete-payee', (_, id) => deletePayee(id))

    // Accounts IPC
    ipcMain.handle('get-accounts', () => getAccounts())
    ipcMain.handle('add-account', (_, account) => addAccount(account))
    ipcMain.handle('update-account', (_, account) => updateAccount(account))
    ipcMain.handle('delete-account', (_, id) => deleteAccount(id))
    ipcMain.handle('reconcile-transaction', (_, id, status) => reconcileTransaction(id, status))

    // Attachments IPC
    ipcMain.handle('select-file', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
            ]
        });
        return result.canceled ? null : result.filePaths[0];
    })

    ipcMain.handle('save-attachment', async (_, filePath, transactionId) => {
        try {
            const attachmentMeta = saveAttachment(filePath);
            const transaction = addAttachmentToTransaction(transactionId, attachmentMeta);
            return { success: true, attachment: attachmentMeta, transaction };
        } catch (err) {
            return { success: false, error: err.message };
        }
    })

    ipcMain.handle('get-attachment-path', (_, attachmentId, filename) => {
        return join(getAttachmentsPath(), filename);
    })

    ipcMain.handle('delete-attachment', (_, transactionId, attachmentId) => {
        const transaction = removeAttachmentFromTransaction(transactionId, attachmentId);
        return { success: !!transaction, transaction };
    })

    // User Settings IPC
    ipcMain.handle('get-user-settings', () => getUserSettings())
    ipcMain.handle('update-user-settings', (_, settings) => updateUserSettings(settings))

    // Data Management IPC
    ipcMain.handle('clear-all-data', () => clearAllData())
    ipcMain.handle('reset-app', () => resetApp())

    ipcMain.handle('save-backup', async (_, content, defaultFilename) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title: 'Save Backup',
            defaultPath: defaultFilename,
            filters: [{ name: 'JSON Files', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }]
        });

        if (canceled || !filePath) return false;

        try {
            writeFileSync(filePath, content, 'utf8');
            return true;
        } catch (e) {
            console.error('Failed to save backup file:', e);
            throw e;
        }
    })

    // Stock Price IPC
    ipcMain.handle('fetch-stock-price', async (_, symbol, exchange) => {
        return new Promise((resolve, reject) => {
            const suffix = exchange === 'NSE' ? 'NS' : 'BO';
            const yahooSymbol = `${symbol}.${suffix}`;

            // Switch to Chart API (v8) - More reliable for Indian stocks
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`;

            const request = net.request(url);
            request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            request.on('response', (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });
                response.on('end', () => {
                    try {
                        if (response.statusCode !== 200) {
                            console.error(`Yahoo Finance API returned status: ${response.statusCode} for ${symbol}`);
                            resolve(null);
                            return;
                        }

                        const json = JSON.parse(data);
                        if (json.chart && json.chart.result && json.chart.result.length > 0) {
                            const result = json.chart.result[0];
                            const meta = result.meta;

                            resolve({
                                price: meta.regularMarketPrice,
                                change: meta.regularMarketPrice - meta.chartPreviousClose,
                                changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
                                currency: meta.currency,
                                symbol: meta.symbol,
                                name: meta.longName || meta.shortName || meta.symbol
                            });
                        } else {
                            console.error(`No chart data found for ${symbol}`);
                            resolve(null);
                        }
                    } catch (e) {
                        console.error(`Error parsing Yahoo Finance response for ${symbol}:`, e);
                        resolve(null);
                    }
                });
            });

            request.on('error', (error) => {
                console.error(`Network error fetching stock price for ${symbol}:`, error);
                resolve(null);
            });

            request.end();
        });
    })

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
