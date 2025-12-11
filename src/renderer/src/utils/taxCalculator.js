// Tax Calculator Utility
// Supports both US and Indian tax systems

export const REGIONS = {
    US: 'US',
    INDIA: 'India'
};

// Tax configuration for different regions
export const TAX_CONFIG = {
    US: {
        taxYear: {
            start: { month: 0, day: 1 }, // Jan 1
            end: { month: 11, day: 31 }  // Dec 31
        },
        currency: 'USD',
        symbol: '$',
        standardDeduction: {
            single: 15750,
            married: 31500,
            headOfHousehold: 23625
        },
        deductibleCategories: [
            'Healthcare', // Medical expenses > 7.5% AGI
            'Education',  // Student loan interest
            'Donations',  // Charity
            'Home',       // Mortgage interest, Property tax
            'Retirement', // IRA/401k
            'Mortgage',
            'Charity',
            'Student Loan'
        ],
        capitalGains: {
            shortTerm: 'Taxed at ordinary income rate',
            longTerm: '15-20% based on income bracket',
            holdingPeriod: 365 // days
        }
    },
    India: {
        taxYear: {
            start: { month: 3, day: 1 }, // Apr 1
            end: { month: 2, day: 31 }   // Mar 31
        },
        currency: 'INR',
        symbol: '₹',
        deductibleCategories: [
            'Healthcare', // 80D
            'Education',  // 80E
            'Donations',  // 80G
            'Home',       // Home Loan Interest
            'Insurance'   // Life Insurance Premium
        ],
        capitalGains: {
            shortTerm: '15% for equity',
            longTerm: '10% above 1L for equity',
            holdingPeriod: 365 // days
        }
    }
};

/**
 * Get financial year based on date and region
 * @param {Date} date - The date to check
 * @param {string} region - 'US' or 'India'
 * @returns {object} - { year: string, startDate: Date, endDate: Date }
 */
export function getFinancialYear(date, region = REGIONS.US) {
    const d = new Date(date);
    const config = TAX_CONFIG[region];

    let fyYear;

    if (region === REGIONS.INDIA) {
        // Indian FY: Apr 1 to Mar 31
        if (d.getMonth() >= 3) { // Apr onwards
            fyYear = d.getFullYear();
        } else { // Jan-Mar
            fyYear = d.getFullYear() - 1;
        }

        const startDate = new Date(fyYear, 3, 1); // Apr 1
        const endDate = new Date(fyYear + 1, 2, 31); // Mar 31 next year

        return {
            year: `FY ${fyYear}-${(fyYear + 1).toString().slice(-2)}`,
            startDate,
            endDate
        };
    } else {
        // US Tax Year: Jan 1 to Dec 31
        fyYear = d.getFullYear();

        const startDate = new Date(fyYear, 0, 1); // Jan 1
        const endDate = new Date(fyYear, 11, 31); // Dec 31

        return {
            year: `${fyYear}`,
            startDate,
            endDate
        };
    }
}

/**
 * Check if a category is tax deductible in a region
 * @param {string} category - Transaction category
 * @param {string} region - 'US' or 'India'
 * @returns {boolean}
 */
export function isTaxDeductible(category, region = REGIONS.US) {
    const config = TAX_CONFIG[region];
    return config.deductibleCategories.some(dc =>
        category.toLowerCase().includes(dc.toLowerCase())
    );
}

/**
 * Calculate capital gains for an investment
 * @param {object} investment - Investment object with buyDate, sellDate, buyPrice, sellPrice, quantity
 * @param {string} region - 'US' or 'India'
 * @returns {object} - { gain, gainPercent, type, taxRate }
 */
export function calculateCapitalGains(investment, region = REGIONS.US) {
    const { buyDate, sellDate, buyPrice, sellPrice, quantity } = investment;

    const buyValue = buyPrice * quantity;
    const sellValue = sellPrice * quantity;
    const gain = sellValue - buyValue;
    const gainPercent = (gain / buyValue) * 100;

    // Calculate holding period
    const buyD = new Date(buyDate);
    const sellD = sellDate ? new Date(sellDate) : new Date();
    const holdingDays = Math.floor((sellD - buyD) / (1000 * 60 * 60 * 24));

    const config = TAX_CONFIG[region];
    const isLongTerm = holdingDays > config.capitalGains.holdingPeriod;

    return {
        gain,
        gainPercent,
        type: isLongTerm ? 'Long-term' : 'Short-term',
        taxRate: isLongTerm ? config.capitalGains.longTerm : config.capitalGains.shortTerm,
        holdingDays
    };
}

