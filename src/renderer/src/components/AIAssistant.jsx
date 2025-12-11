import React, { useState, useRef, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import stockApi from '../utils/stockApi';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants';

/**
 * AI Assistant - Smart Command Wizard with Full App Knowledge
 * 
 * Features:
 * - Add: Transaction, Investment, Goal, Budget
 * - Query: Stats, Search, Recent Activity, Stock Price
 * - Action: Goal Deposit, Delete Transaction
 * - Smart: Budget Alerts, Spending Insights, Achievements
 */

const GOAL_ICONS = ['🎯', '💻', '🚗', '🏠', '✈️', '💍', '🎓', '🏥', '💰', '📱'];
const GOAL_COLORS = ['#0078d4', '#d13438', '#107c10', '#ffb900', '#881798'];

const QUICK_ACTIONS = [
    { id: 'transaction', icon: '💳', label: 'Add Transaction', color: '#0078d4' },
    { id: 'investment', icon: '📈', label: 'Add Investment', color: '#10b981' },
    { id: 'goal', icon: '🎯', label: 'Create Goal', color: '#f59e0b' },
    { id: 'budget', icon: '📊', label: 'Set Budget', color: '#8b5cf6' },
    { id: 'stats', icon: '📉', label: 'My Stats', color: '#06b6d4' },
    { id: 'more', icon: '⚡', label: 'More Actions', color: '#ec4899' },
];

const MORE_ACTIONS = [
    { id: 'search', icon: '🔍', label: 'Search Transactions', color: '#64748b' },
    { id: 'goaldeposit', icon: '💰', label: 'Add to Goal', color: '#10b981' },
    { id: 'delete', icon: '🗑️', label: 'Delete Transaction', color: '#ef4444' },
    { id: 'achievements', icon: '🏆', label: 'My Achievements', color: '#f59e0b' },
    { id: 'addbill', icon: '📅', label: 'Add Recurring Bill', color: '#8b5cf6' },
    { id: 'alerts', icon: '🔔', label: 'Smart Alerts', color: '#06b6d4' },
    { id: 'help', icon: '❓', label: 'Help', color: '#6b7280' },
];

const STATS_OPTIONS = [
    { id: 'monthly', icon: '📅', label: 'This Month', color: '#0078d4' },
    { id: 'networth', icon: '💰', label: 'Net Worth', color: '#10b981' },
    { id: 'recent', icon: '🕐', label: 'Recent 5', color: '#f59e0b' },
    { id: 'budgetstatus', icon: '📊', label: 'Budget Status', color: '#8b5cf6' },
    { id: 'insights', icon: '💡', label: 'Smart Insights', color: '#ec4899' },
];

const SEARCH_OPTIONS = [
    { id: 'payee', icon: '👤', label: 'By Payee', color: '#0078d4' },
    { id: 'category', icon: '📁', label: 'By Category', color: '#10b981' },
    { id: 'amount', icon: '💵', label: 'By Amount', color: '#f59e0b' },
    { id: 'stock', icon: '📈', label: 'Stock Price', color: '#ef4444' },
];

const TRANSACTION_TYPES = [
    { id: 'expense', icon: '💸', label: 'Expense', color: '#ef4444' },
    { id: 'income', icon: '💰', label: 'Income', color: '#10b981' },
];

const INVESTMENT_TYPES = [
    { id: 'stock_indian', icon: '🇮🇳', label: 'Indian Stock', color: '#FF9933', exchange: 'NSE' },
    { id: 'stock_us', icon: '🇺🇸', label: 'US Stock', color: '#3b82f6', exchange: 'US' },
    { id: 'mutual_fund', icon: '📊', label: 'Mutual Fund', color: '#10b981', exchange: 'MF' },
    { id: 'gold', icon: '🥇', label: 'Gold', color: '#eab308', exchange: 'MCX' },
];

const INCOME_OPTIONS = INCOME_CATEGORIES.map(cat => ({
    id: cat, icon: cat === 'Salary' ? '💼' : cat === 'Business' ? '🏢' : cat === 'Freelance' ? '💻' :
        cat === 'Investment' ? '📈' : cat === 'Gift' ? '🎁' : cat === 'Rental' ? '🏠' :
            cat === 'Refund' ? '↩️' : '📦', label: cat, color: '#10b981'
}));

const EXPENSE_OPTIONS = EXPENSE_CATEGORIES.map(cat => ({
    id: cat, icon: cat === 'Food' ? '🍔' : cat === 'Transport' ? '🚗' : cat === 'Rent' ? '🏠' :
        cat === 'Utilities' ? '💡' : cat === 'Entertainment' ? '🎬' : cat === 'Health' ? '🏥' :
            cat === 'Shopping' ? '🛍️' : cat === 'Education' ? '📚' : cat === 'Travel' ? '✈️' :
                cat === 'Insurance' ? '🛡️' : '📦', label: cat, color: '#ef4444'
}));

const AIAssistant = ({ isDark }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentFlow, setCurrentFlow] = useState(null);
    const [step, setStep] = useState(0);
    const [flowData, setFlowData] = useState({});
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [payees, setPayees] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);

    const colors = {
        bg: isDark ? '#1e1e1e' : '#ffffff',
        card: isDark ? '#252526' : '#f5f5f5',
        text: isDark ? '#ffffff' : '#000000',
        border: isDark ? '#3e3e42' : '#e0e0e0',
        accent: '#0078d4',
    };

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { if (isOpen) { loadPayees(); inputRef.current?.focus(); } }, [isOpen, step]);

    // Click outside to minimize
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isOpen && containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const loadPayees = async () => { setPayees((await DataAdapter.getPayees()) || []); };
    const toCamelCase = (str) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const formatMoney = (amt) => `₹${Math.abs(amt).toLocaleString('en-IN')}`;
    const addMessage = (text, isBot = true, options = null) => setMessages(prev => [...prev, { text, isBot, options, ts: Date.now() }]);

    const resetFlow = () => {
        setCurrentFlow(null); setStep(0); setFlowData({}); setMessages([]); setInputValue('');
        setTimeout(() => addMessage('👋 **PocketWall Assistant**\n\nWhat would you like to do?', true, QUICK_ACTIONS), 100);
    };

    const askAnythingElse = () => {
        setTimeout(() => { addMessage('Anything else?', true, QUICK_ACTIONS); setCurrentFlow(null); setStep(0); setFlowData({}); }, 1500);
    };

    // ======================== START FLOW ========================
    const startFlow = (flowId) => {
        setCurrentFlow(flowId); setStep(0); setFlowData({});
        switch (flowId) {
            case 'transaction':
                addMessage('💳 **Add Transaction**\n\nIncome or Expense?', true, TRANSACTION_TYPES);
                break;
            case 'investment':
                addMessage('📈 **Add Investment**\n\nWhat type?', true, INVESTMENT_TYPES);
                break;
            case 'goal':
                addMessage('🎯 **Create Goal**\n\nWhat are you saving for?', true);
                break;
            case 'budget':
                addMessage('📊 **Set Budget**\n\nWhich category?', true, EXPENSE_OPTIONS);
                break;
            case 'stats':
                addMessage('📉 **Your Stats**\n\nWhat do you want to see?', true, STATS_OPTIONS);
                break;
            case 'more':
                addMessage('⚡ **More Actions**\n\nWhat would you like to do?', true, MORE_ACTIONS);
                break;
            case 'search':
                addMessage('🔍 **Search**\n\nHow would you like to search?', true, SEARCH_OPTIONS);
                break;
            case 'goaldeposit':
                showGoalsForDeposit();
                break;
            case 'delete':
                showRecentForDelete();
                break;
            case 'achievements':
                showAchievements();
                break;
            case 'addbill':
                addMessage('📅 **Add Recurring Bill**\n\nEnter bill name (e.g., Netflix, Electricity):', true);
                break;
            case 'alerts':
                showSmartAlerts();
                break;
            case 'help':
                addMessage('❓ **All Features**\n\n**Add:**\n• Transaction, Investment, Goal, Budget\n\n**View:**\n• Stats, Net Worth, Budget Status\n\n**Actions:**\n• Search, Add to Goal, Delete\n• Achievements, Recurring Bills\n\n💡 Type stock name for live price!', true, QUICK_ACTIONS);
                break;
        }
    };

    // ======================== SHOW GOALS FOR DEPOSIT ========================
    const showGoalsForDeposit = async () => {
        const goals = await DataAdapter.getGoals();
        if (!goals || goals.length === 0) {
            addMessage('No goals found. Create one first!', true, QUICK_ACTIONS);
            return;
        }
        const goalOptions = goals.map(g => ({
            id: g.id, icon: g.icon || '🎯', label: `${g.name} (${formatMoney(g.currentAmount)}/${formatMoney(g.targetAmount)})`, color: g.color || '#0078d4'
        }));
        addMessage('💰 **Add Funds to Goal**\n\nSelect goal:', true, goalOptions);
    };

    // ======================== SHOW RECENT FOR DELETE ========================
    const showRecentForDelete = async () => {
        setLoading(true);
        const transactions = await DataAdapter.getTransactions();
        setLoading(false);
        if (!transactions || transactions.length === 0) {
            addMessage('No transactions to delete.', true, QUICK_ACTIONS);
            return;
        }
        const recent = transactions.slice(0, 5);
        const deleteOptions = recent.map((t, i) => ({
            id: t.id || i, icon: t.type === 'expense' ? '💸' : '💰',
            label: `${t.payee || t.category}: ${formatMoney(t.amount)}`, color: '#ef4444', txData: t
        }));
        setFlowData({ recentTxs: recent });
        addMessage('🗑️ **Delete Transaction**\n\nSelect to delete:', true, deleteOptions);
    };

    // ======================== SHOW ACHIEVEMENTS ========================
    const showAchievements = async () => {
        setLoading(true);
        try {
            const transactions = await DataAdapter.getTransactions();
            const goals = await DataAdapter.getGoals();
            const budgets = await DataAdapter.getBudgets() || {};
            const investments = await DataAdapter.getInvestments();

            const achievements = [];
            // Transaction milestones
            if (transactions.length >= 1) achievements.push('🥉 First Transaction');
            if (transactions.length >= 10) achievements.push('🥈 10 Transactions');
            if (transactions.length >= 50) achievements.push('🥇 50 Transactions');
            if (transactions.length >= 100) achievements.push('🏆 100 Transactions');
            // Goal achievements
            if (goals.length >= 1) achievements.push('🎯 Goal Setter');
            const completedGoals = goals.filter(g => parseFloat(g.currentAmount) >= parseFloat(g.targetAmount));
            if (completedGoals.length >= 1) achievements.push('⭐ Goal Achiever');
            // Budget achievements
            if (Object.keys(budgets).length >= 1) achievements.push('📊 Budget Conscious');
            if (Object.keys(budgets).length >= 5) achievements.push('🧠 Budget Master');
            // Investment achievements
            if (investments.length >= 1) achievements.push('📈 First Investment');
            if (investments.length >= 5) achievements.push('💼 Investor');

            const xp = achievements.length * 50;
            addMessage(`🏆 **Your Achievements**\n\n${achievements.length > 0 ? achievements.join('\n') : 'No achievements yet!'}\n\n⭐ **Total XP: ${xp}**\n\n*Keep using PocketWall to unlock more!*`, true);
        } catch (e) { addMessage('Failed to load achievements', true); }
        setLoading(false);
        askAnythingElse();
    };

    // ======================== SHOW SMART ALERTS ========================
    const showSmartAlerts = async () => {
        setLoading(true);
        try {
            const transactions = await DataAdapter.getTransactions();
            const budgets = await DataAdapter.getBudgets() || {};
            const now = new Date();
            const thisMonth = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });

            const alerts = [];
            // Budget alerts
            const spending = {};
            thisMonth.filter(t => t.type === 'expense').forEach(t => {
                spending[t.category] = (spending[t.category] || 0) + Math.abs(parseFloat(t.amount));
            });
            Object.entries(budgets).forEach(([cat, limit]) => {
                const spent = spending[cat] || 0;
                const pct = (spent / limit) * 100;
                if (pct >= 100) alerts.push(`🔴 **${cat}** exceeded! (${Math.round(pct)}%)`);
                else if (pct >= 80) alerts.push(`🟡 **${cat}** at ${Math.round(pct)}% - almost there!`);
            });
            // Large expense alert
            const largeExpenses = thisMonth.filter(t => t.type === 'expense' && Math.abs(parseFloat(t.amount)) > 5000);
            if (largeExpenses.length > 0) alerts.push(`💡 ${largeExpenses.length} expenses over ₹5,000`);
            // Income vs expense
            const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
            const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
            if (expense > income * 0.9 && income > 0) alerts.push('⚠️ Spending is 90% of income!');

            addMessage(`🔔 **Smart Alerts**\n\n${alerts.length > 0 ? alerts.join('\n') : '✅ All good! No alerts.'}`, true);
        } catch (e) { addMessage('Failed to load alerts', true); }
        setLoading(false);
        askAnythingElse();
    };


    // ======================== HANDLE OPTION SELECT ========================
    const handleOptionSelect = (option) => {
        // Check if it's a main quick action
        if (QUICK_ACTIONS.some(qa => qa.id === option.id)) {
            addMessage(`${option.icon} ${option.label}`, false);
            startFlow(option.id);
            return;
        }
        // Check if it's from MORE_ACTIONS menu
        if (MORE_ACTIONS.some(ma => ma.id === option.id)) {
            addMessage(`${option.icon} ${option.label}`, false);
            startFlow(option.id);
            return;
        }
        // Check if it's from STATS_OPTIONS
        if (STATS_OPTIONS.some(so => so.id === option.id)) {
            addMessage(`${option.icon} ${option.label}`, false);
            handleStatsQuery(option.id);
            return;
        }
        // Otherwise, continue the current flow
        addMessage(`${option.icon} ${option.label}`, false);
        const newData = { ...flowData, [`step${step}`]: option };
        setFlowData(newData);
        processNextStep(option, newData);
    };

    // ======================== PROCESS NEXT STEP ========================
    const processNextStep = (option, data) => {
        setStep(s => s + 1);

        // ===== TRANSACTION FLOW =====
        if (currentFlow === 'transaction') {
            if (step === 0) {
                addMessage('Which category?', true, option.id === 'income' ? INCOME_OPTIONS : EXPENSE_OPTIONS);
            } else if (step === 1) {
                const payeeOpts = payees.slice(0, 5).map(p => ({ id: p.name, icon: '👤', label: p.name, color: '#0078d4' }));
                payeeOpts.push({ id: '__new__', icon: '➕', label: 'New Payee', color: '#10b981' });
                addMessage('👤 **Payee?**', true, payeeOpts);
            } else if (step === 2) {
                if (option.id === '__new__') {
                    setFlowData(prev => ({ ...prev, waitingForNewPayee: true }));
                    addMessage('Enter payee name:', true);
                } else {
                    setFlowData(prev => ({ ...prev, payee: option.label }));
                    setStep(4);
                    addMessage('💵 Amount (₹):', true);
                }
            }
        }

        // ===== INVESTMENT FLOW =====
        if (currentFlow === 'investment') {
            if (step === 0) {
                const templates = {
                    'stock_indian': 'Format: **Symbol, Qty, Price**\nExample: RELIANCE, 10, 2450',
                    'stock_us': 'Format: **Symbol, Qty, Price (USD)**\nExample: AAPL, 5, 185',
                    'mutual_fund': 'Format: **Fund Name, Amount**\nExample: HDFC Flexi Cap, 10000',
                    'gold': 'Format: **Type, Weight(g), Price/g**\nExample: Gold, 10, 6500',
                };
                addMessage(templates[option.id] || 'Enter details:', true);
            }
        }

        // ===== BUDGET FLOW =====
        if (currentFlow === 'budget') {
            if (step === 0) {
                addMessage(`Monthly limit for ${option.icon} ${option.label} (₹):`, true);
            }
        }

        // ===== STATS FLOW =====
        if (currentFlow === 'stats') {
            if (step === 0) {
                handleStatsQuery(option.id);
            }
        }

        // ===== SEARCH FLOW =====
        if (currentFlow === 'search') {
            if (step === 0) {
                if (option.id === 'payee') addMessage('Enter payee name to search:', true);
                else if (option.id === 'category') addMessage('Enter category name:', true);
                else if (option.id === 'amount') addMessage('Enter minimum amount (₹):', true);
                else if (option.id === 'stock') addMessage('Enter stock symbol (e.g., RELIANCE, AAPL):', true);
            }
        }

        // ===== GOAL DEPOSIT FLOW =====
        if (currentFlow === 'goaldeposit') {
            if (step === 0) {
                setFlowData(prev => ({ ...prev, goalId: option.id, goalName: option.label }));
                addMessage(`Amount to add to ${option.icon} goal:`, true);
            }
        }

        // ===== DELETE FLOW =====
        if (currentFlow === 'delete') {
            if (step === 0) {
                // User selected a transaction to delete
                processDeleteTransaction(option.id);
            }
        }
    };

    // ======================== STATS QUERIES ========================
    const handleStatsQuery = async (type) => {
        setLoading(true);
        try {
            const transactions = await DataAdapter.getTransactions();
            const now = new Date();
            const thisMonth = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });

            if (type === 'monthly') {
                const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
                const expense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
                const savings = income - expense;
                addMessage(`📅 **${now.toLocaleString('default', { month: 'long' })} Summary**\n\n💰 Income: ${formatMoney(income)}\n💸 Expenses: ${formatMoney(expense)}\n${savings >= 0 ? '✅' : '⚠️'} Savings: ${formatMoney(savings)}\n📊 Transactions: ${thisMonth.length}`, true);
            } else if (type === 'networth') {
                const investments = await DataAdapter.getInvestments();
                const goals = await DataAdapter.getGoals();
                const totalInvested = investments.reduce((s, i) => s + (parseFloat(i.buyPrice) * parseFloat(i.quantity || 1)), 0);
                const totalGoalSaved = goals.reduce((s, g) => s + parseFloat(g.currentAmount || 0), 0);
                const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
                const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
                const netWorth = totalInvested + totalGoalSaved + (totalIncome - totalExpense);
                addMessage(`💰 **Net Worth Estimate**\n\n📈 Investments: ${formatMoney(totalInvested)}\n🎯 Goals Saved: ${formatMoney(totalGoalSaved)}\n💵 Cash Flow: ${formatMoney(totalIncome - totalExpense)}\n\n**Total: ${formatMoney(netWorth)}**`, true);
            } else if (type === 'recent') {
                const recent = transactions.slice(0, 5);
                if (recent.length === 0) {
                    addMessage('No recent transactions found.', true);
                } else {
                    const list = recent.map(t => `${t.type === 'expense' ? '💸' : '💰'} ${t.payee || t.category}: ${formatMoney(t.amount)}`).join('\n');
                    addMessage(`🕐 **Last 5 Transactions**\n\n${list}`, true);
                }
            } else if (type === 'budgetstatus') {
                const budgets = await DataAdapter.getBudgets();
                if (!budgets || Object.keys(budgets).length === 0) {
                    addMessage('No budgets set. Use "Set Budget" to create one!', true);
                } else {
                    const spending = {};
                    thisMonth.filter(t => t.type === 'expense').forEach(t => {
                        spending[t.category] = (spending[t.category] || 0) + Math.abs(parseFloat(t.amount));
                    });
                    const lines = Object.entries(budgets).map(([cat, limit]) => {
                        const spent = spending[cat] || 0;
                        const pct = Math.round((spent / limit) * 100);
                        const status = pct > 100 ? '🔴' : pct > 80 ? '🟡' : '🟢';
                        return `${status} ${cat}: ${formatMoney(spent)}/${formatMoney(limit)} (${pct}%)`;
                    }).join('\n');
                    addMessage(`📊 **Budget Status**\n\n${lines}`, true);
                }
            } else if (type === 'insights') {
                // Smart Insights - spending patterns
                const expense = thisMonth.filter(t => t.type === 'expense');
                const totalExpense = expense.reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);

                // Top 3 categories
                const catSpending = {};
                expense.forEach(t => { catSpending[t.category] = (catSpending[t.category] || 0) + Math.abs(parseFloat(t.amount)); });
                const topCats = Object.entries(catSpending).sort((a, b) => b[1] - a[1]).slice(0, 3);

                // Compare with last month
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthTxs = transactions.filter(t => {
                    const d = new Date(t.date);
                    return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear() && t.type === 'expense';
                });
                const lastMonthTotal = lastMonthTxs.reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
                const diff = totalExpense - lastMonthTotal;
                const diffPct = lastMonthTotal > 0 ? Math.round((diff / lastMonthTotal) * 100) : 0;

                let insights = `💡 **Smart Insights**\n\n`;
                insights += `📊 **Top Spending:**\n${topCats.map(([c, a]) => `• ${c}: ${formatMoney(a)}`).join('\n')}\n\n`;
                insights += `📈 **vs Last Month:**\n${diff >= 0 ? '⬆️' : '⬇️'} ${diff >= 0 ? '+' : ''}${formatMoney(diff)} (${diffPct >= 0 ? '+' : ''}${diffPct}%)\n\n`;
                if (diff > 0) insights += `💡 *Try to reduce spending in ${topCats[0]?.[0] || 'top categories'}*`;
                else insights += `✅ *Great! Spending down this month!*`;
                addMessage(insights, true);
            }
        } catch (e) {
            addMessage('Failed to load stats. Try again.', true);
        }
        setLoading(false);
        askAnythingElse();
    };

    // ======================== HANDLE INPUT SUBMIT ========================
    const handleInputSubmit = async () => {
        if (!inputValue.trim()) return;
        addMessage(inputValue, false);
        const value = inputValue.trim();
        setInputValue('');

        // Natural language detection
        const lowerVal = value.toLowerCase();
        if (!currentFlow) {
            if (lowerVal.includes('stat') || lowerVal.includes('summary') || lowerVal.includes('month')) {
                startFlow('stats'); return;
            }
            if (lowerVal.includes('add') && lowerVal.includes('goal')) {
                startFlow('goaldeposit'); return;
            }
            if (lowerVal.includes('price') || lowerVal.includes('stock')) {
                handleStockPrice(value.replace(/price|stock/gi, '').trim()); return;
            }
            // Default: try stock search
            if (value.length >= 2 && value.length <= 10 && /^[A-Za-z]+$/.test(value)) {
                handleStockPrice(value); return;
            }
        }

        if (currentFlow === 'transaction') await processTransactionInput(value);
        else if (currentFlow === 'investment') await processInvestmentInput(value);
        else if (currentFlow === 'goal') await processGoalInput(value);
        else if (currentFlow === 'budget') await processBudgetInput(value);
        else if (currentFlow === 'search') await processSearchInput(value);
        else if (currentFlow === 'goaldeposit') await processGoalDeposit(value);
        else if (currentFlow === 'addbill') await processBillInput(value);
        else if (!currentFlow) {
            // Fallback for unrecognized input
            const greetings = ['hi', 'hello', 'hey', 'hola', 'namaste', 'sup', 'yo'];
            const thanks = ['thanks', 'thank you', 'thx', 'ty', 'dhanyawad'];
            const bye = ['bye', 'goodbye', 'exit', 'quit', 'close'];

            if (greetings.some(g => lowerVal.includes(g))) {
                addMessage(`👋 Hello! Nice to see you.\n\nI'm your PocketWall AI assistant. I can help you:\n\n• Track expenses & income\n• Check stock & crypto prices\n• Set savings goals\n• Manage budgets\n\nWhat would you like to do?`, true, QUICK_ACTIONS);
            } else if (thanks.some(t => lowerVal.includes(t))) {
                addMessage(`🙏 You're welcome! Happy to help.\n\nAnything else I can do for you?`, true, QUICK_ACTIONS);
            } else if (bye.some(b => lowerVal.includes(b))) {
                addMessage(`👋 Goodbye! Have a great day!\n\n*Click the 🤖 button anytime to chat again.*`, true);
                setTimeout(() => setIsOpen(false), 1500);
            } else {
                addMessage(`🤔 I'm not sure what you mean by "${value}"\n\n**Try:**\n• "Add transaction" - Log expense/income\n• "BTC" or "RELIANCE" - Check price\n• "Stats" - View monthly summary\n• Or use the buttons below 👇`, true, QUICK_ACTIONS);
            }
        }
    };

    // ======================== STOCK/CRYPTO PRICE ========================
    const CRYPTO_MAP = {
        'BTC': 'bitcoin', 'BITCOIN': 'bitcoin', 'ETH': 'ethereum', 'ETHEREUM': 'ethereum',
        'DOGE': 'dogecoin', 'DOGECOIN': 'dogecoin', 'SOL': 'solana', 'SOLANA': 'solana',
        'XRP': 'ripple', 'RIPPLE': 'ripple', 'ADA': 'cardano', 'CARDANO': 'cardano',
        'DOT': 'polkadot', 'MATIC': 'matic-network', 'POLYGON': 'matic-network',
        'SHIB': 'shiba-inu', 'LTC': 'litecoin', 'AVAX': 'avalanche-2', 'LINK': 'chainlink',
    };

    const handleStockPrice = async (query) => {
        if (!query) { addMessage('Enter stock/crypto name (e.g., RELIANCE, Bitcoin)', true); return; }
        const symbol = query.toUpperCase().trim();
        setLoading(true);
        addMessage(`🔍 Searching for ${symbol}...`, true);

        try {
            // 1. Check if it's a crypto
            const cryptoId = CRYPTO_MAP[symbol];
            if (cryptoId) {
                const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=inr,usd&include_24hr_change=true`);
                const data = await resp.json();
                if (data[cryptoId]) {
                    const price = data[cryptoId].inr;
                    const usdPrice = data[cryptoId].usd;
                    const change = data[cryptoId].inr_24h_change || 0;
                    addMessage(`🪙 **${symbol}**\n\n💵 ₹${price.toLocaleString('en-IN')}\n💲 $${usdPrice.toLocaleString()}\n${change >= 0 ? '🟢' : '🔴'} 24h: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`, true);
                    setLoading(false); askAnythingElse(); return;
                }
            }

            // 2. Try direct NSE symbol
            let data = await stockApi.fetchStockPrice(symbol, 'NSE');
            if (data && data.currentPrice) {
                const change = data.dayChange || 0;
                const pct = data.dayChangePercent || 0;
                addMessage(`📈 **${symbol}** (NSE)\n\n💵 ₹${data.currentPrice.toLocaleString()}\n${change >= 0 ? '🟢' : '🔴'} ${change >= 0 ? '+' : ''}₹${change.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`, true);
                setLoading(false); askAnythingElse(); return;
            }

            // 3. Try US symbol
            data = await stockApi.fetchStockPrice(symbol, 'US');
            if (data && data.currentPrice) {
                const change = data.dayChange || 0;
                const pct = data.dayChangePercent || 0;
                addMessage(`📈 **${symbol}** (US)\n\n💵 $${data.currentPrice.toLocaleString()}\n${change >= 0 ? '🟢' : '🔴'} ${change >= 0 ? '+' : ''}$${change.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`, true);
                setLoading(false); askAnythingElse(); return;
            }

            // 4. Search by name
            const searchResults = await stockApi.searchStock(query);
            if (searchResults && searchResults.length > 0) {
                const first = searchResults[0];
                data = await stockApi.fetchStockPrice(first.symbol, first.exchange);
                if (data && data.currentPrice) {
                    const change = data.dayChange || 0;
                    const pct = data.dayChangePercent || 0;
                    const curr = first.exchange === 'US' ? '$' : '₹';
                    addMessage(`📈 **${first.symbol}** (${first.exchange})\n📝 ${first.description}\n\n💵 ${curr}${data.currentPrice.toLocaleString()}\n${change >= 0 ? '🟢' : '🔴'} ${change >= 0 ? '+' : ''}${curr}${change.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`, true);
                    setLoading(false); askAnythingElse(); return;
                }
            }

            // Nothing found
            addMessage(`❌ Couldn't find "${query}"\n\n**Try:**\n• Stock: RELIANCE, TCS, INFY, AAPL\n• Crypto: BTC, ETH, DOGE, SOL`, true);
        } catch (e) {
            console.error('Price search error:', e);
            addMessage(`Error searching. Try again.`, true);
        }
        setLoading(false);
        askAnythingElse();
    };

    // ======================== TRANSACTION PROCESSING ========================
    const processTransactionInput = async (value) => {
        const type = flowData.step0?.id;
        const category = flowData.step1?.label;

        if (flowData.waitingForNewPayee && !flowData.payee) {
            const payeeName = toCamelCase(value);
            setFlowData(prev => ({ ...prev, payee: payeeName, waitingForNewPayee: false }));
            setStep(4);
            addMessage(`👤 Payee: **${payeeName}**\n\n💵 Amount (₹):`, true);
            return;
        }

        if (step === 4) {
            const amount = parseFloat(value.replace(/[₹,]/g, ''));
            if (isNaN(amount) || amount <= 0) { addMessage('❌ Enter valid amount', true); return; }
            setFlowData(prev => ({ ...prev, amount }));
            setStep(5);
            addMessage('📝 Note (optional, Enter to skip):', true);
            return;
        }

        if (step === 5) {
            const tx = {
                amount: type === 'expense' ? -Math.abs(flowData.amount) : Math.abs(flowData.amount),
                originalAmount: flowData.amount, currency: 'INR', exchangeRate: 1, type,
                category: category || 'Other', payee: flowData.payee || 'Unknown', accountId: '',
                description: value === '' ? '' : toCamelCase(value), tags: '',
                date: new Date().toISOString().split('T')[0],
            };
            try {
                await DataAdapter.addTransaction(tx);
                addMessage(`✅ **Saved!**\n\n${type === 'expense' ? '💸' : '💰'} ${type}\n📁 ${category}\n👤 ${flowData.payee}\n💵 ${formatMoney(flowData.amount)}`, true);
                window.dispatchEvent(new CustomEvent('transactionAdded'));
            } catch (e) { addMessage('❌ Failed to save', true); return; }
            askAnythingElse();
        }
    };

    // ======================== INVESTMENT PROCESSING ========================
    const processInvestmentInput = async (value) => {
        const type = flowData.step0?.id;
        const parts = value.split(',').map(p => p.trim());
        let investment = null, msg = '';

        if (type === 'stock_indian' || type === 'stock_us') {
            if (parts.length < 3) { addMessage('❌ Format: Symbol, Qty, Price', true); return; }
            const [symbol, qty, price] = parts;
            const qtyNum = parseFloat(qty), priceNum = parseFloat(price);
            if (isNaN(qtyNum) || isNaN(priceNum)) { addMessage('❌ Invalid numbers', true); return; }
            investment = {
                symbol: symbol.toUpperCase(), name: symbol.toUpperCase(), quantity: qtyNum, buyPrice: priceNum,
                exchangeRate: type === 'stock_us' ? 89.36 : 1, date: new Date().toISOString().slice(0, 10),
                exchange: type === 'stock_indian' ? 'NSE' : 'US', type: 'buy', assetClass: 'Stock'
            };
            msg = `✅ **${type === 'stock_indian' ? '🇮🇳' : '🇺🇸'} ${symbol.toUpperCase()}**\n${qty} @ ₹${priceNum.toLocaleString()}`;
        } else if (type === 'mutual_fund') {
            if (parts.length < 2) { addMessage('❌ Format: Name, Amount', true); return; }
            const [name, amount] = parts;
            const fundName = toCamelCase(name), amtNum = parseFloat(amount);
            if (isNaN(amtNum)) { addMessage('❌ Invalid amount', true); return; }
            investment = {
                symbol: fundName.replace(/\s/g, '_').slice(0, 10), name: fundName, quantity: 0, buyPrice: amtNum,
                date: new Date().toISOString().slice(0, 10), exchange: 'MF', type: 'buy', assetClass: 'Mutual Fund'
            };
            msg = `✅ **📊 ${fundName}**\nInvested: ${formatMoney(amtNum)}`;
        } else if (type === 'gold') {
            if (parts.length < 3) { addMessage('❌ Format: Type, Weight, Price', true); return; }
            const [typ, weight, price] = parts;
            const typeName = toCamelCase(typ), weightNum = parseFloat(weight), priceNum = parseFloat(price);
            if (isNaN(weightNum) || isNaN(priceNum)) { addMessage('❌ Invalid numbers', true); return; }
            investment = {
                symbol: typeName.toUpperCase(), name: `${typeName} (${weight}g)`, quantity: weightNum, buyPrice: priceNum,
                date: new Date().toISOString().slice(0, 10), exchange: 'MCX', type: 'buy', assetClass: 'Commodity'
            };
            msg = `✅ **🥇 ${typeName}**\n${weight}g @ ₹${priceNum.toLocaleString()}/g`;
        }
        if (investment) {
            try {
                await DataAdapter.addInvestment(investment);
                window.dispatchEvent(new CustomEvent('investmentUpdated'));
                addMessage(msg, true);
            }
            catch (e) { addMessage('❌ Failed to save', true); return; }
            askAnythingElse();
        }
    };

    // ======================== GOAL PROCESSING ========================
    const processGoalInput = async (value) => {
        if (step === 0) {
            const goalName = toCamelCase(value);
            setFlowData(prev => ({ ...prev, name: goalName })); setStep(1);
            addMessage(`🎯 **${goalName}**\n\nTarget amount (₹):`, true); return;
        }
        if (step === 1) {
            const target = parseFloat(value.replace(/[₹,]/g, ''));
            if (isNaN(target) || target <= 0) { addMessage('❌ Enter valid amount', true); return; }
            setFlowData(prev => ({ ...prev, targetAmount: target })); setStep(2);
            addMessage(`💰 Target: ${formatMoney(target)}\n\nDeadline (YYYY-MM-DD) or "skip":`, true); return;
        }
        if (step === 2) {
            const deadline = value.toLowerCase() === 'skip' ? '' : value;
            const goal = {
                name: flowData.name, targetAmount: flowData.targetAmount, currentAmount: 0, deadline,
                color: GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)], icon: '🎯'
            };
            try {
                await DataAdapter.addGoal(goal);
                window.dispatchEvent(new CustomEvent('goalUpdated'));
                addMessage(`✅ **Goal Created!**\n\n🎯 ${flowData.name}\n💰 ${formatMoney(flowData.targetAmount)}`, true);
            }
            catch (e) { addMessage('❌ Failed to save', true); return; }
            askAnythingElse();
        }
    };

    // ======================== BUDGET PROCESSING ========================
    const processBudgetInput = async (value) => {
        const category = flowData.step0?.label;
        const amount = parseFloat(value.replace(/[₹,]/g, ''));
        if (isNaN(amount) || amount <= 0) { addMessage('❌ Enter valid amount', true); return; }
        try {
            const budgets = await DataAdapter.getBudgets() || {};
            budgets[category] = amount;
            await DataAdapter.saveBudgets(budgets);
            window.dispatchEvent(new CustomEvent('budgetUpdated'));
            addMessage(`✅ **Budget Set!**\n\n${flowData.step0?.icon} ${category}: ${formatMoney(amount)}/month`, true);
        } catch (e) { addMessage('❌ Failed to save', true); return; }
        askAnythingElse();
    };

    // ======================== SEARCH PROCESSING ========================
    const processSearchInput = async (value) => {
        const searchType = flowData.step0?.id;
        setLoading(true);
        try {
            if (searchType === 'stock') { handleStockPrice(value); return; }
            const transactions = await DataAdapter.getTransactions();
            let results = [];
            if (searchType === 'payee') {
                results = transactions.filter(t => t.payee?.toLowerCase().includes(value.toLowerCase()));
            } else if (searchType === 'category') {
                results = transactions.filter(t => t.category?.toLowerCase().includes(value.toLowerCase()));
            } else if (searchType === 'amount') {
                const minAmt = parseFloat(value);
                results = transactions.filter(t => Math.abs(parseFloat(t.amount)) >= minAmt);
            }
            if (results.length === 0) {
                addMessage(`No transactions found for "${value}"`, true);
            } else {
                const list = results.slice(0, 5).map(t => `${t.type === 'expense' ? '💸' : '💰'} ${t.payee || t.category}: ${formatMoney(t.amount)}`).join('\n');
                addMessage(`🔍 **Found ${results.length} results:**\n\n${list}${results.length > 5 ? `\n... and ${results.length - 5} more` : ''}`, true);
            }
        } catch (e) { addMessage('Search failed', true); }
        setLoading(false);
        askAnythingElse();
    };

    // ======================== GOAL DEPOSIT ========================
    const processGoalDeposit = async (value) => {
        const amount = parseFloat(value.replace(/[₹,]/g, ''));
        if (isNaN(amount) || amount <= 0) { addMessage('❌ Enter valid amount', true); return; }
        try {
            const goals = await DataAdapter.getGoals();
            const goal = goals.find(g => g.id === flowData.goalId);
            if (!goal) { addMessage('Goal not found', true); return; }
            goal.currentAmount = (parseFloat(goal.currentAmount) || 0) + amount;
            await DataAdapter.updateGoal(goal);
            window.dispatchEvent(new CustomEvent('goalUpdated'));
            addMessage(`✅ **Added ${formatMoney(amount)}**\n\n🎯 ${goal.name}\n💰 Now: ${formatMoney(goal.currentAmount)}/${formatMoney(goal.targetAmount)}`, true);
        } catch (e) { addMessage('❌ Failed to update', true); return; }
        askAnythingElse();
    };

    // ======================== RECURRING BILL PROCESSING ========================
    const processBillInput = async (value) => {
        // Step 0: Bill name entered
        if (step === 0) {
            const billName = toCamelCase(value);
            setFlowData(prev => ({ ...prev, billName }));
            setStep(1);
            addMessage(`📅 Bill: **${billName}**\n\nMonthly amount (₹):`, true);
            return;
        }
        // Step 1: Amount entered
        if (step === 1) {
            const amount = parseFloat(value.replace(/[₹,]/g, ''));
            if (isNaN(amount) || amount <= 0) { addMessage('❌ Enter valid amount', true); return; }
            setFlowData(prev => ({ ...prev, billAmount: amount }));
            setStep(2);
            addMessage(`💵 Amount: ${formatMoney(amount)}\n\nDue date (1-28)?`, true);
            return;
        }
        // Step 2: Due date entered - save bill as recurring rule
        if (step === 2) {
            const dueDate = parseInt(value) || 1;
            const rule = {
                id: Date.now().toString(),
                name: flowData.billName,
                type: 'expense',
                category: 'Bills',
                amount: flowData.billAmount,
                frequency: 'monthly',
                dayOfMonth: Math.min(Math.max(dueDate, 1), 28),
                isActive: true,
                createdAt: new Date().toISOString(),
            };
            try {
                await DataAdapter.addRecurringRule(rule);
                window.dispatchEvent(new CustomEvent('recurringUpdated'));
                addMessage(`✅ **Recurring Bill Added!**\n\n📅 ${flowData.billName}\n💵 ${formatMoney(flowData.billAmount)}/month\n📆 Due: ${dueDate}th of every month\n\n*Check Recurring page to see it!*`, true);
            } catch (e) { addMessage('❌ Failed to save', true); return; }
            askAnythingElse();
        }
    };

    // ======================== DELETE TRANSACTION ========================
    const processDeleteTransaction = async (txId) => {
        try {
            await DataAdapter.deleteTransaction(txId);
            addMessage(`✅ Transaction deleted!`, true);
            window.dispatchEvent(new CustomEvent('transactionAdded'));
        } catch (e) { addMessage('❌ Failed to delete', true); }
        askAnythingElse();
    };


    // ======================== PROFESSIONAL UI ========================
    const styles = {
        // Floating button
        fab: {
            position: 'fixed', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 20,
            background: isDark
                ? 'linear-gradient(145deg, #2d2d30, #1e1e1e)'
                : 'linear-gradient(145deg, #ffffff, #f0f0f0)',
            color: isDark ? '#60a5fa' : '#0078d4',
            border: isDark ? '1px solid #3e3e42' : '1px solid #e0e0e0',
            cursor: 'pointer',
            boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, zIndex: 9999, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        // Main container with glassmorphism
        container: {
            position: 'fixed', bottom: 24, right: 24, width: 420, height: 600,
            backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 24,
            boxShadow: isDark
                ? '0 25px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)'
                : '0 25px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 9999,
            border: `1px solid ${isDark ? '#3e3e42' : '#e5e7eb'}`,
        },
        // Header with gradient
        header: {
            padding: '18px 20px',
            background: isDark
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        },
        // Messages area
        messagesArea: {
            flex: 1, overflowY: 'auto', padding: 20,
            display: 'flex', flexDirection: 'column', gap: 16,
            background: isDark
                ? 'linear-gradient(180deg, rgba(30,30,30,0) 0%, rgba(20,20,25,0.3) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(245,245,250,0.5) 100%)',
        },
        // Bot message bubble
        botBubble: {
            maxWidth: '85%', padding: '14px 18px',
            borderRadius: '6px 20px 20px 20px',
            backgroundColor: isDark ? '#2d2d30' : '#f3f4f6',
            color: colors.text, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
            border: `1px solid ${isDark ? '#3e3e42' : '#e5e7eb'}`,
        },
        // User message bubble
        userBubble: {
            maxWidth: '85%', padding: '14px 18px',
            borderRadius: '20px 6px 20px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
        },
        // Input area
        inputArea: {
            padding: 16,
            borderTop: `1px solid ${isDark ? '#3e3e42' : '#e5e7eb'}`,
            display: 'flex', gap: 12,
            backgroundColor: isDark ? '#252526' : '#fafafa',
        },
        // Text input
        input: {
            flex: 1, padding: '14px 20px', borderRadius: 16,
            border: `2px solid ${isDark ? '#3e3e42' : '#e5e7eb'}`,
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            color: colors.text, fontSize: 14, outline: 'none',
            transition: 'all 0.2s ease',
        },
        // Send button
        sendBtn: {
            width: 50, height: 50, borderRadius: 16,
            background: loading
                ? (isDark ? '#3e3e42' : '#d1d5db')
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff', border: 'none',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: loading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.2s ease',
        },
    };

    // Option button style generator
    const getOptionStyle = (opt, isHovered) => ({
        padding: '10px 16px', borderRadius: 14,
        border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        backgroundColor: isHovered
            ? (opt.color || '#667eea')
            : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
        color: isHovered ? '#fff' : (isDark ? '#e5e7eb' : '#374151'),
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isHovered ? `0 4px 12px ${opt.color || '#667eea'}40` : 'none',
    });

    // Loading spinner component
    const LoadingDots = () => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    backgroundColor: isDark ? '#60a5fa' : '#667eea',
                    animation: `pulse 1.4s infinite ease-in-out ${i * 0.16}s`,
                }} />
            ))}
        </span>
    );

    if (!isOpen) {
        return (
            <button
                onClick={() => { setIsOpen(true); if (messages.length === 0) addMessage('👋 **Welcome to PocketWall AI**\n\nI can help you manage finances, track investments, set goals, and more!\n\nWhat would you like to do?', true, QUICK_ACTIONS); }}
                style={styles.fab}
                onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)'; e.currentTarget.style.boxShadow = isDark ? '0 12px 40px rgba(0,0,0,0.7)' : '0 12px 40px rgba(0,0,0,0.2)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = styles.fab.boxShadow; }}
            >
                <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>🤖</span>
            </button>
        );
    }

    return (
        <div ref={containerRef} style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24,
                    }}>🤖</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '0.02em' }}>PocketWall AI</div>
                        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                            {loading ? <LoadingDots /> : '● Online'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={resetFlow}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >↻ New</button>
                    <button onClick={() => setIsOpen(false)}
                        style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, width: 40, height: 40, color: '#fff', fontSize: 18, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                    >×</button>
                </div>
            </div>

            {/* Messages */}
            <div style={styles.messagesArea}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isBot ? 'flex-start' : 'flex-end', animation: 'fadeInUp 0.3s ease' }}>
                        <div style={msg.isBot ? styles.botBubble : styles.userBubble}>
                            {msg.text.split('**').map((part, i) => i % 2 === 0 ? part : <strong key={i} style={{ fontWeight: 600 }}>{part}</strong>)}
                        </div>
                        {msg.options && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, maxWidth: '100%' }}>
                                {msg.options.map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => handleOptionSelect(opt)}
                                        style={getOptionStyle(opt, false)}
                                        onMouseOver={e => Object.assign(e.currentTarget.style, getOptionStyle(opt, true))}
                                        onMouseOut={e => Object.assign(e.currentTarget.style, getOptionStyle(opt, false))}
                                    >
                                        <span style={{ fontSize: 16 }}>{opt.icon}</span>
                                        <span>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={styles.inputArea}>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleInputSubmit()}
                    placeholder="Ask anything..."
                    style={styles.input}
                    onFocus={e => e.currentTarget.style.borderColor = '#667eea'}
                    onBlur={e => e.currentTarget.style.borderColor = isDark ? '#3e3e42' : '#e5e7eb'}
                />
                <button
                    onClick={handleInputSubmit}
                    disabled={loading}
                    style={styles.sendBtn}
                    onMouseOver={e => !loading && (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {loading ? '...' : '➤'}
                </button>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default AIAssistant;

