// AI-powered Insights Engine
// Analyzes transaction data to provide smart financial insights

/**
 * Detect spending patterns (weekend vs weekday)
 */
export const detectSpendingPatterns = (transactions) => {
    if (!transactions || transactions.length === 0) return null;

    const expenses = transactions.filter(t => t.type && t.type.toLowerCase() === 'expense');

    let weekendTotal = 0;
    let weekdayTotal = 0;
    let weekendCount = 0;
    let weekdayCount = 0;

    expenses.forEach(t => {
        const date = new Date(t.date);
        const day = date.getDay();
        const isWeekend = day === 0 || day === 6;

        if (isWeekend) {
            weekendTotal += parseFloat(t.amount);
            weekendCount++;
        } else {
            weekdayTotal += parseFloat(t.amount);
            weekdayCount++;
        }
    });

    const weekendAvg = weekendCount > 0 ? weekendTotal / weekendCount : 0;
    const weekdayAvg = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;

    const difference = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;

    let insight = '';
    let type = 'info';

    if (Math.abs(difference) < 10) {
        insight = 'Your spending is balanced across the week ✅';
        type = 'success';
    } else if (difference > 30) {
        insight = `You spend ${Math.round(difference)}% more on weekends! 🎉 Consider planning weekend activities within budget.`;
        type = 'warning';
    } else if (difference > 15) {
        insight = `Weekend spending is ${Math.round(difference)}% higher than weekdays.`;
        type = 'info';
    } else if (difference < -15) {
        insight = `You spend more on weekdays. Weekend spending is ${Math.round(Math.abs(difference))}% lower.`;
        type = 'info';
    }

    return {
        weekendAvg,
        weekdayAvg,
        difference,
        insight,
        type,
        weekendTotal,
        weekdayTotal
    };
};

/**
 * Detect unusual transactions (anomalies)
 */
export const detectUnusualTransactions = (transactions) => {
    if (!transactions || transactions.length < 10) return [];

    const expenses = transactions.filter(t => t.type && t.type.toLowerCase() === 'expense');
    const unusual = [];

    // Group by category
    const byCategory = {};
    expenses.forEach(t => {
        const cat = t.category || 'Other';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(t);
    });

    // Detect anomalies per category
    Object.entries(byCategory).forEach(([category, txns]) => {
        if (txns.length < 3) return; // Need at least 3 transactions

        const amounts = txns.map(t => parseFloat(t.amount));
        const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        txns.forEach(t => {
            const amt = parseFloat(t.amount);
            const zScore = Math.abs((amt - mean) / (stdDev || 1));

            if (zScore > 2 && amt > mean * 1.5) { // Significantly higher than average
                unusual.push({
                    ...t,
                    reason: `${Math.round((amt - mean) / mean * 100)}% above your average ${category} spending`,
                    severity: zScore > 3 ? 'high' : 'medium',
                    avgAmount: mean
                });
            }
        });
    });

    // Detect new payees
    const payeeCounts = {};
    expenses.forEach(t => {
        const payee = t.payee || 'Unknown';
        payeeCounts[payee] = (payeeCounts[payee] || 0) + 1;
    });

    expenses.forEach(t => {
        if (payeeCounts[t.payee] === 1 && parseFloat(t.amount) > 1000) {
            if (!unusual.find(u => u.id === t.id)) {
                unusual.push({
                    ...t,
                    reason: 'New payee with significant amount',
                    severity: 'medium'
                });
            }
        }
    });

    return unusual.slice(0, 5); // Top 5 unusual transactions
};

/**
 * Predict monthly expenses
 */
export const predictMonthlyExpenses = (transactions) => {
    if (!transactions || transactions.length === 0) return null;

    const expenses = transactions.filter(t => t.type && t.type.toLowerCase() === 'expense');

    // Group by month
    const byMonth = {};
    expenses.forEach(t => {
        const date = new Date(t.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[monthKey]) byMonth[monthKey] = 0;
        byMonth[monthKey] += parseFloat(t.amount);
    });

    const monthlyTotals = Object.values(byMonth);

    if (monthlyTotals.length < 2) {
        return {
            prediction: 0,
            confidence: 'low',
            message: 'Need at least 2 months of data for predictions'
        };
    }

    // Simple moving average (last 3 months)
    const recentMonths = monthlyTotals.slice(-3);
    const avg = recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length;

    // Calculate trend
    const trend = monthlyTotals.length >= 2
        ? (monthlyTotals[monthlyTotals.length - 1] - monthlyTotals[monthlyTotals.length - 2]) / monthlyTotals[monthlyTotals.length - 2]
        : 0;

    const prediction = avg * (1 + trend * 0.5); // Dampen trend by 50%

    // Calculate confidence
    const variance = recentMonths.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recentMonths.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avg;

    let confidence = 'high';
    if (coefficientOfVariation > 0.3) confidence = 'low';
    else if (coefficientOfVariation > 0.15) confidence = 'medium';

    return {
        prediction: Math.round(prediction),
        avg: Math.round(avg),
        trend: trend * 100,
        confidence,
        monthsAnalyzed: recentMonths.length,
        variance: Math.round(variance)
    };
};

