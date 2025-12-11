import DataAdapter from './dataAdapter';
import CurrencyConverter from './CurrencyConverter';

export const ACHIEVEMENTS = [
    {
        id: 'first_step',
        title: 'First Step',
        description: 'Log your first transaction',
        icon: '🌱',
        xp: 100,
        category: 'general',
        check: (data) => data.transactions.length >= 1,
        getProgress: (data) => Math.min(data.transactions.length, 1) / 1 * 100
    },
    {
        id: 'transaction_tracker',
        title: 'Tracker',
        description: 'Log 50 transactions',
        icon: '📝',
        xp: 500,
        category: 'general',
        check: (data) => data.transactions.length >= 50,
        getProgress: (data) => Math.min(data.transactions.length, 50) / 50 * 100
    },
    {
        id: 'saver_bronze',
        title: 'Piggy Bank',
        description: 'Reach a Net Worth of {amount}',
        threshold: 10000,
        icon: '🐖',
        xp: 300,
        category: 'savings',
        check: (data) => data.netWorth >= 10000,
        getProgress: (data) => Math.min(Math.max(data.netWorth, 0), 10000) / 10000 * 100
    },
    {
        id: 'saver_silver',
        title: 'Serious Saver',
        description: 'Reach a Net Worth of {amount}',
        threshold: 100000,
        icon: '💰',
        xp: 1000,
        category: 'savings',
        check: (data) => data.netWorth >= 100000,
        getProgress: (data) => Math.min(Math.max(data.netWorth, 0), 100000) / 100000 * 100
    },
    {
        id: 'investor_rookie',
        title: 'Rookie Investor',
        description: 'Make your first investment',
        icon: '📈',
        xp: 200,
        category: 'investing',
        check: (data) => data.investments.length >= 1,
        getProgress: (data) => Math.min(data.investments.length, 1) / 1 * 100
    },
    {
        id: 'diversified',
        title: 'Diversified',
        description: 'Own stocks from 3 different companies',
        icon: '🌐',
        xp: 500,
        category: 'investing',
        check: (data) => new Set(data.investments.map(i => i.symbol)).size >= 3,
        getProgress: (data) => Math.min(new Set(data.investments.map(i => i.symbol)).size, 3) / 3 * 100
    },
    {
        id: 'budget_conscious',
        title: 'Budget Conscious',
        description: 'Set a budget for at least 1 category',
        icon: '🛡️',
        xp: 150,
        category: 'budgeting',
        check: (data) => Object.keys(data.budgets).length >= 1,
        getProgress: (data) => Math.min(Object.keys(data.budgets).length, 1) / 1 * 100
    },
    {
        id: 'goal_setter',
        title: 'Goal Setter',
        description: 'Create a financial goal',
        icon: '🎯',
        xp: 150,
        category: 'goals',
        check: (data) => data.goals.length >= 1,
        getProgress: (data) => Math.min(data.goals.length, 1) / 1 * 100
    }
];

export const LEVELS = [
    { level: 1, name: 'Novice', minXp: 0 },
    { level: 2, name: 'Apprentice', minXp: 500 },
    { level: 3, name: 'Strategist', minXp: 1500 },
    { level: 4, name: 'Master', minXp: 3000 },
    { level: 5, name: 'Grandmaster', minXp: 5000 },
    { level: 6, name: 'Legend', minXp: 10000 }
];

export const GamificationEngine = {
    calculateStats: async () => {
        try {
            const transactions = await DataAdapter.getTransactions() || [];
            const investments = await DataAdapter.getInvestments() || [];
            const budgets = await DataAdapter.getBudgets() || {};
            const goals = await DataAdapter.getGoals() || [];
            const accounts = await DataAdapter.getAccounts() || [];
            const settings = await DataAdapter.getUserSettings();
            const currency = settings.defaultCurrency || 'INR';

            // Debug Logging
            console.log('Gamification Stats Check:', {
                transactions: transactions.length,
                investments: investments.length,
                budgets: Object.keys(budgets).length,
                goals: goals.length,
                accounts: accounts.length
            });

            // Calculate Net Worth
            const totalAssets = accounts.reduce((sum, acc) => sum + (parseFloat(acc.currentBalance) || 0), 0);
            const investmentValue = investments.reduce((sum, inv) => sum + (parseFloat(inv.quantity) * parseFloat(inv.currentPrice || inv.buyPrice)), 0);
            const netWorth = totalAssets + investmentValue;

            const data = {
                transactions,
                investments,
                budgets,
                goals,
                netWorth
            };

            let totalXp = 0;

            // Map to new array to avoid mutating constant
            const calculatedAchievements = ACHIEVEMENTS.map(ach => {
                const isUnlocked = ach.check(data);
                const progress = ach.getProgress(data);

                if (isUnlocked) {
                    totalXp += ach.xp;
                }

                let description = ach.description;
                if (ach.threshold) {
                    const converted = CurrencyConverter.convert(ach.threshold, 'INR', currency);
                    const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, maximumFractionDigits: 0 }).format(converted);
                    description = description.replace('{amount}', formatted);
                }

                return {
                    ...ach,
                    description,
                    status: {
                        unlocked: isUnlocked,
                        progress: Math.min(Math.max(progress, 0), 100),
                        currentXp: isUnlocked ? ach.xp : 0
                    }
                };
            });

            // Determine Level
            let currentLevel = LEVELS[0];
            let nextLevel = LEVELS[1];

            for (let i = 0; i < LEVELS.length; i++) {
                if (totalXp >= LEVELS[i].minXp) {
                    currentLevel = LEVELS[i];
                    nextLevel = LEVELS[i + 1] || null;
                } else {
                    break;
                }
            }

            return {
                totalXp,
                level: currentLevel,
                nextLevel,
                achievements: calculatedAchievements
            };
        } catch (error) {
            console.error('Error calculating gamification stats:', error);
            return {
                totalXp: 0,
                level: LEVELS[0],
                nextLevel: LEVELS[1],
                achievements: ACHIEVEMENTS.map(ach => ({ ...ach, status: { unlocked: false, progress: 0, currentXp: 0 } }))
            };
        }
    }
};

export default GamificationEngine;
