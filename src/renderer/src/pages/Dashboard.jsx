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
    const [loading, setLoading] = useState(true);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Phase 1 Enhancements State
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [trendRange, setTrendRange] = useState('6M'); // 1M, 3M, 6M, 1Y, YTD
    const [barChartKeys, setBarChartKeys] = useState(['income', 'expense']);

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

                // Global Totals
                if (t.type === 'income') {
                    totalIncome += amount;
                } else {
                    totalExpenses += amount;
                }

                // Monthly Stats (Based on Filter)
                if (tDate.getMonth() === (selectedMonth - 1) && tDate.getFullYear() === selectedYear) {
                    if (t.type === 'income') {
                        monthlyIncome += amount;
                    } else {
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
                }

                // Bar Chart Data (Last 6 months relative to NOW, not filter)
                if (last6Months[monthKey]) {
                    if (t.type === 'income') last6Months[monthKey].income += amount;
                    else last6Months[monthKey].expense += amount;
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

            // Convert Stats
            setStats({
                totalBalance: CurrencyConverter.convert(totalIncome - totalExpenses + alternativeAssets, 'INR', userCurrency),
                monthlyExpenses: CurrencyConverter.convert(monthlyExpenses, 'INR', userCurrency),
                monthlyIncome: CurrencyConverter.convert(monthlyIncome, 'INR', userCurrency),
                transactionCount: transactions.length,
                netWorthChange,
                netWorthChangePercent,
                alternativeAssets: CurrencyConverter.convert(alternativeAssets, 'INR', userCurrency)
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
            `}</style>
            {/* Header with Filter */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>Dashboard</h2>
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

            {/* Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg h-96 flex flex-col border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
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
                <div className="p-4 rounded-lg h-96 flex flex-col border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="col-span-1 lg:col-span-2 p-4 rounded-lg h-96 flex flex-col border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
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
                <div className="p-4 rounded-lg h-96 overflow-hidden flex flex-col border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
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
            </div>


            {/* AI Insights Section */}
            <div className="mb-6 p-4 rounded-lg border shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
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
        </div >
    );
};

export default Dashboard;