/**
 * Calculate Financial Health Score (0-100)
 */
export const calculateHealthScore = (transactions, budgets, investments) => {
    let totalScore = 0;
    const breakdown = {};

    // 1. Savings Rate (25 points)
    const income = transactions.filter(t => t.type && t.type.toLowerCase() === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expenses = transactions.filter(t => t.type && t.type.toLowerCase() === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    let savingsScore = 10;
    if (savingsRate >= 30) savingsScore = 25;
    else if (savingsRate >= 20) savingsScore = 20;
    else if (savingsRate >= 10) savingsScore = 15;

    breakdown.savingsRate = { score: savingsScore, value: savingsRate, max: 25 };
    totalScore += savingsScore;

    // 2. Budget Adherence (25 points)
    let adherenceScore = 15; // Default if no budgets
    if (budgets && budgets.length > 0) {
        const withinBudget = budgets.filter(b => {
            const spent = transactions
                .filter(t => t.type && t.type.toLowerCase() === 'expense' && t.category === b.category)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            return spent <= parseFloat(b.limit);
        }).length;

        const adherenceRate = (withinBudget / budgets.length) * 100;

        if (adherenceRate === 100) adherenceScore = 25;
        else if (adherenceRate >= 80) adherenceScore = 20;
        else if (adherenceRate >= 60) adherenceScore = 15;
        else adherenceScore = 10;

        breakdown.budgetAdherence = { score: adherenceScore, value: adherenceRate, max: 25 };
    }
    totalScore += adherenceScore;

    // 3. Expense Control (25 points)
    const prediction = predictMonthlyExpenses(transactions);
    let expenseScore = 15; // Default

    if (prediction && prediction.trend !== undefined) {
        if (prediction.trend < -5) expenseScore = 25; // Decreasing
        else if (prediction.trend < 5) expenseScore = 20; // Stable
        else if (prediction.trend < 10) expenseScore = 15; // Growing slowly
        else expenseScore = 10; // Growing fast

        breakdown.expenseControl = { score: expenseScore, value: prediction.trend, max: 25 };
    }
    totalScore += expenseScore;

    // 4. Investment Growth (25 points)
    let investmentScore = 15; // Default
    if (investments && investments.length > 0) {
        const totalInvested = investments.reduce((sum, inv) => {
            return sum + (parseFloat(inv.quantity) * parseFloat(inv.buyPrice || inv.pricePerShare || 0));
        }, 0);

        // Simplified - just check if investments exist
        if (totalInvested > 0) investmentScore = 20;
        breakdown.investment = { score: investmentScore, value: totalInvested, max: 25 };
    }
    totalScore += investmentScore;

    // Determine rating
    let rating = '';
    let color = '';
    if (totalScore >= 80) {
        rating = 'Excellent';
        color = '#10b981';
    } else if (totalScore >= 60) {
        rating = 'Good';
        color = '#3b82f6';
    } else if (totalScore >= 40) {
        rating = 'Fair';
        color = '#eab308';
    } else {
        rating = 'Needs Improvement';
        color = '#ef4444';
    }

    return {
        score: totalScore,
        rating,
        color,
        breakdown
    };
};

/**
 * Generate smart recommendations
 */
export const generateRecommendations = (transactions, budgets, healthScore) => {
    const recommendations = [];

    // Analyze by category
    const expenses = transactions.filter(t => t.type && t.type.toLowerCase() === 'expense');
    const totalExpense = expenses.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const byCategory = {};
    expenses.forEach(t => {
        const cat = t.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + parseFloat(t.amount);
    });

    // High category spending
    Object.entries(byCategory).forEach(([category, amount]) => {
        const percentage = (amount / totalExpense) * 100;
        if (percentage > 30) {
            const monthlySavings = Math.round(amount * 0.2); // 20% reduction
            recommendations.push({
                type: 'reduce',
                category,
                title: `High ${category} Spending`,
                message: `${category} is ${Math.round(percentage)}% of your total spending. Consider reducing by 20% to save ₹${monthlySavings.toLocaleString()}/month.`,
                savings: monthlySavings,
                priority: 'high'
            });
        }
    });

    // Emergency fund check
    const income = transactions.filter(t => t.type && t.type.toLowerCase() === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const avgMonthlyExpense = totalExpense / Math.max(1, new Set(expenses.map(t => t.date.substring(0, 7))).size);
    const emergencyFundTarget = avgMonthlyExpense * 3;

    if (income > 0) {
        recommendations.push({
            type: 'save',
            title: 'Build Emergency Fund',
            message: `Aim for an emergency fund of 3 months expenses (₹${Math.round(emergencyFundTarget).toLocaleString()}). Start by saving 10% of your income monthly.`,
            target: emergencyFundTarget,
            priority: 'high'
        });
    }

    // Budget recommendations
    if (healthScore.breakdown.budgetAdherence && healthScore.breakdown.budgetAdherence.value < 80) {
        recommendations.push({
            type: 'budget',
            title: 'Improve Budget Adherence',
            message: 'You\'re exceeding budgets in some categories. Review and adjust your budget limits or reduce spending.',
            priority: 'medium'
        });
    }

    // Savings recommendation
    if (healthScore.breakdown.savingsRate && healthScore.breakdown.savingsRate.value < 20) {
        recommendations.push({
            type: 'save',
            title: 'Increase Savings Rate',
            message: `Your savings rate is ${Math.round(healthScore.breakdown.savingsRate.value)}%. Aim for at least 20% by reducing discretionary spending.`,
            priority: 'high'
        });
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
};

/**
 * Detect recurring bills and subscriptions
 */
export const detectRecurringBills = (transactions, recurringRules = []) => {
    const expenses = transactions ? transactions.filter(t => t.type && t.type.toLowerCase() === 'expense') : [];
    const recurring = [];
    const today = new Date();

    // 1. Add Explicit Recurring Rules (User defined)
    if (recurringRules && recurringRules.length > 0) {
        recurringRules.forEach(rule => {
            const nextDate = new Date(rule.nextDueDate || rule.startDate);
            const daysUntilDue = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));

            recurring.push({
                id: rule.id,
                payee: rule.payee || rule.description || 'Recurring Bill',
                category: rule.category,
                avgAmount: parseFloat(rule.amount),
                lastDate: rule.lastRun || rule.startDate,
                nextDate: nextDate.toISOString().split('T')[0],
                daysUntilDue,
                frequency: rule.frequency,
                confidence: 'high', // User manually added it
                isExplicit: true
            });
        });
    }

    // 2. AI Detection (only if enough data)
    if (transactions && transactions.length >= 5) {
        // Group by payee
        const byPayee = {};
        expenses.forEach(t => {
            const payee = t.payee || 'Unknown';
            if (!byPayee[payee]) byPayee[payee] = [];
            byPayee[payee].push(t);
        });

        // Analyze each payee
        Object.entries(byPayee).forEach(([payee, txns]) => {
            // Skip if already found in explicit rules
            if (recurring.some(r => r.payee.toLowerCase() === payee.toLowerCase())) return;

            if (txns.length < 2) return; // Need at least 2 to detect pattern

            // Sort by date descending (newest first)
            txns.sort((a, b) => new Date(b.date) - new Date(a.date));

            const dates = txns.map(t => new Date(t.date));
            const intervals = [];

            for (let i = 0; i < dates.length - 1; i++) {
                const diffTime = Math.abs(dates[i] - dates[i + 1]);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                intervals.push(diffDays);
            }

            // Check for consistency
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const isMonthly = Math.abs(avgInterval - 30) < 5; // Allow 5 days variance
            const isWeekly = Math.abs(avgInterval - 7) < 2;
            const isYearly = Math.abs(avgInterval - 365) < 10;

            if (isMonthly || isWeekly || isYearly) {
                const lastTxn = txns[0];
                const nextDate = new Date(lastTxn.date);

                if (isMonthly) nextDate.setDate(nextDate.getDate() + 30);
                else if (isWeekly) nextDate.setDate(nextDate.getDate() + 7);
                else if (isYearly) nextDate.setFullYear(nextDate.getFullYear() + 1);

                const daysUntilDue = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
                const avgAmount = txns.reduce((sum, t) => sum + parseFloat(t.amount), 0) / txns.length;

                recurring.push({
                    payee,
                    category: lastTxn.category,
                    avgAmount: Math.round(avgAmount),
                    lastDate: lastTxn.date,
                    nextDate: nextDate.toISOString().split('T')[0],
                    daysUntilDue,
                    frequency: isMonthly ? 'Monthly' : (isWeekly ? 'Weekly' : 'Yearly'),
                    confidence: intervals.length > 2 ? 'high' : 'medium',
                    isExplicit: false
                });
            }
        });
    }

    // Sort by days until due (overdue first)
    return recurring.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
};

/**
 * Main insights engine - generates all insights
 */
export const generateInsights = (transactions, budgets, investments, recurringRules = []) => {
    // Even if no transactions, we might have recurring rules
    const hasData = (transactions && transactions.length > 0) || (recurringRules && recurringRules.length > 0);

    if (!hasData) {
        return {
            hasData: false,
            message: 'Add transactions or recurring bills to see insights!'
        };
    }

    const patterns = detectSpendingPatterns(transactions);
    const unusual = detectUnusualTransactions(transactions);
    const prediction = predictMonthlyExpenses(transactions);
    const healthScore = calculateHealthScore(transactions, budgets, investments);
    const recommendations = generateRecommendations(transactions, budgets, healthScore);
    const bills = detectRecurringBills(transactions, recurringRules);

    return {
        hasData: true,
        patterns,
        unusual,
        prediction,
        healthScore,
        recommendations,
        bills,
        generatedAt: new Date().toISOString()
    };
};

export default {
    detectSpendingPatterns,
    detectUnusualTransactions,
    predictMonthlyExpenses,
    calculateHealthScore,
    generateRecommendations,
    detectRecurringBills,
    generateInsights
};
