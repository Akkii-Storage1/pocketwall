// CSV Parser Utility
// Parses bank statement CSV files and converts to PocketWall transactions

/**
 * Detect bank format from CSV headers
 * @param {Array} headers - CSV header row
 * @returns {string} - Detected bank format
 */
function detectBankFormat(headers) {
    const headerStr = headers.join(',').toLowerCase();

    if (headerStr.includes('sbi') || (headerStr.includes('txn date') && headerStr.includes('value date'))) {
        return 'SBI';
    }
    if (headerStr.includes('icici') || (headerStr.includes('value date') && headerStr.includes('particulars'))) {
        return 'ICICI';
    }
    if (headerStr.includes('hdfc') || (headerStr.includes('narration') && headerStr.includes('chq/ref'))) {
        return 'HDFC';
    }
    if (headerStr.includes('axis') || headerStr.includes('tran date')) {
        return 'Axis';
    }
    if (headerStr.includes('chase') || headerStr.includes('posting date')) {
        return 'Chase';
    }

    // Generic format
    return 'Generic';
}

/**
 * Parse CSV text to array of rows
 * @param {string} csvText - Raw CSV text
 * @returns {Array<Array>} - 2D array of rows
 */
function parseCSVToArray(csvText) {
    const lines = csvText.trim().split('\n');
    const result = [];

    for (const line of lines) {
        // Simple CSV parsing (doesn't handle complex cases with quotes)
        const row = line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        result.push(row);
    }

    return result;
}

/**
 * Map CSV row to transaction object based on bank format
 * @param {Array} row - CSV row
 * @param {string} format - Bank format
 * @param {Array} headers - Header row  
 * @returns {object|null} - Transaction object or null
 */
function mapRowToTransaction(row, format, headers) {
    try {
        switch (format) {
            case 'SBI':
                return {
                    date: parseDate(row[0]), // Txn Date
                    description: row[2] || '', // Description
                    payee: extractPayee(row[2]),
                    amount: parseAmount(row[5]), // Withdrawal/Deposit
                    type: parseFloat(row[5]) < 0 ? 'expense' : 'income',
                    category: 'Uncategorized',
                    currency: 'INR'
                };

            case 'ICICI':
                return {
                    date: parseDate(row[1]), // Value Date
                    description: row[2] || '', // Transaction Details
                    payee: extractPayee(row[2]),
                    amount: parseAmount(row[3] || row[4]), // Debit/Credit
                    type: row[3] ? 'expense' : 'income',
                    category: 'Uncategorized',
                    currency: 'INR'
                };

            case 'HDFC':
                return {
                    date: parseDate(row[0]), // Date
                    description: row[1] || '', // Narration
                    payee: extractPayee(row[1]),
                    amount: parseAmount(row[3] || row[4]), // Withdrawal/Deposit
                    type: row[3] ? 'expense' : 'income',
                    category: 'Uncategorized',
                    currency: 'INR'
                };

            case 'Axis':
                return {
                    date: parseDate(row[0]), // Tran Date
                    description: row[2] || '', // Description
                    payee: extractPayee(row[2]),
                    amount: parseAmount(row[4]), // Amount
                    type: row[3] === 'DR' ? 'expense' : 'income',
                    category: 'Uncategorized',
                    currency: 'INR'
                };

            case 'Chase':
                return {
                    date: parseDate(row[1]), // Posting Date
                    description: row[2] || '', // Description
                    payee: extractPayee(row[2]),
                    amount: parseAmount(row[5]), // Amount
                    type: parseFloat(row[5]) < 0 ? 'expense' : 'income',
                    category: 'Uncategorized',
                    currency: 'USD'
                };

            case 'Generic':
                // Try to intelligently map columns
                return {
                    date: parseDate(row[0]),
                    description: row[1] || row[2] || '',
                    payee: extractPayee(row[1] || row[2]),
                    amount: parseAmount(findAmountColumn(row)),
                    type: parseFloat(findAmountColumn(row)) < 0 ? 'expense' : 'income',
                    category: 'Uncategorized',
                    currency: 'INR'
                };

            default:
                return null;
        }
    } catch (error) {
        console.error('Error mapping row:', error, row);
        return null;
    }
}

