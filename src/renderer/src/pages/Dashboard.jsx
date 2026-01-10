import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BarChart from '../components/BarChart';
import PieChart from '../components/PieChart';
import LineChart from '../components/LineChart';
import DataAdapter from '../utils/dataAdapter';
import Skeleton from '../components/Skeleton';
import CurrencyConverter from '../utils/CurrencyConverter';
import { getForexTotalInvested, getCommoditiesTotalInvested, getCryptoTotalInvested } from '../utils/portfolioUtils';

const Dashboard = ({ isDark, isPrivacyMode, animationsEnabled }) => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalBalance: 0,
        monthlyExpenses: 0,
        monthlyIncome: 0,
        transactionCount: 0
    });
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [netWorthData, setNetWorthData] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Phase 1 Enhancements State
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [trendRange, setTrendRange] = useState('6M'); // 1M, 3M, 6M, 1Y, YTD
    const [barChartKeys, setBarChartKeys] = useState(['income', 'expense']);

    // Dashboard Customization State
    const [showCustomizePanel, setShowCustomizePanel] = useState(false);
    const defaultWidgets = {
        summaryCards: { visible: true, label: '📊 Summary Cards', order: 0 },
        accountsOverview: { visible: true, label: '🏦 Accounts Overview', order: 1 },
        incomeExpenseChart: { visible: true, label: '📈 Income vs Expense', order: 2 },
        expenseBreakdown: { visible: true, label: '🥧 Expense Breakdown', order: 3 },
        netWorthTrend: { visible: true, label: '📉 Net Worth Trend', order: 4 },
        recentTransactions: { visible: true, label: '💳 Recent Transactions', order: 5 },
        aiInsights: { visible: true, label: '💡 AI Insights', order: 6 }
    };
    const [widgets, setWidgets] = useState(() => {
        const saved = localStorage.getItem('pocketwall_dashboard_widgets');
        if (saved) {
            const savedWidgets = JSON.parse(saved);
            // Merge saved with defaults to include any new widgets
            return { ...defaultWidgets, ...savedWidgets };
        }
        return defaultWidgets;
    });

    // Save widget preferences
    useEffect(() => {
        localStorage.setItem('pocketwall_dashboard_widgets', JSON.stringify(widgets));
    }, [widgets]);

    const toggleWidgetVisibility = (widgetKey) => {
        setWidgets(prev => ({
            ...prev,
            [widgetKey]: { ...prev[widgetKey], visible: !prev[widgetKey].visible }
        }));
    };

    const resetWidgets = () => {
        setWidgets(defaultWidgets);
    };

    // Drag & Drop State
    const [draggedWidget, setDraggedWidget] = useState(null);
    const [editMode, setEditMode] = useState(false);

    // Get widgets sorted by order
    const getSortedWidgetKeys = () => {
        return Object.keys(widgets).sort((a, b) => (widgets[a].order || 0) - (widgets[b].order || 0));
    };

    // Drag handlers
    const handleDragStart = (e, widgetKey) => {
        if (!editMode) {
            e.preventDefault();
            return;
        }
        setDraggedWidget(widgetKey);
        e.dataTransfer.setData('text/plain', widgetKey);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedWidget(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetKey) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceKey = e.dataTransfer.getData('text/plain') || draggedWidget;
        if (!sourceKey || sourceKey === targetKey) return;

        const sourceOrder = widgets[sourceKey].order;
        const targetOrder = widgets[targetKey].order;

        // Swap orders
        setWidgets(prev => ({
            ...prev,
            [sourceKey]: { ...prev[sourceKey], order: targetOrder },
            [targetKey]: { ...prev[targetKey], order: sourceOrder }
        }));
        setDraggedWidget(null);
    };

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const textColor = isDark ? '#ffffff' : '#000000';
    const labelColor = isDark ? '#999999' : '#666666';
    const panelBg = isDark ? '#1e1e1e' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d8';

    const [currency, setCurrency] = useState('INR');

    useEffect(() => {
        loadData();
    }, [filterDate, trendRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            const settings = await DataAdapter.getUserSettings();
            const userCurrency = settings.defaultCurrency || 'INR';
            setCurrency(userCurrency);

            // Fetch accounts for Accounts Overview widget
            const accountsData = await DataAdapter.getAccounts();
            setAccounts(accountsData);

            const transactions = await DataAdapter.getTransactions();

            // Calculate stats
            const now = new Date();
            const [selectedYear, selectedMonth] = filterDate.split('-').map(Number);

            let totalIncome = 0;
            let totalExpenses = 0;
            let monthlyIncome = 0;
            let monthlyExpenses = 0;
            const categoryExpenses = {};

            // Prepare Chart Data (Last 6 months)
            const last6Months = {};
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.toLocaleString('default', { month: 'short' })}`;
                last6Months[key] = { label: key, income: 0, expense: 0 };
            }

            // Net Worth History Calculation (Dynamic Range)
            const netWorthHistory = [];
            let monthsToLoad = 6;
            if (trendRange === '1M') monthsToLoad = 1;
            if (trendRange === '3M') monthsToLoad = 3;
            if (trendRange === '6M') monthsToLoad = 6;
            if (trendRange === '1Y') monthsToLoad = 12;
            if (trendRange === 'YTD') monthsToLoad = now.getMonth() + 1;

            for (let i = monthsToLoad - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0); // Last day of month
                const label = d.toLocaleString('default', { month: 'short', year: monthsToLoad > 12 ? '2-digit' : undefined });

                // Calculate balance up to this date
                const balanceAtDate = transactions.reduce((acc, t) => {
                    if (new Date(t.date) <= d) {
                        return acc + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount));
                    }
                    return acc;
                }, 0);

                netWorthHistory.push({
                    label,
                    value: CurrencyConverter.convert(balanceAtDate, 'INR', userCurrency)
                });
            }
            setNetWorthData(netWorthHistory);


            transactions.forEach(t => {
                const tDate = new Date(t.date);
                const amount = Math.abs(parseFloat(t.amount));
                const monthKey = tDate.toLocaleString('default', { month: 'short' });

                // Global Totals - EXCLUDE TRANSFERS (they're just money movement, not income/expense)
                if (t.type === 'income') {
                    totalIncome += amount;
                } else if (t.type === 'expense') {
                    totalExpenses += amount;
                }
                // transfers are excluded from totals

                // Monthly Stats (Based on Filter) - EXCLUDE TRANSFERS
                if (tDate.getMonth() === (selectedMonth - 1) && tDate.getFullYear() === selectedYear) {
                    if (t.type === 'income') {
                        monthlyIncome += amount;
                    } else if (t.type === 'expense') {
                        monthlyExpenses += amount;

                        // Pie Chart Data - Handle Splits
                        if (t.splits && t.splits.length > 0) {
                            t.splits.forEach(split => {
                                const rate = t.exchangeRate || 1;
                                const splitAmountINR = parseFloat(split.amount) * rate;
                                categoryExpenses[split.category] = (categoryExpenses[split.category] || 0) + splitAmountINR;
                            });
                        } else {
                            categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + amount;
                        }
                    }
                    // transfers are excluded from pie chart and monthly stats
                }

                // Bar Chart Data (Last 6 months relative to NOW, not filter) - EXCLUDE TRANSFERS
                if (last6Months[monthKey]) {
                    if (t.type === 'income') last6Months[monthKey].income += amount;
                    else if (t.type === 'expense') last6Months[monthKey].expense += amount;
                    // transfers are excluded from bar chart
                }
            });

            // Calculate Net Worth Change (vs Last Month)
            let netWorthChange = 0;
            let netWorthChangePercent = 0;
            if (netWorthHistory.length >= 2) {
                const currentNW = netWorthHistory[netWorthHistory.length - 1].value;
                const prevNW = netWorthHistory[netWorthHistory.length - 2].value;
                netWorthChange = currentNW - prevNW;
                netWorthChangePercent = prevNW !== 0 ? (netWorthChange / prevNW) * 100 : 0;
            }

            // Add alternative assets (invested amounts)
            const forexInvested = getForexTotalInvested();
            const commoditiesInvested = getCommoditiesTotalInvested();
            const cryptoInvested = getCryptoTotalInvested();
            const alternativeAssets = forexInvested + commoditiesInvested + cryptoInvested;

            // ===== CORRECT NET WORTH CALCULATION =====
            // Net Worth = Assets - Liabilities
            
            // ASSETS:
            // 1. Account Balances (Bank, Cash, Wallet - already have currentBalance)
            const totalAccountBalances = accountsData.reduce((sum, acc) => {
                // Credit cards have negative balance (liability), handled separately
                if (acc.type === 'Credit Card') return sum;
                return sum + (parseFloat(acc.currentBalance) || 0);
            }, 0);
            
            // 2. Investments (Stocks, MFs, etc.)
            const investments = await DataAdapter.getInvestments();
            const totalInvestments = investments.reduce((sum, inv) => {
                return sum + (parseFloat(inv.currentValue) || parseFloat(inv.amount) || 0);
            }, 0);
            
            // 3. Fixed Assets (Property, Gold, Vehicles)
            const assets = await DataAdapter.getAssets();
            const totalFixedAssets = assets.reduce((sum, asset) => {
                return sum + (parseFloat(asset.currentValue) || parseFloat(asset.value) || 0);
            }, 0);
            
            // LIABILITIES:
            // 1. Credit Card Balances (negative = owed)
            const creditCardDebt = accountsData.reduce((sum, acc) => {
                if (acc.type === 'Credit Card') {
                    // Credit card balance is typically negative when you owe money
                    return sum + Math.abs(parseFloat(acc.currentBalance) || 0);
                }
                return sum;
            }, 0);
            
            // 2. Loans (Home, Car, Personal, etc.)
            const loans = await DataAdapter.getLoans();
            const totalLoans = loans.reduce((sum, loan) => {
                // Outstanding balance = Principal - Paid
                const outstanding = (parseFloat(loan.amount) || 0) - (parseFloat(loan.paidAmount) || 0);
                return sum + Math.max(0, outstanding);
            }, 0);
            
            // FINAL NET WORTH CALCULATION
            const totalAssets = totalAccountBalances + totalInvestments + totalFixedAssets + alternativeAssets;
            const totalLiabilities = creditCardDebt + totalLoans;
            const netWorth = totalAssets - totalLiabilities;

            // Convert Stats
            setStats({
                totalBalance: CurrencyConverter.convert(netWorth, 'INR', userCurrency),
                monthlyExpenses: CurrencyConverter.convert(monthlyExpenses, 'INR', userCurrency),
                monthlyIncome: CurrencyConverter.convert(monthlyIncome, 'INR', userCurrency),
                transactionCount: transactions.length,
                netWorthChange,
                netWorthChangePercent,
                alternativeAssets: CurrencyConverter.convert(alternativeAssets, 'INR', userCurrency),
                // Breakdown for transparency
                totalAssets: CurrencyConverter.convert(totalAssets, 'INR', userCurrency),
                totalLiabilities: CurrencyConverter.convert(totalLiabilities, 'INR', userCurrency),
                accountBalances: CurrencyConverter.convert(totalAccountBalances, 'INR', userCurrency),
                investments: CurrencyConverter.convert(totalInvestments, 'INR', userCurrency),
                fixedAssets: CurrencyConverter.convert(totalFixedAssets, 'INR', userCurrency)
            });

            // Convert Chart Data
            const convertedChartData = Object.values(last6Months).map(item => ({
                ...item,
                income: CurrencyConverter.convert(item.income, 'INR', userCurrency),
                expense: CurrencyConverter.convert(item.expense, 'INR', userCurrency)
            }));
            setChartData(convertedChartData);

            // Format Pie Data (Convert values)
            const pie = Object.entries(categoryExpenses)
                .map(([label, value]) => ({
                    label,
                    value: CurrencyConverter.convert(value, 'INR', userCurrency)
                }))
                .sort((a, b) => b.value - a.value);
            setPieData(pie);

            // Get recent 20 transactions
            // Note: Transactions list usually shows original currency, but for consistency we might want to show converted or original.
            // User said "baaki final numbers... jin pr transaction ka asar nahi padta". 
            // Transactions list is "transactions", so maybe keep original? 
            // But "Recent Transactions" on dashboard usually implies a summary view.
            // I will convert them for display consistency on Dashboard.
            const recent = transactions.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(t => ({
                ...t,
                amount: CurrencyConverter.convert(parseFloat(t.amount), 'INR', userCurrency)
            }));
            setRecentTransactions(recent);

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    // Filter transactions based on drill-down
    const filteredTransactions = selectedCategory
        ? recentTransactions.filter(t => t.category === selectedCategory || (t.splits && t.splits.some(s => s.category === selectedCategory)))
        : recentTransactions;

    const toggleBarKey = (key) => {
        setBarChartKeys(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    return (
        <div className="p-6 flex flex-col" style={{
            backgroundColor: bgColor,
            fontFamily: 'Inter, sans-serif',
            animation: `fadeInUp var(--transition-speed, 0.3s) ease-out`
        }}>
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes widgetFadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .widget-animate {
                    animation: widgetFadeIn 0.3s ease-out;
                }
                .edit-mode-widget {
                    cursor: grab;
                    position: relative;
                }
                .edit-mode-widget:active {
                    cursor: grabbing;
                }
                .edit-mode-widget::before {
                    content: '⋮⋮';
                    position: absolute;
                    left: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    opacity: 0.5;
                    font-size: 16px;
                    letter-spacing: -3px;
                }
                .drag-over {
                    border: 2px dashed #3b82f6 !important;
                    background: rgba(59, 130, 246, 0.1) !important;
                }
            `}</style>
            {/* Header with Filter */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>Dashboard</h2>
                <div className="flex items-center gap-3">
                    {/* Customize Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowCustomizePanel(!showCustomizePanel)}
                            className="p-2 rounded-lg border hover:bg-opacity-80 transition-colors"
                            style={{ backgroundColor: panelBg, borderColor }}
                            title="Customize Dashboard"
                        >
                            <span style={{ color: textColor }}>⚙️</span>
                        </button>

                        {/* Customization Panel */}
                        {showCustomizePanel && (
                            <div
                                className="absolute right-0 top-12 w-64 p-4 rounded-lg border shadow-xl z-50"
                                style={{ backgroundColor: panelBg, borderColor }}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm" style={{ color: textColor }}>Customize Widgets</h4>
                                    <button
                                        onClick={resetWidgets}
                                        className="text-xs text-blue-500 hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {Object.entries(widgets)
                                        .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
                                        .map(([key, widget]) => (
                                            <div
                                                key={key}
                                                draggable={editMode}
                                                onDragStart={(e) => handleDragStart(e, key)}
                                                onDragEnd={handleDragEnd}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, key)}
                                                className={`flex items-center gap-2 p-2 rounded transition-all ${editMode ? 'cursor-grab hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30' : 'hover:bg-black/5 dark:hover:bg-white/5'
                                                    } ${draggedWidget === key ? 'opacity-50' : ''}`}
                                            >
                                                {editMode && (
                                                    <span className="text-xs opacity-50 select-none">⋮⋮</span>
                                                )}
                                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={widget.visible}
                                                        onChange={() => toggleWidgetVisibility(key)}
                                                        className="w-4 h-4 rounded"
                                                    />
                                                    <span className="text-sm select-none" style={{ color: textColor }}>{widget.label}</span>
                                                </label>
                                            </div>
                                        ))}
                                </div>
                                <div className="mt-3 pt-3 border-t" style={{ borderColor }}>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={editMode}
                                            onChange={() => setEditMode(!editMode)}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-sm font-medium" style={{ color: textColor }}>
                                            ✋ Drag to Reorder
                                        </span>
                                    </label>
                                    {editMode && (
                                        <p className="text-xs mt-1 opacity-60" style={{ color: textColor }}>
                                            Drag widgets by their headers
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-3 px-3 py-1 rounded-full border" style={{ backgroundColor: panelBg, borderColor }}>
                        <span className="text-xs font-medium" style={{ color: labelColor }}>Analysis Period:</span>
                        <input
                            type="month"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent text-sm font-medium focus:outline-none"
                            style={{ color: textColor }}
                        />
                    </div>
                </div>
            </div>

            {/* Click outside to close customize panel */}
            {showCustomizePanel && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowCustomizePanel(false)}
                />
            )}

            {/* Summary Section */}
            {widgets.summaryCards?.visible && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 widget-animate">
                    <div className="p-4 rounded-lg flex flex-col justify-between h-28 border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="text-sm font-medium opacity-70" style={{ color: labelColor }}>Total Net Worth</div>
                        <div>
                            <div className={`text-2xl font-bold sensitive-amount ${isPrivacyMode ? 'privacy-blur' : ''}`} style={{ color: stats.totalBalance >= 0 ? 'var(--positive-color)' : 'var(--negative-color)' }}>
                                {loading ? <Skeleton width="120px" height="32px" /> : formatCurrency(stats.totalBalance)}
                            </div>
                            {!loading && (
                                <div className={`text-xs font-semibold flex items-center gap-1 ${stats.netWorthChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {stats.netWorthChange >= 0 ? '▲' : '▼'} {Math.abs(stats.netWorthChangePercent).toFixed(1)}%
                                    <span className="opacity-60 font-normal" style={{ color: textColor }}> vs last month</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 rounded-lg flex flex-col justify-between h-28 border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="text-sm font-medium opacity-70" style={{ color: labelColor }}>Monthly Income</div>
                        <div className={`text-2xl font-bold sensitive-amount ${isPrivacyMode ? 'privacy-blur' : ''}`} style={{ color: 'var(--positive-color)' }}>
                            {loading ? <Skeleton width="100px" height="32px" /> : formatCurrency(stats.monthlyIncome)}
                        </div>
                    </div>
                    <div className="p-4 rounded-lg flex flex-col justify-between h-28 border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="text-sm font-medium opacity-70" style={{ color: labelColor }}>Monthly Expenses</div>
                        <div className={`text-2xl font-bold sensitive-amount ${isPrivacyMode ? 'privacy-blur' : ''}`} style={{ color: 'var(--negative-color)' }}>
                            {loading ? <Skeleton width="100px" height="32px" /> : formatCurrency(stats.monthlyExpenses)}
                        </div>
                    </div>
                    <div className="p-4 rounded-lg flex flex-col justify-between h-28 border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="text-sm font-medium opacity-70" style={{ color: labelColor }}>Savings Rate</div>
                        <div className="text-2xl font-bold" style={{ color: '#3b82f6' }}>
                            {loading ? <Skeleton width="80px" height="32px" /> : `${stats.monthlyIncome > 0 ? Math.round(((stats.monthlyIncome - stats.monthlyExpenses) / stats.monthlyIncome) * 100) : 0}%`}
                        </div>
                    </div>
                </div>
            )}

            {/* Accounts Overview Widget - NEW! Shows all accounts with balances */}
            {widgets.accountsOverview?.visible && (
                <div className="mb-6 widget-animate">
                    <div className="p-4 rounded-lg border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: textColor }}>
                                🏦 Your Accounts
                            </h3>
                            <button
                                onClick={() => navigate('/accounts')}
                                className="text-xs text-blue-500 hover:underline"
                            >
                                Manage →
                            </button>
                        </div>
                        
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="p-3 rounded-lg border" style={{ borderColor }}>
                                        <Skeleton width="60%" height="16px" />
                                        <Skeleton width="80%" height="24px" className="mt-2" />
                                    </div>
                                ))}
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="text-center py-8 opacity-60" style={{ color: textColor }}>
                                <p className="mb-2">No accounts yet</p>
                                <button
                                    onClick={() => navigate('/accounts')}
                                    className="text-sm text-blue-500 hover:underline"
                                >
                                    + Add your first account
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {accounts.slice(0, 4).map(account => {
                                        const balance = CurrencyConverter.convert(account.currentBalance || 0, 'INR', currency);
                                        const isNegative = balance < 0;
                                        const accountTypeIcon = {
                                            'Bank': '🏦',
                                            'Cash': '💵',
                                            'Credit Card': '💳',
                                            'Wallet': '👛',
                                            'Investment': '📈'
                                        }[account.type] || '💰';
                                        
                                        return (
                                            <div
                                                key={account.id}
                                                className="p-3 rounded-lg border hover:shadow-sm transition-shadow"
                                                style={{ 
                                                    borderColor,
                                                    backgroundColor: isDark ? '#252526' : '#f9fafb'
                                                }}
                                            >
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span>{accountTypeIcon}</span>
                                                    <span className="text-sm font-medium truncate" style={{ color: textColor }}>
                                                        {account.name}
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded opacity-60" style={{ backgroundColor: isDark ? '#3e3e42' : '#e5e7eb', color: textColor }}>
                                                        {account.type}
                                                    </span>
                                                </div>
                                                <div className={`text-xl font-bold sensitive-amount ${isPrivacyMode ? 'privacy-blur' : ''}`}
                                                    style={{ color: isNegative ? '#ef4444' : '#10b981' }}>
                                                    {formatCurrency(balance)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {accounts.length > 4 && (
                                    <button
                                        onClick={() => navigate('/accounts')}
                                        className="mt-3 text-sm text-blue-500 hover:underline"
                                    >
                                        View all {accounts.length} accounts →
                                    </button>
                                )}
                                
                                {/* Total Balance Footer */}
                                <div className="mt-4 pt-4 border-t flex justify-between items-center" style={{ borderColor }}>
                                    <span className="text-sm font-medium opacity-70" style={{ color: labelColor }}>
                                        Total Across All Accounts
                                    </span>
                                    <span className={`text-xl font-bold sensitive-amount ${isPrivacyMode ? 'privacy-blur' : ''}`}
                                        style={{ color: accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(CurrencyConverter.convert(
                                            accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0),
                                            'INR',
                                            currency
                                        ))}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {widgets.incomeExpenseChart?.visible && (
                    <div className="p-4 rounded-lg h-96 flex flex-col border shadow-sm widget-animate" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold" style={{ color: textColor }}>Income vs Expense</h3>
                            <div className="flex gap-2">
                                {['income', 'expense'].map(key => (
                                    <button
                                        key={key}
                                        onClick={() => toggleBarKey(key)}
                                        className={`text-xs px-2 py-1 rounded border transition-all ${!barChartKeys.includes(key) ? 'opacity-50 grayscale' : ''}`}
                                        style={{
                                            borderColor,
                                            color: textColor,
                                            backgroundColor: key === 'income' ? (isDark ? '#90EE9020' : '#00800020') : (isDark ? '#FF6B6B20' : '#ff000020')
                                        }}
                                    >
                                        {key === 'income' ? 'Income' : 'Expense'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {loading ? <Skeleton width="100%" height="100%" /> : <div style={{ flex: 1, minHeight: 0 }}><BarChart data={chartData} isDark={isDark} keys={barChartKeys} isPrivacyMode={isPrivacyMode} currency={currency} animate={animationsEnabled} /></div>}
                    </div>
                )}
                {widgets.expenseBreakdown?.visible && (
                    <div className="p-4 rounded-lg h-96 flex flex-col border shadow-sm widget-animate" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold" style={{ color: textColor }}>Expense Breakdown</h3>
                            {selectedCategory && (
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
                                >
                                    Clear Filter
                                </button>
                            )}
                        </div>
                        {loading ? <Skeleton width="100%" height="100%" variant="circular" /> : (
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <PieChart
                                    data={pieData}
                                    isDark={isDark}
                                    onClick={(node) => setSelectedCategory(node.id === selectedCategory ? null : node.id)}
                                    isPrivacyMode={isPrivacyMode}
                                    currency={currency}
                                    animate={animationsEnabled}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {widgets.netWorthTrend?.visible && (
                    <div className="col-span-1 lg:col-span-2 p-4 rounded-lg h-96 flex flex-col border shadow-sm widget-animate" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold" style={{ color: textColor }}>Net Worth Trend</h3>
                            <div className="flex rounded border overflow-hidden" style={{ borderColor }}>
                                {['1M', '3M', '6M', '1Y', 'YTD'].map(range => (
                                    <button
                                        key={range}
                                        onClick={() => setTrendRange(range)}
                                        className={`px-3 py-1 text-xs transition-colors ${trendRange === range ? 'font-bold' : ''}`}
                                        style={{
                                            backgroundColor: trendRange === range ? (isDark ? '#3e3e42' : '#e0e0e0') : 'transparent',
                                            color: textColor,
                                            borderLeft: range !== '1M' ? `1px solid ${borderColor}` : 'none'
                                        }}
                                    >
                                        {range}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {loading ? <Skeleton width="100%" height="100%" /> : <div style={{ flex: 1, minHeight: 0 }}><LineChart data={netWorthData} isDark={isDark} isPrivacyMode={isPrivacyMode} currency={currency} animate={animationsEnabled} /></div>}
                    </div>
                )}
                {widgets.recentTransactions?.visible && (
                    <div className="p-4 rounded-lg h-96 overflow-hidden flex flex-col border shadow-sm widget-animate" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="text-lg font-semibold mb-4" style={{ color: textColor }}>
                            Recent Transactions {selectedCategory && <span className="text-sm font-normal opacity-70">({selectedCategory})</span>}
                        </h3>
                        <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <div key={i} className="flex justify-between mb-4">
                                        <div className="flex gap-3">
                                            <Skeleton width="32px" height="32px" variant="circular" />
                                            <div>
                                                <Skeleton width="100px" height="14px" className="mb-1" />
                                                <Skeleton width="60px" height="10px" />
                                            </div>
                                        </div>
                                        <Skeleton width="60px" height="16px" />
                                    </div>
                                ))
                            ) : (
                                filteredTransactions.map(t => {
                                    // Smart Display Logic
                                    const accountName = t.accountName || 'Main Account'; // Assuming accountName is populated, fallback to Main
                                    let primaryText = accountName;
                                    let secondaryText = t.category;

                                    if (t.payee && t.description) {
                                        secondaryText = `${t.payee} (${t.description})`;
                                    } else if (t.payee) {
                                        secondaryText = t.payee;
                                    } else if (t.description) {
                                        secondaryText = t.description;
                                    }

                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => navigate('/transactions', { state: { editId: t.id } })}
                                            className="flex justify-between items-center mb-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: t.type === 'income' ? '#dcfce7' : '#fee2e2', color: t.type === 'income' ? '#166534' : '#991b1b' }}>
                                                    {t.type === 'income' ? '↓' : '↑'}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm" style={{ color: textColor }}>{primaryText}</div>
                                                    <div className="text-xs opacity-60" style={{ color: textColor }}>
                                                        {secondaryText} • {new Date(t.date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`font-semibold text-sm sensitive-amount ${isPrivacyMode ? 'privacy-blur' : ''}`} style={{ color: t.type === 'income' ? 'var(--positive-color)' : 'var(--negative-color)' }}>
                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>


            {/* AI Insights Section */}
            {widgets.aiInsights?.visible && (
                <div className="mb-6 p-4 rounded-lg border shadow-sm widget-animate" style={{ backgroundColor: panelBg, borderColor }}>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: textColor }}>
                        <span>💡</span> Insights & Recommendations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                            <div className="font-semibold text-sm text-blue-700 dark:text-blue-300 mb-1">Savings Goal</div>
                            <p className="text-xs opacity-80" style={{ color: textColor }}>
                                {stats.monthlyIncome > stats.monthlyExpenses
                                    ? `Great job! You saved ${formatCurrency(stats.monthlyIncome - stats.monthlyExpenses)} this month. Keep it up to build your wealth.`
                                    : `You spent ${formatCurrency(stats.monthlyExpenses - stats.monthlyIncome)} more than you earned. Consider reviewing your discretionary spending.`
                                }
                            </p>
                        </div>
                        <div className="p-3 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                            <div className="font-semibold text-sm text-purple-700 dark:text-purple-300 mb-1">Net Worth Growth</div>
                            <p className="text-xs opacity-80" style={{ color: textColor }}>
                                {stats.netWorthChange >= 0
                                    ? `Your net worth grew by ${formatCurrency(stats.netWorthChange)} (${stats.netWorthChangePercent.toFixed(1)}%) recently. Consistent investing accelerates this growth.`
                                    : `Your net worth decreased by ${formatCurrency(Math.abs(stats.netWorthChange))}. Market fluctuations or high expenses might be the cause.`
                                }
                            </p>
                        </div>
                        <div className="p-3 rounded bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                            <div className="font-semibold text-sm text-green-700 dark:text-green-300 mb-1">Smart Tip</div>
                            <p className="text-xs opacity-80" style={{ color: textColor }}>
                                {stats.monthlyExpenses > 0 && (stats.monthlyExpenses / stats.monthlyIncome) > 0.5
                                    ? "Your expenses are over 50% of your income. Try the 50/30/20 rule: 50% Needs, 30% Wants, 20% Savings."
                                    : "You are maintaining a healthy expense ratio. Consider increasing your investments for long-term compounding."
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Dashboard;
