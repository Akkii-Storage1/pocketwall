/**
 * Smart Tagging Utility
 * Handles auto-tagging and auto-categorization logic based on merchant names and keywords
 */

export const SMART_TAG_RULES = [
    // Food & Dining
    { keywords: ['swiggy', 'zomato', 'uber eats', 'restaurant', 'cafe', 'starbucks', 'mcdonalds', 'kfc', 'pizza', 'burger'], tag: 'Food' },
    { keywords: ['grocery', 'supermarket', 'mart', 'bigbasket', 'blinkit', 'zepto'], tag: 'Groceries' },

    // Transport
    { keywords: ['uber', 'ola', 'rapido', 'fuel', 'petrol', 'diesel', 'shell', 'hpcl', 'bpcl'], tag: 'Transport' },

    // Shopping
    { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'uniqlo', 'shopping', 'mall'], tag: 'Shopping' },

    // Entertainment
    { keywords: ['netflix', 'spotify', 'prime video', 'hotstar', 'cinema', 'pvr', 'inox', 'bookmyshow'], tag: 'Entertainment' },

    // Utilities
    { keywords: ['electricity', 'water', 'gas', 'broadband', 'wifi', 'jio', 'airtel', 'vi', 'bill'], tag: 'Utilities' },

    // Health
    { keywords: ['pharmacy', 'hospital', 'clinic', 'doctor', 'medplus', 'apollo'], tag: 'Health' },

    // Travel
    { keywords: ['flight', 'hotel', 'airbnb', 'makemytrip', 'goibibo', 'irctc', 'train', 'bus'], tag: 'Travel' }
];

// Category Auto-suggestion Rules
export const CATEGORY_RULES = {
    'Food': ['swiggy', 'zomato', 'uber eats', 'food', 'restaurant', 'cafe', 'starbucks', 'mcdonalds', 'kfc', 'dominos', 'pizza', 'burger'],
    'Groceries': ['grocery', 'supermarket', 'dmart', 'reliance fresh', 'more', 'bigbasket', 'blinkit', 'zepto', 'dunzo'],
    'Transport': ['uber', 'ola', 'rapido', 'taxi', 'cab', 'fuel', 'petrol', 'diesel', 'gas station', 'shell', 'hpcl', 'bpcl', 'parking'],
    'Shopping': ['amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'uniqlo', 'westside', 'pantaloons', 'mall', 'retail'],
    'Entertainment': ['netflix', 'spotify', 'prime', 'hotstar', 'youtube premium', 'cinema', 'pvr', 'inox', 'bookmyshow', 'gaming'],
    'Utilities': ['electricity', 'water', 'gas', 'lpg', 'broadband', 'wifi', 'internet', 'jio', 'airtel', 'vi', 'vodafone', 'bsnl'],
    'Healthcare': ['pharmacy', 'hospital', 'clinic', 'doctor', 'lab', 'diagnostic', 'medplus', 'apollo', 'dr.', 'health'],
    'Travel': ['flight', 'hotel', 'airbnb', 'booking', 'makemytrip', 'goibibo', 'irctc', 'train', 'bus', 'redbus', 'ticket'],
    'Education': ['school', 'college', 'university', 'tuition', 'course', 'udemy', 'coursera', 'books', 'stationery'],
    'Insurance': ['insurance', 'lic', 'policy', 'premium', 'hdfc life', 'icici prudential', 'health insurance'],
    'Rent': ['rent', 'lease', 'landlord', 'housing', 'accommodation'],
    'EMI': ['emi', 'loan', 'installment', 'repayment'],
    'Investments': ['mutual fund', 'sip', 'stocks', 'shares', 'gold', 'zerodha', 'groww', 'upstox'],
    'Donations': ['donation', 'charity', 'ngo', 'temple', 'church', 'mosque', 'gurudwara']
};

export const suggestTags = (payee, description) => {
    const text = `${payee} ${description}`.toLowerCase();
    const suggestedTags = new Set();

    SMART_TAG_RULES.forEach(rule => {
        if (rule.keywords.some(keyword => text.includes(keyword))) {
            suggestedTags.add(rule.tag);
        }
    });

    return Array.from(suggestedTags);
};

/**
 * Suggest category based on payee and description
 * @param {string} payee - Transaction payee
 * @param {string} description - Transaction description
 * @returns {string|null} - Suggested category or null
 */
export const suggestCategory = (payee, description) => {
    const text = `${payee} ${description}`.toLowerCase();

    // Calculate confidence for each category
    const categoryScores = {};

    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
        if (matchCount > 0) {
            categoryScores[category] = matchCount;
        }
    }

    // Return category with highest score
    if (Object.keys(categoryScores).length > 0) {
        const topCategory = Object.entries(categoryScores).reduce((a, b) =>
            b[1] > a[1] ? b : a
        )[0];

        return topCategory;
    }

    return null;
};

/**
 * Get all possible category suggestions with confidence scores
 * @param {string} payee - Transaction payee
 * @param {string} description - Transaction description
 * @returns {Array<{category: string, confidence: number}>} - Array of suggestions
 */
export const getAllCategorySuggestions = (payee, description) => {
    const text = `${payee} ${description}`.toLowerCase();
    const suggestions = [];

    for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        const matchCount = keywords.filter(keyword => text.includes(keyword)).length;
        if (matchCount > 0) {
            const confidence = Math.min(matchCount / keywords.length * 100, 100);
            suggestions.push({ category, confidence: Math.round(confidence) });
        }
    }

    // Sort by confidence (descending)
    return suggestions.sort((a, b) => b.confidence - a.confidence);
};

export const autoTagTransaction = (transaction) => {
    const tags = suggestTags(transaction.payee || '', transaction.description || '');
    return {
        ...transaction,
        tags: [...(transaction.tags || []), ...tags]
    };
};

/**
 * Auto-categorize transaction if category is not set
 * @param {object} transaction - Transaction object
 * @returns {object} - Transaction with suggested category
 */
export const autoCategorizeTransaction = (transaction) => {
    // Don't override if category is already set (and not default)
    if (transaction.category && transaction.category !== 'Food' && transaction.category !== 'Uncategorized') {
        return transaction;
    }

    const suggestedCategory = suggestCategory(transaction.payee || '', transaction.description || '');

    if (suggestedCategory) {
        return {
            ...transaction,
            category: suggestedCategory,
            suggestedCategory: true // Flag to indicate auto-suggestion
        };
    }

    return transaction;
};

export default {
    suggestTags,
    suggestCategory,
    getAllCategorySuggestions,
    autoTagTransaction,
    autoCategorizeTransaction,
    SMART_TAG_RULES,
    CATEGORY_RULES
};
