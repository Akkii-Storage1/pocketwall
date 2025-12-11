import React, { useState, useEffect } from 'react';
import { Shield, TrendingUp, Target, AlertTriangle, CheckCircle, Wallet, Calendar, PiggyBank, CreditCard, ChevronDown, ChevronUp, RefreshCw, Banknote, Plus, Trash2 } from 'lucide-react';
import DataAdapter from '../utils/DataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';

const FinancialHealth = ({ isDark, currency = 'INR' }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('emergency');

    // Emergency Fund Data - Region-based defaults (US: 4 months, India: 8 months)
    const getDefaultEmergencyMonths = (curr) => {
        if (curr === 'USD') return 4;  // US standard: 3-6 months, use 4
        if (curr === 'INR') return 8;  // India: higher job market volatility
        return 6; // Default for other currencies
    };
    const [avgMonthlyExpense, setAvgMonthlyExpense] = useState(0);
    const [liquidSavings, setLiquidSavings] = useState('');
    const [targetMonths, setTargetMonths] = useState(getDefaultEmergencyMonths(currency));

    // Financial Health Score Data
    const [healthScore, setHealthScore] = useState(0);
    const [scoreBreakdown, setScoreBreakdown] = useState({});

    // Transactions for calculations
    const [transactions, setTransactions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [investments, setInvestments] = useState([]);

    // Debt Payoff Planner
    const [debts, setDebts] = useState([]);
    const [debtStrategy, setDebtStrategy] = useState('avalanche'); // 'avalanche' or 'snowball'
    const [extraPayment, setExtraPayment] = useState('');

    // EMI Pre-closure Calculator
    const [preclosure, setPreclosure] = useState({
        outstandingPrincipal: '',
        interestRate: '',
        remainingMonths: '',
        preclosureCharges: '2', // Default 2%
        monthlyEMI: ''
    });
    const [preclosureResult, setPreclosureResult] = useState(null);

    // Life Stage & Custom Weights
    const [lifeStage, setLifeStage] = useState('mid_career');
    const [showWeightConfig, setShowWeightConfig] = useState(false);

    // Preset weights for different life stages (total = 100)
    const LIFE_STAGE_PRESETS = {
        student: {
            label: '🎓 Student',
            description: 'Focus on budgeting & saving habits',
            weights: { emergencyFund: 15, savingsRate: 30, goalProgress: 20, investmentDiversity: 5, budgetAdherence: 20, tracking: 10 }
        },
        early_career: {
            label: '💼 Early Career (20s-30s)',
            description: 'Build emergency fund & start investing',
            weights: { emergencyFund: 25, savingsRate: 25, goalProgress: 15, investmentDiversity: 15, budgetAdherence: 10, tracking: 10 }
        },
        mid_career: {
            label: '📈 Mid Career (30s-40s)',
            description: 'Balanced growth & security',
            weights: { emergencyFund: 25, savingsRate: 20, goalProgress: 15, investmentDiversity: 15, budgetAdherence: 15, tracking: 10 }
        },
        pre_retirement: {
            label: '🏖️ Pre-Retirement (50+)',
            description: 'Capital preservation & goal completion',
            weights: { emergencyFund: 30, savingsRate: 15, goalProgress: 25, investmentDiversity: 10, budgetAdherence: 15, tracking: 5 }
        },
        custom: {
            label: '⚙️ Custom',
            description: 'Set your own priorities',
            weights: { emergencyFund: 25, savingsRate: 20, goalProgress: 15, investmentDiversity: 15, budgetAdherence: 15, tracking: 10 }
        }
    };

    const [customWeights, setCustomWeights] = useState(LIFE_STAGE_PRESETS.mid_career.weights);

    // Get current active weights
    const getActiveWeights = () => {
        if (lifeStage === 'custom') return customWeights;
        return LIFE_STAGE_PRESETS[lifeStage]?.weights || LIFE_STAGE_PRESETS.mid_career.weights;
    };


    const panelBg = isDark ? '#2d2d30' : '#f8f9fa';
    const textColor = isDark ? '#d4d4d4' : '#111827';
    const borderColor = isDark ? '#3e3e42' : '#d1d5db';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load transactions for expense calculation
            const txns = await DataAdapter.getTransactions();
            setTransactions(txns);

            // Calculate average monthly expenses (last 3 months)
            const now = new Date();
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

            const recentExpenses = txns.filter(t => {
                const tDate = new Date(t.date);
                return t.type === 'expense' && tDate >= threeMonthsAgo;
            });

            const totalExpenses = recentExpenses.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || 0)), 0);
            const monthsCount = Math.max(1, Math.min(3,
                Math.ceil((now - threeMonthsAgo) / (30 * 24 * 60 * 60 * 1000))
            ));
            setAvgMonthlyExpense(totalExpenses / monthsCount);

            // Load goals and investments for health score
            const savedGoals = await DataAdapter.getGoals();
            setGoals(savedGoals);

            const savedInvestments = await DataAdapter.getInvestments();
            setInvestments(savedInvestments);

            // Calculate health score
            calculateHealthScore(txns, savedGoals, savedInvestments);

        } catch (error) {
            console.error('Failed to load financial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateHealthScore = (txns, userGoals, userInvestments) => {
        let score = 0;
        const breakdown = {};
        const weights = getActiveWeights();

        // 1. Emergency Fund Coverage
        const savings = parseFloat(liquidSavings) || 0;
        const savedINR = CurrencyConverter.convert(savings, currency, 'INR') || 0;
        const coverageMonths = avgMonthlyExpense > 0 ? savedINR / avgMonthlyExpense : 0;
        const emergencyPoints = Math.min(weights.emergencyFund, (coverageMonths / targetMonths) * weights.emergencyFund) || 0;
        breakdown.emergencyFund = { score: Math.round(emergencyPoints) || 0, max: weights.emergencyFund, label: 'Emergency Fund', value: `${coverageMonths.toFixed(1)}/${targetMonths} months` };
        score += emergencyPoints;

        // 2. Savings Rate
        const now = new Date();
        const thisMonth = txns.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        });
        const monthlyIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(parseFloat(t.amount || 0)), 0);
        const monthlyExpenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(parseFloat(t.amount || 0)), 0);
        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
        const savingsPoints = Math.min(weights.savingsRate, Math.max(0, savingsRate) * (weights.savingsRate / 40)) || 0;
        breakdown.savingsRate = { score: Math.round(savingsPoints) || 0, max: weights.savingsRate, label: 'Savings Rate', value: `${(savingsRate || 0).toFixed(1)}%` };
        score += savingsPoints;

        // 3. Goal Progress
        if (userGoals && userGoals.length > 0) {
            const validGoals = userGoals.filter(g => g.target && g.target > 0);
            if (validGoals.length > 0) {
                const avgProgress = validGoals.reduce((sum, g) => sum + ((g.current || 0) / g.target), 0) / validGoals.length;
                const goalPoints = Math.min(weights.goalProgress, (avgProgress || 0) * weights.goalProgress);
                breakdown.goalProgress = { score: Math.round(goalPoints) || 0, max: weights.goalProgress, label: 'Goal Progress', value: `${((avgProgress || 0) * 100).toFixed(0)}%` };
                score += goalPoints;
            } else {
                breakdown.goalProgress = { score: 0, max: weights.goalProgress, label: 'Goal Progress', value: 'No valid goals' };
            }
        } else {
            breakdown.goalProgress = { score: 0, max: weights.goalProgress, label: 'Goal Progress', value: 'No goals set' };
        }

        // 4. Investment Diversity
        const investmentTypes = new Set((userInvestments || []).map(i => i.type || 'other'));
        const diversityPoints = Math.min(weights.investmentDiversity, investmentTypes.size * (weights.investmentDiversity / 3)) || 0;
        breakdown.investmentDiversity = { score: Math.round(diversityPoints), max: weights.investmentDiversity, label: 'Investment Diversity', value: `${investmentTypes.size} types` };
        score += diversityPoints;

        // 5. Budget Adherence
        let budgetPoints = 0;
        if (monthlyIncome > 0) {
            budgetPoints = monthlyExpenses <= monthlyIncome ? weights.budgetAdherence : Math.max(0, weights.budgetAdherence - ((monthlyExpenses - monthlyIncome) / monthlyIncome) * weights.budgetAdherence);
        } else if (monthlyExpenses === 0) {
            budgetPoints = weights.budgetAdherence; // No income, no expenses = neutral
        } else {
            budgetPoints = 0; // Spending without income
        }
        breakdown.budgetAdherence = { score: Math.round(budgetPoints) || 0, max: weights.budgetAdherence, label: 'Budget Adherence', value: monthlyExpenses <= monthlyIncome ? 'On Track' : 'Over Budget' };
        score += budgetPoints;

        // 6. Transaction Tracking
        const daysWithTxns = new Set(txns.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        }).map(t => new Date(t.date).getDate())).size;
        const trackingPoints = Math.min(weights.tracking, (daysWithTxns || 0) * (weights.tracking / 20));
        breakdown.tracking = { score: Math.round(trackingPoints) || 0, max: weights.tracking, label: 'Regular Tracking', value: `${daysWithTxns} days` };
        score += trackingPoints;


        setHealthScore(Math.round(score) || 0);
        setScoreBreakdown(breakdown);
    };

    // Recalculate score when savings change
    useEffect(() => {
        if (transactions.length > 0 || goals.length > 0) {
            calculateHealthScore(transactions, goals, investments);
        }
    }, [liquidSavings, avgMonthlyExpense]);

    const formatMoney = (amount) => CurrencyConverter.format(amount, currency);
    const toDisplay = (inr) => CurrencyConverter.convert(inr, 'INR', currency);
    const toINR = (display) => {
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        return display / rate;
    };

    // Emergency Fund Calculations
    const savingsINR = toINR(parseFloat(liquidSavings) || 0);
    const coverageMonths = avgMonthlyExpense > 0 ? savingsINR / avgMonthlyExpense : 0;
    const targetFund = avgMonthlyExpense * targetMonths;
    const gap = Math.max(0, targetFund - savingsINR);
    const monthlyNeeded = gap > 0 ? gap / 12 : 0; // 12 months to reach goal

    const getHealthColor = (score) => {
        if (score >= 80) return '#10b981'; // Green
        if (score >= 60) return '#f59e0b'; // Yellow
        if (score >= 40) return '#f97316'; // Orange
        return '#ef4444'; // Red
    };

    const getHealthLabel = (score) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Needs Attention';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <RefreshCw className="animate-spin" size={32} style={{ color: textColor }} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5', color: textColor }}>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: textColor }}>
                            <Shield className="text-blue-500" /> Financial Health
                        </h1>
                        <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Analyze your financial wellness and plan for security</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} style={{ color: textColor }} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b pb-2 flex-wrap" style={{ borderColor }}>
                    {[
                        { id: 'emergency', label: '🛡️ Emergency Fund', icon: Shield },
                        { id: 'score', label: '💯 Health Score', icon: TrendingUp },
                        { id: 'debt', label: '💳 Debt Payoff', icon: Banknote },
                        { id: 'preclosure', label: '💵 EMI Pre-closure', icon: Calendar },
                        { id: 'subscriptions', label: '🔄 Subscriptions', icon: CreditCard },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                            style={{
                                color: activeTab === tab.id ? '#fff' : textColor,
                                backgroundColor: activeTab === tab.id ? undefined : (isDark ? 'transparent' : '#e5e7eb')
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Emergency Fund Calculator */}
                {activeTab === 'emergency' && (
                    <div className="space-y-6">
                        {/* Auto-calculated Expenses Info */}
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="flex items-center gap-2 mb-3">
                                <Wallet className="text-purple-500" />
                                <h3 className="font-semibold">Average Monthly Expenses</h3>
                                <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                                    Auto-calculated
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-purple-500">
                                {formatMoney(toDisplay(avgMonthlyExpense))}
                            </div>
                            <p className="text-sm opacity-60 mt-1">
                                Based on your last 3 months of transactions
                            </p>
                        </div>

                        {/* Input: Current Savings */}
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="flex items-center gap-2 mb-3">
                                <PiggyBank className="text-green-500" />
                                <h3 className="font-semibold">Your Liquid Savings</h3>
                            </div>
                            <input
                                type="number"
                                placeholder="Enter your current savings..."
                                value={liquidSavings}
                                onChange={(e) => setLiquidSavings(e.target.value)}
                                className="w-full px-4 py-3 text-xl border rounded-lg"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            />
                            <p className="text-sm opacity-60 mt-2">
                                💡 Include only liquid assets (savings accounts, FDs, etc.) - not investments
                            </p>
                        </div>

                        {/* Target Selection */}
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="flex items-center gap-2 mb-3">
                                <Target className="text-orange-500" />
                                <h3 className="font-semibold">Target Emergency Fund</h3>
                            </div>
                            <div className="flex gap-2">
                                {[3, 6, 9, 12].map(months => (
                                    <button
                                        key={months}
                                        onClick={() => setTargetMonths(months)}
                                        className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${targetMonths === months
                                            ? 'bg-orange-500 text-white'
                                            : 'border hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                        style={{ borderColor: targetMonths === months ? 'transparent' : borderColor, color: targetMonths === months ? '#fff' : textColor }}
                                    >
                                        {months} Months
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Results */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Current Coverage */}
                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-sm font-medium mb-1" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>Current Coverage</div>
                                <div className={`text-2xl font-bold ${coverageMonths >= targetMonths ? 'text-green-500' : coverageMonths >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                                    {coverageMonths.toFixed(1)} months
                                </div>
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(100, (coverageMonths / targetMonths) * 100)}%`,
                                            backgroundColor: coverageMonths >= targetMonths ? '#10b981' : coverageMonths >= 3 ? '#f59e0b' : '#ef4444'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Target Fund */}
                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-sm font-medium mb-1" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>Target Fund ({targetMonths}mo)</div>
                                <div className="text-2xl font-bold text-blue-500">
                                    {formatMoney(toDisplay(targetFund))}
                                </div>
                            </div>

                            {/* Gap */}
                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-sm font-medium mb-1" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>Gap to Reach Target</div>
                                <div className={`text-2xl font-bold ${gap === 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {gap === 0 ? '✅ Complete!' : formatMoney(toDisplay(gap))}
                                </div>
                            </div>

                            {/* Monthly Savings Needed */}
                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-sm font-medium mb-1" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>Save Monthly (12mo plan)</div>
                                <div className="text-2xl font-bold text-orange-500">
                                    {gap === 0 ? '—' : formatMoney(toDisplay(monthlyNeeded))}
                                </div>
                            </div>
                        </div>

                        {/* Status Message */}
                        <div
                            className="p-4 rounded-xl border flex items-center gap-3"
                            style={{
                                backgroundColor: coverageMonths >= targetMonths
                                    ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7')
                                    : coverageMonths >= 3
                                        ? (isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef3c7')
                                        : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2'),
                                borderColor: coverageMonths >= targetMonths
                                    ? (isDark ? '#166534' : '#86efac')
                                    : coverageMonths >= 3
                                        ? (isDark ? '#854d0e' : '#fcd34d')
                                        : (isDark ? '#991b1b' : '#fca5a5')
                            }}
                        >
                            {coverageMonths >= targetMonths ? (
                                <>
                                    <CheckCircle className="text-green-500" size={24} />
                                    <div>
                                        <div className="font-semibold text-green-700 dark:text-green-300">Excellent! You've reached your emergency fund goal.</div>
                                        <div className="text-sm text-green-600 dark:text-green-400">You're financially prepared for unexpected situations.</div>
                                    </div>
                                </>
                            ) : coverageMonths >= 3 ? (
                                <>
                                    <AlertTriangle className="text-yellow-500" size={24} />
                                    <div>
                                        <div className="font-semibold text-yellow-700 dark:text-yellow-300">Good progress! Keep building your emergency fund.</div>
                                        <div className="text-sm text-yellow-600 dark:text-yellow-400">You have basic coverage. Saving {formatMoney(toDisplay(monthlyNeeded))}/month will get you to {targetMonths} months.</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="text-red-500" size={24} />
                                    <div>
                                        <div className="font-semibold" style={{ color: isDark ? '#fca5a5' : '#b91c1c' }}>Priority: Build your emergency fund</div>
                                        <div className="text-sm" style={{ color: isDark ? '#f87171' : '#dc2626' }}>Financial experts recommend at least 3-6 months of expenses saved.</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Financial Health Score */}
                {activeTab === 'score' && (
                    <div className="space-y-6">
                        {/* Main Score Card */}
                        <div className="p-6 rounded-xl border text-center" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-sm font-medium mb-2" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>Your Financial Health Score</div>
                            <div
                                className="text-6xl font-bold mb-2"
                                style={{ color: getHealthColor(healthScore) }}
                            >
                                {healthScore}
                            </div>
                            <div
                                className="text-xl font-semibold"
                                style={{ color: getHealthColor(healthScore) }}
                            >
                                {getHealthLabel(healthScore)}
                            </div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full mt-4 overflow-hidden max-w-md mx-auto">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${healthScore}%`,
                                        backgroundColor: getHealthColor(healthScore)
                                    }}
                                />
                            </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="text-blue-500" /> Score Breakdown
                            </h3>
                            <div className="space-y-4">
                                {Object.values(scoreBreakdown).map((item, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span>{item.label}</span>
                                            <span className="font-semibold">
                                                {item.score}/{item.max}
                                                {item.value && <span className="ml-2" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>({item.value})</span>}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${(item.score / item.max) * 100}%`,
                                                    backgroundColor: item.score >= item.max * 0.7 ? '#10b981' :
                                                        item.score >= item.max * 0.4 ? '#f59e0b' : '#ef4444'
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Life Stage Selector */}
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    🎯 Customize Your Score Weights
                                </h3>
                                <button
                                    onClick={() => setShowWeightConfig(!showWeightConfig)}
                                    className="text-sm px-3 py-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                                    style={{ color: textColor }}
                                >
                                    {showWeightConfig ? '▲ Hide' : '▼ Show'}
                                </button>
                            </div>

                            {showWeightConfig && (
                                <div className="space-y-4">
                                    {/* Life Stage Dropdown */}
                                    <div>
                                        <label className="text-sm opacity-70 block mb-2">Select Your Life Stage</label>
                                        <select
                                            value={lifeStage}
                                            onChange={(e) => {
                                                setLifeStage(e.target.value);
                                                if (e.target.value !== 'custom') {
                                                    setCustomWeights(LIFE_STAGE_PRESETS[e.target.value].weights);
                                                }
                                                setTimeout(() => calculateHealthScore(transactions, goals, investments), 0);
                                            }}
                                            className="w-full p-2 border rounded-lg text-sm"
                                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                        >
                                            {Object.entries(LIFE_STAGE_PRESETS).map(([key, preset]) => (
                                                <option key={key} value={key}>{preset.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs mt-1 opacity-60">{LIFE_STAGE_PRESETS[lifeStage]?.description}</p>
                                    </div>

                                    {/* Current Weights Display */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(getActiveWeights()).map(([key, value]) => {
                                            const labels = {
                                                emergencyFund: '🛡️ Emergency Fund',
                                                savingsRate: '💰 Savings Rate',
                                                goalProgress: '🎯 Goal Progress',
                                                investmentDiversity: '📊 Investments',
                                                budgetAdherence: '📋 Budget',
                                                tracking: '📝 Tracking'
                                            };
                                            return (
                                                <div key={key} className="p-2 rounded-lg border text-center" style={{ borderColor }}>
                                                    <div className="text-xs opacity-70">{labels[key]}</div>
                                                    <div className="text-lg font-bold" style={{ color: '#3b82f6' }}>{value}%</div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Custom Weight Sliders (only for custom mode) */}
                                    {lifeStage === 'custom' && (
                                        <div className="space-y-3 pt-3 border-t" style={{ borderColor }}>
                                            <div className="text-sm font-medium">Adjust Weights (Total: {Object.values(customWeights).reduce((a, b) => a + b, 0)}%)</div>
                                            {Object.entries(customWeights).map(([key, value]) => {
                                                const labels = {
                                                    emergencyFund: 'Emergency Fund',
                                                    savingsRate: 'Savings Rate',
                                                    goalProgress: 'Goal Progress',
                                                    investmentDiversity: 'Investment Diversity',
                                                    budgetAdherence: 'Budget Adherence',
                                                    tracking: 'Regular Tracking'
                                                };
                                                return (
                                                    <div key={key} className="flex items-center gap-3">
                                                        <span className="text-sm w-32">{labels[key]}</span>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="40"
                                                            value={value}
                                                            onChange={(e) => {
                                                                const newWeights = { ...customWeights, [key]: parseInt(e.target.value) };
                                                                setCustomWeights(newWeights);
                                                                setTimeout(() => calculateHealthScore(transactions, goals, investments), 0);
                                                            }}
                                                            className="flex-1"
                                                        />
                                                        <span className="text-sm font-bold w-10 text-right">{value}%</span>
                                                    </div>
                                                );
                                            })}
                                            {Object.values(customWeights).reduce((a, b) => a + b, 0) !== 100 && (
                                                <div className="text-xs text-orange-500">
                                                    ⚠️ Total should be 100% for accurate scoring (currently {Object.values(customWeights).reduce((a, b) => a + b, 0)}%)
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Tips */}
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="font-semibold mb-3">💡 Tips to Improve Your Score</h3>
                            <ul className="space-y-2 text-sm opacity-80">
                                {healthScore < 80 && (
                                    <>
                                        {scoreBreakdown.emergencyFund?.score < 20 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                Build your emergency fund to cover at least 6 months of expenses
                                            </li>
                                        )}
                                        {scoreBreakdown.savingsRate?.score < 15 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-500">•</span>
                                                Try to save at least 20% of your income each month
                                            </li>
                                        )}
                                        {scoreBreakdown.goalProgress?.score < 10 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-yellow-500">•</span>
                                                Set up financial goals and track your progress
                                            </li>
                                        )}
                                        {scoreBreakdown.investmentDiversity?.score < 10 && (
                                            <li className="flex items-start gap-2">
                                                <span className="text-blue-500">•</span>
                                                Diversify your investments across different asset types
                                            </li>
                                        )}
                                    </>
                                )}
                                {healthScore >= 80 && (
                                    <li className="flex items-start gap-2 text-green-600">
                                        <span>✅</span>
                                        Great job! Keep maintaining your financial habits.
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Debt Payoff Planner */}
                {activeTab === 'debt' && (
                    <div className="space-y-6">
                        {/* Add Debt Form */}
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Plus className="text-green-500" /> Add a Debt
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <input
                                    type="text"
                                    placeholder="Debt name (e.g., Credit Card)"
                                    id="debtName"
                                    className="px-3 py-2 border rounded-lg"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                />
                                <input
                                    type="number"
                                    placeholder="Balance"
                                    id="debtBalance"
                                    className="px-3 py-2 border rounded-lg"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                />
                                <input
                                    type="number"
                                    placeholder="Interest Rate %"
                                    id="debtRate"
                                    className="px-3 py-2 border rounded-lg"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                />
                                <input
                                    type="number"
                                    placeholder="Min. Payment"
                                    id="debtMinPayment"
                                    className="px-3 py-2 border rounded-lg"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const name = document.getElementById('debtName').value;
                                    const balance = parseFloat(document.getElementById('debtBalance').value) || 0;
                                    const rate = parseFloat(document.getElementById('debtRate').value) || 0;
                                    const minPayment = parseFloat(document.getElementById('debtMinPayment').value) || 0;
                                    if (name && balance > 0) {
                                        setDebts([...debts, { id: Date.now(), name, balance, rate, minPayment }]);
                                        document.getElementById('debtName').value = '';
                                        document.getElementById('debtBalance').value = '';
                                        document.getElementById('debtRate').value = '';
                                        document.getElementById('debtMinPayment').value = '';
                                    }
                                }}
                                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                                <Plus size={16} /> Add Debt
                            </button>
                        </div>

                        {/* Strategy Selector */}
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="font-semibold mb-3">Payoff Strategy</h3>
                            <div className="flex gap-3 flex-wrap">
                                <button
                                    onClick={() => setDebtStrategy('avalanche')}
                                    className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 transition-colors ${debtStrategy === 'avalanche' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : ''
                                        }`}
                                    style={{ borderColor: debtStrategy === 'avalanche' ? '#3b82f6' : borderColor }}
                                >
                                    <div className="font-bold text-blue-600">🏔️ Avalanche Method</div>
                                    <div className="text-sm opacity-70 mt-1">Pay highest interest first. Saves most money.</div>
                                </button>
                                <button
                                    onClick={() => setDebtStrategy('snowball')}
                                    className={`flex-1 min-w-[200px] p-4 rounded-lg border-2 transition-colors ${debtStrategy === 'snowball' ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : ''
                                        }`}
                                    style={{ borderColor: debtStrategy === 'snowball' ? '#22c55e' : borderColor }}
                                >
                                    <div className="font-bold text-green-600">⛄ Snowball Method</div>
                                    <div className="text-sm opacity-70 mt-1">Pay smallest balance first. Quick wins for motivation.</div>
                                </button>
                            </div>
                            <div className="mt-4">
                                <label className="text-sm opacity-70 block mb-2">Extra Monthly Payment</label>
                                <input
                                    type="number"
                                    placeholder="Additional amount you can pay monthly"
                                    value={extraPayment}
                                    onChange={(e) => setExtraPayment(e.target.value)}
                                    className="w-full max-w-xs px-3 py-2 border rounded-lg"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                />
                            </div>
                        </div>

                        {/* Debt List */}
                        {debts.length > 0 && (
                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <Banknote className="text-orange-500" /> Your Debts
                                </h3>
                                <div className="space-y-3">
                                    {debts
                                        .sort((a, b) => debtStrategy === 'avalanche' ? b.rate - a.rate : a.balance - b.balance)
                                        .map((debt, idx) => (
                                            <div key={debt.id} className="flex items-center justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-orange-500' : 'bg-gray-400'
                                                        }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{debt.name}</div>
                                                        <div className="text-xs opacity-60">
                                                            {debt.rate}% APR • Min: {formatMoney(toDisplay(debt.minPayment))}/mo
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <div className="font-bold text-red-500">{formatMoney(toDisplay(debt.balance))}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => setDebts(debts.filter(d => d.id !== debt.id))}
                                                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Payoff Summary */}
                        {debts.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(() => {
                                    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
                                    const totalMinPayment = debts.reduce((s, d) => s + d.minPayment, 0);
                                    const extra = parseFloat(extraPayment) || 0;
                                    const totalMonthlyPayment = totalMinPayment + extra;

                                    // Simple estimate: months to payoff (simplified, not compound)
                                    const avgRate = debts.reduce((s, d) => s + d.rate * d.balance, 0) / totalDebt;
                                    const monthlyInterest = (avgRate / 100 / 12) * totalDebt;
                                    const monthsToPayoff = totalMonthlyPayment > monthlyInterest
                                        ? Math.ceil(totalDebt / (totalMonthlyPayment - monthlyInterest * 0.5))
                                        : Infinity;

                                    return (
                                        <>
                                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                                <div className="text-sm opacity-60 mb-1">Total Debt</div>
                                                <div className="text-2xl font-bold text-red-500">{formatMoney(toDisplay(totalDebt))}</div>
                                            </div>
                                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                                <div className="text-sm opacity-60 mb-1">Monthly Payment</div>
                                                <div className="text-2xl font-bold text-orange-500">
                                                    {formatMoney(toDisplay(totalMonthlyPayment))}
                                                </div>
                                                {extra > 0 && (
                                                    <div className="text-xs text-green-500 mt-1">+{formatMoney(toDisplay(extra))} extra</div>
                                                )}
                                            </div>
                                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                                <div className="text-sm opacity-60 mb-1">Est. Payoff Time</div>
                                                <div className="text-2xl font-bold text-blue-500">
                                                    {monthsToPayoff === Infinity ? '∞' : `${monthsToPayoff} mo`}
                                                </div>
                                                {monthsToPayoff !== Infinity && monthsToPayoff > 12 && (
                                                    <div className="text-xs opacity-60 mt-1">~{(monthsToPayoff / 12).toFixed(1)} years</div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Empty State */}
                        {debts.length === 0 && (
                            <div className="p-8 rounded-xl border text-center" style={{ backgroundColor: panelBg, borderColor }}>
                                <Banknote size={48} className="mx-auto mb-3 opacity-40 text-gray-400" />
                                <p className="opacity-60">No debts added yet</p>
                                <p className="text-sm opacity-40 mt-1">Add your debts above to create a payoff plan</p>
                            </div>
                        )}
                    </div>
                )}

                {/* EMI Pre-closure Calculator */}
                {activeTab === 'preclosure' && (
                    <div className="space-y-6">
                        {/* Info Card */}
                        <div className="p-4 rounded-xl border bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20" style={{ borderColor }}>
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                                💵 What is EMI Pre-closure?
                            </h3>
                            <p className="text-sm opacity-80">
                                Pre-closure means paying off your loan early. Banks may charge 2-5% as penalty, but you save on future interest.
                                Use this calculator to check if pre-closure makes sense for you.
                            </p>
                        </div>

                        {/* Calculator */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Input Section */}
                            <div className="p-5 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4" style={{ color: textColor }}>Loan Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm mb-1 opacity-70">Outstanding Principal</label>
                                        <input
                                            type="number"
                                            value={preclosure.outstandingPrincipal}
                                            onChange={(e) => setPreclosure({ ...preclosure, outstandingPrincipal: e.target.value })}
                                            placeholder="e.g., 500000"
                                            className="w-full px-3 py-2 rounded-lg border text-sm"
                                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm mb-1 opacity-70">Interest Rate (%)</label>
                                            <input
                                                type="number"
                                                value={preclosure.interestRate}
                                                onChange={(e) => setPreclosure({ ...preclosure, interestRate: e.target.value })}
                                                placeholder="e.g., 10.5"
                                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                                step="0.1"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1 opacity-70">Remaining Months</label>
                                            <input
                                                type="number"
                                                value={preclosure.remainingMonths}
                                                onChange={(e) => setPreclosure({ ...preclosure, remainingMonths: e.target.value })}
                                                placeholder="e.g., 24"
                                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm mb-1 opacity-70">Monthly EMI</label>
                                            <input
                                                type="number"
                                                value={preclosure.monthlyEMI}
                                                onChange={(e) => setPreclosure({ ...preclosure, monthlyEMI: e.target.value })}
                                                placeholder="e.g., 25000"
                                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1 opacity-70">Pre-closure Charge (%)</label>
                                            <input
                                                type="number"
                                                value={preclosure.preclosureCharges}
                                                onChange={(e) => setPreclosure({ ...preclosure, preclosureCharges: e.target.value })}
                                                placeholder="2"
                                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                                step="0.5"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const principal = parseFloat(preclosure.outstandingPrincipal) || 0;
                                            const rate = parseFloat(preclosure.interestRate) / 100 / 12;
                                            const months = parseInt(preclosure.remainingMonths) || 0;
                                            const emi = parseFloat(preclosure.monthlyEMI) || 0;
                                            const chargePercent = parseFloat(preclosure.preclosureCharges) || 0;

                                            // Total amount if you continue paying EMI
                                            const totalIfContinue = emi * months;
                                            const interestIfContinue = totalIfContinue - principal;

                                            // Pre-closure calculation
                                            const preclosureCharge = principal * (chargePercent / 100);
                                            const totalPreclosureAmount = principal + preclosureCharge;
                                            const interestSaved = interestIfContinue;
                                            const netSavings = interestSaved - preclosureCharge;

                                            setPreclosureResult({
                                                totalIfContinue,
                                                interestIfContinue,
                                                preclosureCharge,
                                                totalPreclosureAmount,
                                                interestSaved,
                                                netSavings,
                                                recommendation: netSavings > 0 ? 'beneficial' : 'not_beneficial'
                                            });
                                        }}
                                        className="w-full py-2 rounded-lg font-medium text-white"
                                        style={{ backgroundColor: '#0078d4' }}
                                    >
                                        Calculate Pre-closure
                                    </button>
                                </div>
                            </div>

                            {/* Results Section */}
                            <div className="space-y-4">
                                {preclosureResult ? (
                                    <>
                                        <div className="p-5 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                            <h3 className="font-semibold mb-4" style={{ color: textColor }}>📊 Analysis</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between">
                                                    <span className="opacity-70">If you continue EMIs:</span>
                                                    <span className="font-semibold">{formatMoney(toDisplay(preclosureResult.totalIfContinue))}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="opacity-70">Interest you would pay:</span>
                                                    <span className="font-semibold text-red-500">{formatMoney(toDisplay(preclosureResult.interestIfContinue))}</span>
                                                </div>
                                                <hr style={{ borderColor }} />
                                                <div className="flex justify-between">
                                                    <span className="opacity-70">Pre-closure amount:</span>
                                                    <span className="font-semibold">{formatMoney(toDisplay(preclosureResult.totalPreclosureAmount))}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="opacity-70">Pre-closure charges:</span>
                                                    <span className="font-semibold text-orange-500">{formatMoney(toDisplay(preclosureResult.preclosureCharge))}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`p-5 rounded-xl border ${preclosureResult.recommendation === 'beneficial' ? 'bg-green-50 dark:bg-green-900/20 border-green-300' : 'bg-red-50 dark:bg-red-900/20 border-red-300'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="text-4xl">
                                                    {preclosureResult.recommendation === 'beneficial' ? '✅' : '❌'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg">
                                                        {preclosureResult.recommendation === 'beneficial' ? 'Pre-closure Recommended!' : 'Not Recommended'}
                                                    </div>
                                                    <div className={`text-2xl font-bold ${preclosureResult.netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        Net Savings: {formatMoney(toDisplay(Math.abs(preclosureResult.netSavings)))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-8 rounded-xl border text-center" style={{ backgroundColor: panelBg, borderColor }}>
                                        <Calendar size={48} className="mx-auto mb-3 opacity-40 text-gray-400" />
                                        <p className="opacity-60">Enter loan details and click Calculate</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Subscription Tracker */}
                {activeTab === 'subscriptions' && (
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(() => {
                                // Detect recurring transactions (same amount, same description, monthly)
                                const detectedSubs = [];
                                const expensesByDesc = {};

                                transactions.filter(t => t.type === 'expense').forEach(t => {
                                    const key = `${(t.description || '').toLowerCase().trim()}_${Math.abs(parseFloat(t.amount || 0)).toFixed(0)}`;
                                    if (!expensesByDesc[key]) {
                                        expensesByDesc[key] = [];
                                    }
                                    expensesByDesc[key].push(t);
                                });

                                // Find transactions that occur at least 2 times with similar descriptions
                                Object.entries(expensesByDesc).forEach(([key, txns]) => {
                                    if (txns.length >= 2 && txns[0].description) {
                                        const amount = Math.abs(parseFloat(txns[0].amount || 0));
                                        if (amount > 0 && amount < 10000) { // Reasonable subscription range
                                            // Check if monthly-ish (within 25-35 days apart)
                                            const dates = txns.map(t => new Date(t.date)).sort((a, b) => b - a);
                                            if (dates.length >= 2) {
                                                const daysBetween = (dates[0] - dates[1]) / (1000 * 60 * 60 * 24);
                                                if (daysBetween >= 20 && daysBetween <= 45) {
                                                    detectedSubs.push({
                                                        name: txns[0].description,
                                                        amount: amount,
                                                        category: txns[0].category || 'Subscription',
                                                        frequency: 'monthly',
                                                        lastDate: dates[0]
                                                    });
                                                }
                                            }
                                        }
                                    }
                                });

                                const monthlyTotal = detectedSubs.reduce((sum, s) => sum + s.amount, 0);
                                const yearlyTotal = monthlyTotal * 12;

                                return (
                                    <>
                                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                            <div className="text-sm opacity-60 mb-1">Detected Subscriptions</div>
                                            <div className="text-3xl font-bold text-blue-500">{detectedSubs.length}</div>
                                            <div className="text-xs opacity-60 mt-1">recurring expenses found</div>
                                        </div>
                                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                            <div className="text-sm opacity-60 mb-1">Monthly Cost</div>
                                            <div className="text-3xl font-bold text-orange-500">{formatMoney(toDisplay(monthlyTotal))}</div>
                                            <div className="text-xs opacity-60 mt-1">in subscriptions</div>
                                        </div>
                                        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                            <div className="text-sm opacity-60 mb-1">Yearly Cost</div>
                                            <div className="text-3xl font-bold text-red-500">{formatMoney(toDisplay(yearlyTotal))}</div>
                                            <div className="text-xs opacity-60 mt-1">per year on subscriptions</div>
                                        </div>

                                        {/* Subscription List */}
                                        <div className="md:col-span-3">
                                            <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                                    <CreditCard className="text-purple-500" />
                                                    Detected Recurring Expenses
                                                </h3>
                                                {detectedSubs.length === 0 ? (
                                                    <div className="text-center py-8 opacity-60">
                                                        <Calendar size={48} className="mx-auto mb-3 opacity-40" />
                                                        <p>No recurring subscriptions detected yet</p>
                                                        <p className="text-sm mt-1">Keep tracking expenses to auto-detect subscriptions</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {detectedSubs.sort((a, b) => b.amount - a.amount).map((sub, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold">
                                                                        {sub.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium">{sub.name}</div>
                                                                        <div className="text-xs opacity-60">{sub.category} • {sub.frequency}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-orange-500">{formatMoney(toDisplay(sub.amount))}/mo</div>
                                                                    <div className="text-xs opacity-60">{formatMoney(toDisplay(sub.amount * 12))}/yr</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Savings Tips */}
                                        {detectedSubs.length > 0 && (
                                            <div className="md:col-span-3">
                                                <div className="p-4 rounded-xl border bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20" style={{ borderColor }}>
                                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                                        💡 Potential Savings
                                                    </h3>
                                                    <ul className="text-sm space-y-1 opacity-80">
                                                        <li>• Review each subscription - are you actively using all of them?</li>
                                                        <li>• Look for annual payment options (often 15-20% cheaper)</li>
                                                        <li>• Consider family or group plans to split costs</li>
                                                        <li>• Set calendar reminders before renewal dates to evaluate</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialHealth;