/**
 * Auto-detect user's region based on transaction currency
 * @param {Array} transactions - Array of transactions
 * @returns {string} - 'US' or 'India'
 */
export function autoDetectRegion(transactions) {
    if (!transactions || transactions.length === 0) {
        return REGIONS.US; // Default
    }

    const currencyCounts = transactions.reduce((acc, tx) => {
        const curr = tx.currency || 'INR'; // Default to INR if not specified
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
    }, {});

    const majorCurrency = Object.keys(currencyCounts).reduce((a, b) =>
        currencyCounts[a] > currencyCounts[b] ? a : b
    );

    return majorCurrency === 'USD' ? REGIONS.US : REGIONS.INDIA;
}

/**
 * Get list of financial years for dropdown
 * @param {string} region - 'US' or 'India'
 * @param {number} yearsBack - How many years back to show
 * @returns {Array} - Array of FY objects
 */
export function getFinancialYearOptions(region = REGIONS.US, yearsBack = 5) {
    const options = [];
    const currentDate = new Date();

    for (let i = 0; i <= yearsBack; i++) {
        const d = new Date(currentDate);
        d.setFullYear(currentDate.getFullYear() - i);

        const fy = getFinancialYear(d, region);
        options.push(fy);
    }

    return options;
}

/**
 * Convert amount to target currency
 * @param {number} amount - Amount in original currency
 * @param {string} fromCurrency - Original currency code
 * @param {string} toCurrency - Target currency code
 * @param {number} exchangeRate - Exchange rate (From -> Base) stored in transaction
 * @returns {number} - Converted amount
 */
export function convertCurrency(amount, fromCurrency, toCurrency, exchangeRate = 1) {
    if (fromCurrency === toCurrency) return amount;

    // If we have the direct rate (e.g. USD transaction, Base is INR, Target is INR)
    // The transaction.amount is ALREADY in Base Currency.
    // So if toCurrency === BaseCurrency, we should use transaction.amount directly.
    // But here we are taking raw params.

    // Simplified logic for this app:
    // We assume the input 'amount' passed here is the 'originalAmount' from the transaction
    // and 'exchangeRate' is the rate used to convert to Base Currency.

    // Case 1: Convert Foreign to Base (Standard)
    // amount (USD) * rate (USD->INR) = INR
    return amount * exchangeRate;
}

/**
 * Categorize transactions for tax purposes with currency conversion
 * @param {Array} transactions - Array of transactions
 * @param {string} region - 'US' or 'India'
 * @param {string} targetCurrency - Currency to report in (e.g. 'USD', 'INR')
 * @returns {object} - { income, deductible, nonDeductible } (amounts converted)
 */
export function categorizeTaxTransactions(transactions, region = REGIONS.US, targetCurrency = 'USD') {
    const income = [];
    const deductible = [];
    const nonDeductible = [];

    transactions.forEach(tx => {
        // Determine the amount in the target currency
        let finalAmount = parseFloat(tx.amount); // Default to stored base amount

        // If the user wants a report in a currency DIFFERENT from their Base Currency,
        // we have a problem because we only store Rate(Original -> Base).
        // We don't store Rate(Base -> Target).
        // For now, we assume Target Currency == Base Currency (99% use case).
        // If they differ, we might need to fetch a rate, but let's stick to the stored 'amount' 
        // which is already in the user's primary currency.

        // However, if the user explicitly changes the "Tax Currency" in the report to match the transaction's original currency,
        // we should use originalAmount.
        if (tx.currency === targetCurrency) {
            finalAmount = parseFloat(tx.originalAmount || tx.amount);
        }

        const processedTx = {
            ...tx,
            amount: finalAmount
        };

        if (tx.type === 'income') {
            income.push(processedTx);
        } else if (tx.type === 'expense') {
            if (isTaxDeductible(tx.category, region)) {
                deductible.push(processedTx);
            } else {
                nonDeductible.push(processedTx);
            }
        }
    });

    return { income, deductible, nonDeductible };
}

export default {
    REGIONS,
    TAX_CONFIG,
    getFinancialYear,
    isTaxDeductible,
    calculateCapitalGains,
    autoDetectRegion,
    getFinancialYearOptions,
    categorizeTaxTransactions,
    convertCurrency
};
