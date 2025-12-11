import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { EXPENSE_CATEGORIES } from '../constants';
import DataAdapter from '../utils/dataAdapter';
import GamificationEngine, { ACHIEVEMENTS } from '../utils/GamificationEngine';
import ShareButton from '../components/ShareButton';
import { useFeature } from '../context/FeatureContext';
import { Edit2, Trash2, Plus, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from '../components/Modal';
import CurrencyConverter from '../utils/CurrencyConverter';
import SmartInput from '../components/SmartInput';

const Budget = ({ isDark, currency }) => {
    const toast = useToast();
    const { checkLimit, isOptionalEnabled } = useFeature();
    const [budgets, setBudgets] = useState({});
    const [spending, setSpending] = useState({});
    const [rolloverAmounts, setRolloverAmounts] = useState({}); // Unused budget from last month
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editAmount, setEditAmount] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [periodInfo, setPeriodInfo] = useState({ start: null, end: null, label: '' }); // For period display
    const [monthlyIncome, setMonthlyIncome] = useState(0); // For zero-based budgeting
    const [showAchievement, setShowAchievement] = useState(null);
    // Currency is passed as prop

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const headerBg = isDark ? '#3e3e42' : '#e0e0e0';

    const [allCategories, setAllCategories] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryAmount, setNewCategoryAmount] = useState('');
    const [newCategoryPeriod, setNewCategoryPeriod] = useState('monthly'); // Per-budget period
    const [editPeriod, setEditPeriod] = useState('monthly'); // Period for editing

    useEffect(() => {
        loadData();
    }, [filterDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Settings loaded in App.jsx now

            // Load budget limits
            const savedBudgets = await DataAdapter.getBudgets();
            setBudgets(savedBudgets);

            // Calculate spending
            const transactions = await DataAdapter.getTransactions();
            const [selectedYear, selectedMonth] = filterDate.split('-').map(Number);

            // Helper to calculate spending for a given month
            const calculateSpendingForMonth = (year, month) => {
                const monthSpending = {};
                transactions.forEach(t => {
                    const tDate = new Date(t.date);
                    if (t.type === 'expense' && tDate.getMonth() === (month - 1) && tDate.getFullYear() === year) {
                        if (t.splits && t.splits.length > 0) {
                            t.splits.forEach(split => {
                                const rate = t.exchangeRate || 1;
                                const splitAmountINR = parseFloat(split.amount) * rate;
                                let cat = split.category.trim();
                                const existing = [...EXPENSE_CATEGORIES, ...Object.keys(savedBudgets)].find(c => c.toLowerCase() === cat.toLowerCase());
                                if (existing) cat = existing;
                                monthSpending[cat] = (monthSpending[cat] || 0) + splitAmountINR;
                            });
                        } else {
                            let cat = t.category.trim();
                            const existing = [...EXPENSE_CATEGORIES, ...Object.keys(savedBudgets)].find(c => c.toLowerCase() === cat.toLowerCase());
                            if (existing) cat = existing;
                            monthSpending[cat] = (monthSpending[cat] || 0) + Math.abs(parseFloat(t.amount));
                        }
                    }
                });
                return monthSpending;
            };

            // Current month spending
            const currentSpending = calculateSpendingForMonth(selectedYear, selectedMonth);
            setSpending(currentSpending);

            // Calculate monthly income for zero-based budgeting
            let income = 0;
            transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (t.type === 'income' && tDate.getMonth() === (selectedMonth - 1) && tDate.getFullYear() === selectedYear) {
                    income += Math.abs(parseFloat(t.amount || 0));
                }
            });
            setMonthlyIncome(income);
            // Calculate rollover if enabled
            if (isOptionalEnabled('budgeting', 'rollover')) {
                // Get previous month
                let prevMonth = selectedMonth - 1;
                let prevYear = selectedYear;
                if (prevMonth < 1) {
                    prevMonth = 12;
                    prevYear = selectedYear - 1;
                }

                const prevSpending = calculateSpendingForMonth(prevYear, prevMonth);
                const rollovers = {};

                // For each budget category, calculate unused amount from last month
                Object.entries(savedBudgets).forEach(([category, limit]) => {
                    if (limit > 0) {
                        const prevSpent = prevSpending[category] || 0;
                        const unused = limit - prevSpent;
                        if (unused > 0) {
                            rollovers[category] = unused;
                        }
                    }
                });

                setRolloverAmounts(rollovers);
            } else {
                setRolloverAmounts({});
            }

            // Combine all unique categories
            const uniqueCats = new Set([
                ...EXPENSE_CATEGORIES,
                ...Object.keys(savedBudgets),
                ...Object.keys(currentSpending)
            ]);
            setAllCategories(Array.from(uniqueCats).sort());

        } catch (error) {
            console.error(error);
            toast.error('Failed to load budget data');
        } finally {
            setLoading(false);
        }
    };

    // Helper to get budget amount (backward compatible: number or {amount, period})
    const getBudgetAmount = (budget) => {
        if (typeof budget === 'number') return budget;
        if (typeof budget === 'object' && budget !== null) return budget.amount || 0;
        return 0;
    };

    // Helper to get budget period (backward compatible: default to monthly)
    const getBudgetPeriod = (budget) => {
        if (typeof budget === 'number') return 'monthly'; // Old format
        if (typeof budget === 'object' && budget !== null) return budget.period || 'monthly';
        return 'monthly';
    };
    const handleAddCustomBudget = async () => {
        if (!newCategoryName.trim()) return;
        if (budgets[newCategoryName]) {
            toast.error('Category already exists');
            return;
        }

        const val = parseFloat(newCategoryAmount) || 0;
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const valInINR = val / rate;

        const currentSaved = await DataAdapter.getBudgets();
        // Save as {amount, period} structure
        const newBudgets = { ...currentSaved, [newCategoryName]: { amount: valInINR, period: newCategoryPeriod } };
        setBudgets(newBudgets);
        await DataAdapter.saveBudgets(newBudgets);
        window.dispatchEvent(new CustomEvent('budgetUpdated'));

        setAllCategories(prev => [...new Set([...prev, newCategoryName])].sort());
        setShowAddModal(false);
        setNewCategoryName('');
        setNewCategoryAmount('');
        setNewCategoryPeriod('monthly'); // Reset
        toast.success(`Budget added (${newCategoryPeriod})`);
    };

    const checkAchievements = async (previousBudgetCount, newBudgetCount) => {
        // Check if "Budget Conscious" achievement was just unlocked
        if (previousBudgetCount === 0 && newBudgetCount >= 1) {
            const budgetAchievement = ACHIEVEMENTS.find(a => a.id === 'budget_conscious');
            if (budgetAchievement) {
                setShowAchievement(budgetAchievement);

                // Update total XP
                const currentXp = parseInt(localStorage.getItem('pocketwall_total_xp') || '0');
                localStorage.setItem('pocketwall_total_xp', (currentXp + budgetAchievement.xp).toString());
            }
        }
    };

    const handleSaveBudget = async (category) => {
        const previousBudgetCount = Object.keys(budgets).filter(k => getBudgetAmount(budgets[k]) > 0).length;

        // Input is in Display Currency. Convert to Base (INR) for storage.
        const val = parseFloat(editAmount) || 0;
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const valInINR = val / rate;

        const currentSaved = await DataAdapter.getBudgets();
        // Save as {amount, period} structure
        const newBudgets = { ...currentSaved, [category]: { amount: valInINR, period: editPeriod } };
        setBudgets(newBudgets);
        await DataAdapter.saveBudgets(newBudgets);
        window.dispatchEvent(new CustomEvent('budgetUpdated'));
        setEditingCategory(null);
        toast.success(`Budget updated for ${category} (${editPeriod})`);

        // Check achievements immediately
        const newBudgetCount = Object.keys(newBudgets).filter(k => getBudgetAmount(newBudgets[k]) > 0).length;
        await checkAchievements(previousBudgetCount, newBudgetCount);
    };

    const startEdit = (category, budgetData) => {
        const currentBudgetCount = Object.values(budgets).filter(b => getBudgetAmount(b) > 0).length;
        const currentLimitINR = getBudgetAmount(budgetData);
        const currentPeriod = getBudgetPeriod(budgetData);
        const isNewBudget = !currentLimitINR || currentLimitINR === 0;

        if (isNewBudget && !checkLimit('maxBudgets', currentBudgetCount)) {
            toast.error('Budget limit reached. Upgrade to Pro for unlimited budgets.');
            return;
        }

        // Convert Base (INR) to Display Currency for editing
        const displayVal = CurrencyConverter.convert(currentLimitINR, 'INR', currency);

        setEditingCategory(category);
        setEditAmount(currentLimitINR ? displayVal.toFixed(2) : '');
        setEditPeriod(currentPeriod); // Set current period for editing
    };

    const ProgressBar = ({ current, max }) => {
        const percentage = Math.min((current / (max || 1)) * 100, 100);
        let color = '#008000'; // Green
        if (percentage > 75) color = '#ffa500'; // Orange
        if (percentage > 90) color = '#ff0000'; // Red

        return (
            <div className="w-full h-4 border bg-white relative" style={{ borderColor: '#999' }}>
                <div
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                        height: '100%'
                    }}
                />
                <span className="absolute inset-0 text-[10px] flex items-center justify-center font-semibold" style={{ color: '#000', textShadow: '0px 0px 2px #fff' }}>
                    {percentage.toFixed(0)}%
                </span>
            </div>
        );
    };

    const formatMoney = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    // Helper to convert INR to Display
    const toDisplay = (amountINR) => {
        return CurrencyConverter.convert(amountINR, 'INR', currency);
    };

    // Summary Calculations (using per-budget periods - no global adjustment)
    const totalBudget = Object.values(budgets).reduce((a, b) => a + getBudgetAmount(b), 0);
    const totalRollover = Object.values(rolloverAmounts).reduce((a, b) => a + b, 0);
    const effectiveTotalBudget = totalBudget + totalRollover;
    const totalSpent = Object.values(spending).reduce((a, b) => a + b, 0);
    const totalRemaining = effectiveTotalBudget - totalSpent;
    const overallPercentage = effectiveTotalBudget > 0 ? (totalSpent / effectiveTotalBudget) * 100 : 0;

    const getHealthColor = (pct) => {
        if (pct > 100) return '#ef4444'; // Red
        if (pct > 80) return '#f59e0b'; // Orange
        return '#10b981'; // Green
    };

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' }}>
            {/* Achievement Popup */}
            {showAchievement && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full animate-bounce-in">
                        <div className="text-6xl mb-4">{showAchievement.icon}</div>
                        <h2 className="text-2xl font-bold mb-2" style={{ color: '#FFD700' }}>
                            Achievement Unlocked!
                        </h2>
                        <p className="text-lg font-semibold mb-2" style={{ color: textColor }}>
                            {showAchievement.title}
                        </p>
                        <p className="text-sm mb-4 opacity-70" style={{ color: textColor }}>
                            {showAchievement.description}
                        </p>
                        <div className="text-xl font-bold mb-6" style={{ color: '#FFD700' }}>
                            +{showAchievement.xp} XP
                        </div>
                        <button
                            onClick={() => setShowAchievement(null)}
                            className="px-6 py-2 rounded-full font-bold text-white"
                            style={{ background: 'linear-gradient(90deg, #0078d4, #00bcf2)' }}
                        >
                            Awesome!
                        </button>
                    </div>
                </div>
            )}

            {/* Add Custom Budget Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Set Budget Limit"
                isDark={isDark}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <input
                            type="text"
                            placeholder="e.g. Food, Travel"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Limit ({currency})</label>
                            <SmartInput
                                placeholder="0.00"
                                value={newCategoryAmount}
                                onChange={(e) => setNewCategoryAmount(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Period</label>
                            <select
                                value={newCategoryPeriod}
                                onChange={(e) => setNewCategoryPeriod(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            >
                                <option value="weekly">📅 Weekly</option>
                                <option value="biweekly">📅 Bi-Weekly</option>
                                <option value="monthly">📅 Monthly</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="px-4 py-2 text-sm border rounded hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: textColor, borderColor }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddCustomBudget}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                        >
                            Save Budget
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Budget Modal */}
            <Modal
                isOpen={!!editingCategory}
                onClose={() => setEditingCategory(null)}
                title={`Edit Budget: ${editingCategory}`}
                isDark={isDark}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Limit ({currency})</label>
                            <SmartInput
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Period</label>
                            <select
                                value={editPeriod}
                                onChange={(e) => setEditPeriod(e.target.value)}
                                className="w-full px-3 py-2 border rounded"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            >
                                <option value="weekly">📅 Weekly</option>
                                <option value="biweekly">📅 Bi-Weekly</option>
                                <option value="monthly">📅 Monthly</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <button
                            onClick={async () => {
                                if (confirm(`Remove budget limit for ${editingCategory}?`)) {
                                    const currentSaved = await DataAdapter.getBudgets();
                                    const newBudgets = { ...currentSaved };
                                    delete newBudgets[editingCategory];

                                    setBudgets(newBudgets);
                                    await DataAdapter.saveBudgets(newBudgets);
                                    window.dispatchEvent(new CustomEvent('budgetUpdated'));

                                    setEditingCategory(null);
                                    toast.success('Budget removed');
                                }
                            }}
                            className="text-red-500 text-sm hover:underline flex items-center gap-1"
                        >
                            <Trash2 size={14} /> Remove Limit
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEditingCategory(null)}
                                className="px-4 py-2 text-sm border rounded hover:bg-black/5 dark:hover:bg-white/5"
                                style={{ color: textColor, borderColor }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSaveBudget(editingCategory)}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: textColor }}>
                            Budget Planner
                        </h1>
                        <p className="text-sm opacity-70" style={{ color: textColor }}>
                            Manage spending limits with per-budget periods
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setFilterDate(prev => {
                            const d = new Date(prev + '-01');
                            d.setMonth(d.getMonth() - 1);
                            return d.toISOString().slice(0, 7);
                        })} className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-1" style={{ color: textColor }}>◀</button>
                        <input
                            type="month"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold focus:outline-none cursor-pointer text-center w-32"
                            style={{ color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                        />
                        <button onClick={() => setFilterDate(prev => {
                            const d = new Date(prev + '-01');
                            d.setMonth(d.getMonth() + 1);
                            return d.toISOString().slice(0, 7);
                        })} className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-1" style={{ color: textColor }}>▶</button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-xs font-semibold uppercase opacity-60" style={{ color: textColor }}>Total Budget</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: textColor }}>
                            {formatMoney(toDisplay(effectiveTotalBudget))}
                        </div>
                        <div className="text-xs opacity-60 mt-1 flex items-center gap-2" style={{ color: textColor }}>
                            {Object.keys(budgets).length} categories tracked
                            {totalRollover > 0 && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 rounded text-[10px] font-semibold">
                                    +{formatMoney(toDisplay(totalRollover))} rollover
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                                <TrendingDown size={20} />
                            </div>
                            <span className="text-xs font-semibold uppercase opacity-60" style={{ color: textColor }}>Total Spent</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: textColor }}>
                            {formatMoney(toDisplay(totalSpent))}
                        </div>
                        <div className="text-xs opacity-60 mt-1" style={{ color: textColor }}>
                            {overallPercentage.toFixed(1)}% of budget used
                        </div>
                        {/* Mini Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
                            <div
                                className="h-full transition-all duration-500"
                                style={{ width: `${Math.min(overallPercentage, 100)}%`, backgroundColor: getHealthColor(overallPercentage) }}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-start mb-2">
                            <div className={`p-2 rounded-lg ${totalRemaining < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} dark:bg-opacity-20`}>
                                {totalRemaining < 0 ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                            </div>
                            <span className="text-xs font-semibold uppercase opacity-60" style={{ color: textColor }}>Remaining</span>
                        </div>
                        <div className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {formatMoney(toDisplay(totalRemaining))}
                        </div>
                        <div className="text-xs opacity-60 mt-1" style={{ color: textColor }}>
                            {totalRemaining < 0 ? 'Over budget' : 'Safe to spend'}
                        </div>
                    </div>
                </div>

                {/* Zero-Based Budgeting Allocation Tracker */}
                {isOptionalEnabled('budgeting', 'zeroBased') && (
                    <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <h3 className="font-semibold" style={{ color: textColor }}>Zero-Based Budget Allocation</h3>
                            </div>
                            <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                                Every rupee assigned!
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div>
                                <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Monthly Income</div>
                                <div className="font-bold text-lg text-blue-500">{formatMoney(toDisplay(monthlyIncome))}</div>
                            </div>
                            <div>
                                <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Allocated</div>
                                <div className="font-bold text-lg text-green-500">{formatMoney(toDisplay(totalBudget))}</div>
                            </div>
                            <div>
                                <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>To Allocate</div>
                                <div className={`font-bold text-lg ${monthlyIncome - totalBudget < 0 ? 'text-red-500' : monthlyIncome - totalBudget === 0 ? 'text-green-500' : 'text-orange-500'}`}>
                                    {formatMoney(toDisplay(monthlyIncome - totalBudget))}
                                </div>
                            </div>
                        </div>
                        {/* Allocation Progress Bar */}
                        <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                    width: `${monthlyIncome > 0 ? Math.min((totalBudget / monthlyIncome) * 100, 100) : 0}%`,
                                    backgroundColor: totalBudget >= monthlyIncome ? '#10b981' : '#f59e0b'
                                }}
                            />
                        </div>
                        <div className="text-xs text-center mt-2 opacity-60" style={{ color: textColor }}>
                            {monthlyIncome > 0 ? `${Math.min(((totalBudget / monthlyIncome) * 100), 100).toFixed(0)}% of income allocated` : 'Add income transactions to track allocation'}
                        </div>
                    </div>
                )}
                {/* Budget List */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold" style={{ color: textColor }}>Category Budgets</h2>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                        >
                            <Plus size={16} /> Set New Budget
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {allCategories.map((cat) => {
                            const budgetData = budgets[cat];
                            const limitINR = getBudgetAmount(budgetData);
                            const catPeriod = getBudgetPeriod(budgetData);
                            const catPeriodLabel = catPeriod === 'weekly' ? '/wk' : catPeriod === 'biweekly' ? '/2wk' : '/mo';

                            // No period adjustment needed - budget is already set for that period
                            const rolloverINR = rolloverAmounts[cat] || 0;
                            const effectiveLimitINR = limitINR + rolloverINR; // Budget + Rollover
                            const spentINR = spending[cat] || 0;
                            const remainingINR = effectiveLimitINR - spentINR;
                            const percentage = effectiveLimitINR > 0 ? (spentINR / effectiveLimitINR) * 100 : 0;
                            const isOverBudget = effectiveLimitINR > 0 && spentINR > effectiveLimitINR;

                            // Only show categories that have a budget set OR have spending
                            if (limitINR === 0 && spentINR === 0) return null;

                            return (
                                <div
                                    key={cat}
                                    className="p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow group"
                                    style={{ backgroundColor: panelBg, borderColor }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: textColor }}>
                                                {cat}
                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded text-[10px] font-semibold">
                                                    {catPeriodLabel}
                                                </span>
                                                {rolloverINR > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 rounded text-[10px] font-semibold">
                                                        🔄 +{formatMoney(toDisplay(rolloverINR))}
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="text-xs opacity-60" style={{ color: textColor }}>
                                                {effectiveLimitINR > 0 ? `${formatMoney(toDisplay(spentINR))} spent` : 'No limit set'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => startEdit(cat, budgetData)}
                                            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Edit Budget"
                                        >
                                            <Edit2 size={16} style={{ color: textColor }} />
                                        </button>
                                    </div>

                                    {/* Progress Bar or Envelope */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: textColor }}>
                                            <span>{Math.min(percentage, 100).toFixed(0)}% used</span>
                                            <span className={remainingINR < 0 ? 'text-red-500' : 'opacity-60'}>
                                                {effectiveLimitINR > 0 ? (remainingINR < 0 ? `Over by ${formatMoney(toDisplay(Math.abs(remainingINR)))}` : `${formatMoney(toDisplay(remainingINR))} left`) : ''}
                                            </span>
                                        </div>

                                        {isOptionalEnabled('budgeting', 'envelope') ? (
                                            /* Envelope Budgeting Visual */
                                            <div className="relative h-20 rounded-lg border-2 overflow-hidden"
                                                style={{
                                                    borderColor: getHealthColor(percentage),
                                                    backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8'
                                                }}>
                                                {/* Envelope flap design */}
                                                <div className="absolute top-0 left-0 right-0 h-6 border-b-2"
                                                    style={{
                                                        borderColor: getHealthColor(percentage),
                                                        background: `linear-gradient(135deg, ${isDark ? '#333' : '#e8e8e8'} 50%, transparent 50%)`
                                                    }}
                                                />
                                                {/* Fill level (remaining budget) */}
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 transition-all duration-700"
                                                    style={{
                                                        height: `${Math.max(0, 100 - percentage)}%`,
                                                        background: `linear-gradient(180deg, ${getHealthColor(percentage)}44, ${getHealthColor(percentage)}88)`,
                                                    }}
                                                />
                                                {/* Money inside text */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-lg font-bold" style={{ color: textColor }}>
                                                        {effectiveLimitINR > 0 ? (remainingINR > 0 ? `💵 ${formatMoney(toDisplay(remainingINR))}` : '📭 Empty') : '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Standard Progress Bar */
                                            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(percentage, 100)}%`,
                                                        backgroundColor: getHealthColor(percentage)
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed" style={{ borderColor: isDark ? '#444' : '#eee' }}>
                                        <span className="opacity-60" style={{ color: textColor }}>Limit</span>
                                        <span className="font-semibold" style={{ color: textColor }}>
                                            {effectiveLimitINR > 0 ? formatMoney(toDisplay(effectiveLimitINR)) : 'Not Set'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Budget;
