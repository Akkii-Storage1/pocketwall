// Budget Predictor Utility
// Analyzes historical spending and suggests monthly budgets

/**
 * Predict budget for each category based on historical data
 * @param {Array} transactions - Array of transactions
 * @param {number} monthsToAnalyze - Number of months to analyze (default: 6)
 * @param {number} bufferPercent - Buffer percentage to add (default: 15)
 * @returns {object} - Object with category: suggestedBudget pairs
 */
export function predictBudget(transactions, monthsToAnalyze = 6, bufferPercent = 15) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsToAnalyze);

    // Filter transactions to last N months
    const recentTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= cutoffDate && tx.type === 'expense';
    });

    if (recentTransactions.length === 0) {
        return {};
    }

    // Group by category and month
    const categoryMonthlySpending = {};

    recentTransactions.forEach(tx => {
        const category = tx.category || 'Uncategorized';
        const monthKey = new Date(tx.date).toISOString().slice(0, 7); // YYYY-MM

        if (!categoryMonthlySpending[category]) {
            categoryMonthlySpending[category] = {};
        }

        if (!categoryMonthlySpending[category][monthKey]) {
            categoryMonthlySpending[category][monthKey] = 0;
        }

        categoryMonthlySpending[category][monthKey] += Math.abs(parseFloat(tx.amount));
    });

    // Calculate average and suggested budget
    const suggestions = {};

    for (const [category, monthlyData] of Object.entries(categoryMonthlySpending)) {
        const monthlyAmounts = Object.values(monthlyData);
        const totalSpent = monthlyAmounts.reduce((a, b) => a + b, 0);
        const avgMonthly = totalSpent / monthlyAmounts.length;

        // Add buffer for variability
        const buffer = avgMonthly * (bufferPercent / 100);
        const suggestedBudget = Math.round(avgMonthly + buffer);

        suggestions[category] = {
            suggested: suggestedBudget,
            average: Math.round(avgMonthly),
            monthsAnalyzed: monthlyAmounts.length,
            min: Math.round(Math.min(...monthlyAmounts)),
            max: Math.round(Math.max(...monthlyAmounts)),
            trend: calculateTrend(monthlyData)
        };
    }

    return suggestions;
}

/**
 * Calculate spending trend (increasing, decreasing, stable)
 * @param {object} monthlyData - Object with month: amount pairs
 * @returns {string} - 'increasing', 'decreasing', or 'stable'
 */
function calculateTrend(monthlyData) {
    const sortedMonths = Object.keys(monthlyData).sort();
    if (sortedMonths.length < 3) return 'stable';

    const firstHalfAvg = sortedMonths.slice(0, Math.floor(sortedMonths.length / 2))
        .reduce((sum, month) => sum + monthlyData[month], 0) / Math.floor(sortedMonths.length / 2);

    const secondHalfAvg = sortedMonths.slice(Math.ceil(sortedMonths.length / 2))
        .reduce((sum, month) => sum + monthlyData[month], 0) / Math.ceil(sortedMonths.length / 2);

    const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    if (changePercent > 10) return 'increasing';
    if (changePercent < -10) return 'decreasing';
    return 'stable';
}

/**
 * Get spending insights for a specific category
 * @param {Array} transactions - Array of transactions
 * @param {string} category - Category to analyze
 * @param {number} months - Number of months to analyze
 * @returns {object} - Insights object
 */
export function getCategoryInsights(transactions, category, months = 6) {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    const categoryTxs = transactions.filter(tx =>
        tx.category === category &&
        tx.type === 'expense' &&
        new Date(tx.date) >= cutoffDate
    );

    if (categoryTxs.length === 0) {
        return null;
    }

    const amounts = categoryTxs.map(tx => Math.abs(parseFloat(tx.amount)));
    const total = amounts.reduce((a, b) => a + b, 0);
    const avg = total / amounts.length;

    // Top payees
    const payeeCounts = {};
    categoryTxs.forEach(tx => {
        const payee = tx.payee || 'Unknown';
        payeeCounts[payee] = (payeeCounts[payee] || 0) + 1;
    });

    const topPayees = Object.entries(payeeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([payee, count]) => ({ payee, count }));

    return {
        totalSpent: Math.round(total),
        transactionCount: categoryTxs.length,
        averageAmount: Math.round(avg),
        minAmount: Math.round(Math.min(...amounts)),
        maxAmount: Math.round(Math.max(...amounts)),
        topPayees,
        monthsAnalyzed: months
    };
}

/**
 * Suggest budget adjustments based on current vs suggested
 * @param {object} currentBudgets - Current budget settings
 * @param {object} suggestedBudgets - Predicted budgets
 * @returns {Array} - Array of recommendations
 */
export function getBudgetRecommendations(currentBudgets, suggestedBudgets) {
    const recommendations = [];

    for (const [category, suggested] of Object.entries(suggestedBudgets)) {
        const current = currentBudgets[category] || 0;
        const difference = suggested.suggested - current;
        const percentDiff = current > 0 ? (difference / current) * 100 : 100;

        if (Math.abs(percentDiff) > 20) { // Significant difference
            recommendations.push({
                category,
                current,
                suggested: suggested.suggested,
                difference: Math.round(difference),
                percentDiff: Math.round(percentDiff),
                action: difference > 0 ? 'increase' : 'decrease',
                reason: getTrendReason(suggested.trend, percentDiff)
            });
        }
    }

    // Sort by absolute difference (highest first)
    return recommendations.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

function getTrendReason(trend, percentDiff) {
    if (trend === 'increasing' && percentDiff > 0) {
        return 'Your spending in this category is trending upward';
    }
    if (trend === 'decreasing' && percentDiff < 0) {
        return 'Your spending in this category is trending downward';
    }
    if (Math.abs(percentDiff) > 50) {
        return 'Significant gap between current budget and actual spending';
    }
    return 'Based on recent spending patterns';
}

export default {
    predictBudget,
    getCategoryInsights,
    getBudgetRecommendations
};