/**
 * Parse date string to YYYY-MM-DD format
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date
 */
function parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Try various formats
    const formats = [
        /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
        /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
        /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /(\d{2})\/(\d{2})\/(\d{2})/, // DD/MM/YY
    ];

    for (const regex of formats) {
        const match = dateStr.match(regex);
        if (match) {
            if (match[0].startsWith('20') || match[0].startsWith('19')) {
                // YYYY-MM-DD
                return `${match[1]}-${match[2]}-${match[3]}`;
            } else {
                // DD/MM/YYYY or DD-MM-YYYY
                const year = match[3].length === 2 ? `20${match[3]}` : match[3];
                return `${year}-${match[2]}-${match[1]}`;
            }
        }
    }

    // Fallback: try to parse as Date object
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
}

/**
 * Parse amount string to number
 * @param {string} amountStr - Amount string
 * @returns {number} - Parsed amount
 */
function parseAmount(amountStr) {
    if (!amountStr) return 0;

    // Remove currency symbols and commas
    const cleaned = amountStr.replace(/[₹$,]/g, '').trim();

    // Handle credit/debit notations
    if (cleaned.endsWith('Cr') || cleaned.endsWith('CR')) {
        return Math.abs(parseFloat(cleaned.replace(/Cr|CR/g, '')));
    }
    if (cleaned.endsWith('Dr') || cleaned.endsWith('DR')) {
        return -Math.abs(parseFloat(cleaned.replace(/Dr|DR/g, '')));
    }

    return parseFloat(cleaned) || 0;
}

/**
 * Extract payee name from description
 * @param {string} description - Transaction description
 * @returns {string} - Extracted payee
 */
function extractPayee(description) {
    if (!description) return '';

    // Remove common prefixes
    let payee = description
        .replace(/^(UPI|NEFT|IMPS|RTGS|ATM|POS|DEBIT CARD|CREDIT CARD)-/i, '')
        .replace(/^\d{12,16}\//, '') // Remove account numbers
        .trim();

    // Take first meaningful part
    const parts = payee.split(/[-/\\]/);
    payee = parts[0] || parts[1] || payee;

    return payee.substring(0, 50); // Limit length
}

/**
 * Find amount column in generic CSV
 * @param {Array} row - CSV row
 * @returns {string} - Amount value
 */
function findAmountColumn(row) {
    // Look for columns with numbers
    for (const cell of row.reverse()) {
        const cleaned = cell.replace(/[₹$,]/g, '').trim();
        if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
            return cell;
        }
    }
    return '0';
}

/**
 * Parse CSV file and convert to transactions
 * @param {string} csvText - Raw CSV text
 * @param {string} bankFormat - Optional bank format (auto-detected if not provided)
 * @returns {Array<object>} - Array of transactions
 */
export function parseCSV(csvText, bankFormat = 'auto') {
    const rows = parseCSVToArray(csvText);

    if (rows.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = rows[0];
    const format = bankFormat === 'auto' ? detectBankFormat(headers) : bankFormat;

    console.log(`Detected bank format: ${format}`);

    const transactions = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
        const transaction = mapRowToTransaction(rows[i], format, headers);
        if (transaction && transaction.amount !== 0) {
            transactions.push(transaction);
        }
    }

    return transactions;
}

/**
 * Get list of supported bank formats
 * @returns {Array<string>} - Array of bank names
 */
export function getSupportedBanks() {
    return ['SBI', 'ICICI', 'HDFC', 'Axis', 'Chase', 'Generic'];
}

export default {
    parseCSV,
    getSupportedBanks
};
