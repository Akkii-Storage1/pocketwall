import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line';
import { motion } from 'framer-motion';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Target, Activity, PieChart, AlertCircle } from 'lucide-react';

const DataGallery = ({ isDark, animationsEnabled }) => {
    const [transactions, setTransactions] = useState([]);
    const [budgets, setBudgets] = useState({});
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState('INR');
    const [error, setError] = useState(null);

    const bgColor = isDark ? '#1e1e1e' : '#f8f9fa';
    const cardBg = isDark ? '#2d2d30' : '#ffffff';
    const textColor = isDark ? '#e0e0e0' : '#333333';
    const borderColor = isDark ? '#444' : '#e0e0e0';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [settings, data, budgetData] = await Promise.all([
                DataAdapter.getUserSettings(),
                DataAdapter.getTransactions(),
                DataAdapter.getBudgets()
            ]);

            setCurrency(settings.defaultCurrency || 'INR');
            setTransactions(data || []);
            setBudgets(budgetData || {});
        } catch (err) {
            console.error("Failed to load gallery data:", err);
            setError("Failed to load financial data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Memoized Data Processing
    const processedData = useMemo(() => {
        if (!transactions.length) return null;

        const toDisplay = (amount) => CurrencyConverter.convert(amount, 'INR', currency);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Helper for date comparison
        const isCurrentMonth = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };

        const isLastMonth = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        };

        // 1. Monthly Comparison
        const monthlyStats = {};
        transactions.forEach(t => {
            if (!t.date) return;
            const mKey = t.date.slice(0, 7); // Keep YYYY-MM for grouping
            if (!monthlyStats[mKey]) monthlyStats[mKey] = { month: mKey, income: 0, expense: 0 };
            if (t.type === 'income') monthlyStats[mKey].income += t.amount;
            else if (t.type === 'expense') monthlyStats[mKey].expense += Math.abs(t.amount);
        });
        const sortedMonths = Object.keys(monthlyStats).sort().slice(-6);
        const monthlyData = sortedMonths.map(m => ({
            month: m,
            Income: toDisplay(monthlyStats[m].income),
            Expense: toDisplay(monthlyStats[m].expense)
        }));

        // Helper to process expense amount (handling splits)
        const getExpenseDetails = (t) => {
            if (t.splits && t.splits.length > 0) {
                return t.splits.map(s => ({
                    category: (s.category || 'Uncategorized').trim(),
                    amount: Math.abs(parseFloat(s.amount) || 0)
                }));
            }
            return [{
                category: (t.category || 'Uncategorized').trim(),
                amount: Math.abs(parseFloat(t.amount) || 0)
            }];
        };

        // 2. Expense Breakdown (Current Month)
        const categoryStats = {};
        let totalExpense = 0;
        transactions.filter(t => t.type === 'expense' && isCurrentMonth(t.date)).forEach(t => {
            const details = getExpenseDetails(t);
            details.forEach(d => {
                categoryStats[d.category] = (categoryStats[d.category] || 0) + d.amount;
                totalExpense += d.amount;
            });
        });

        const categoryData = Object.keys(categoryStats)
            .map(cat => ({
                id: cat,
                label: cat,
                value: toDisplay(categoryStats[cat]),
                percent: totalExpense > 0 ? (categoryStats[cat] / totalExpense) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8); // Top 8 categories

        // 3. Spending Velocity (Cumulative Daily Spend)
        // Optimized O(N) approach
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const velocityData = [];

        // Filter current and last month expenses
        const currentMonthExpenses = transactions.filter(t => t.type === 'expense' && isCurrentMonth(t.date));
        const lastMonthExpenses = transactions.filter(t => t.type === 'expense' && isLastMonth(t.date));

        // Helper to get cumulative daily data
        const getCumulative = (txns, label) => {
            const daily = new Array(daysInMonth + 1).fill(0);
            txns.forEach(t => {
                const day = parseInt(t.date.slice(8, 10), 10);
                if (day >= 1 && day <= daysInMonth) {
                    const amount = t.splits ? t.splits.reduce((sum, s) => sum + parseFloat(s.amount), 0) : parseFloat(t.amount);
                    daily[day] += Math.abs(amount);
                }
            });

            const dataPoints = [];
            let cumulative = 0;
            for (let i = 1; i <= daysInMonth; i++) {
                cumulative += daily[i];
                // Only push up to today for current month
                if (label === 'Current Month' && i > now.getDate()) break;
                dataPoints.push({ x: i, y: toDisplay(cumulative) });
            }
            return { id: label, data: dataPoints };
        };

        velocityData.push(getCumulative(lastMonthExpenses, 'Last Month'));
        velocityData.push(getCumulative(currentMonthExpenses, 'Current Month'));

        // 4. Net Worth Trend
        const netWorthData = (() => {
            // Group by month
            const monthlyNet = {};
            // Initialize with all months from transactions
            transactions.forEach(t => {
                const m = t.date.slice(0, 7);
                if (!monthlyNet[m]) monthlyNet[m] = 0;
            });

            const sortedM = Object.keys(monthlyNet).sort();
            let cumulativeNW = 0; // Assuming 0 start, or fetch opening balance

            const trend = sortedM.map(m => {
                // Calculate net change for this month
                const monthTxns = transactions.filter(t => t.date.startsWith(m));
                const income = monthTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                const expense = monthTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
                const netChange = income - expense;
                cumulativeNW += netChange;

                return {
                    x: m,
                    y: toDisplay(cumulativeNW)
                };
            });
            return [{ id: 'Net Worth', data: trend }];
        })();

        // 5. Budget Health
        const budgetHealthData = Object.keys(budgets).map(cat => {
            const limit = budgets[cat] || 0;
            const spent = transactions
                .filter(t => t.type === 'expense' && isCurrentMonth(t.date) && t.category === cat)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            return {
                category: cat,
                limit: toDisplay(limit),
                spent: toDisplay(spent),
                ratio: limit > 0 ? (spent / limit) * 100 : 0
            };
        }).sort((a, b) => b.ratio - a.ratio).slice(0, 5); // Top 5 at risk

        // 6. Fixed vs Variable
        // Simple heuristic: Fixed = Rent, EMI, Insurance, Bills. Variable = Food, Shopping, Travel, etc.
        const fixedCats = ['Rent', 'EMI', 'Insurance', 'Bills', 'Utilities', 'Education'];
        let fixedSum = 0;
        let variableSum = 0;

        transactions.filter(t => t.type === 'expense' && isCurrentMonth(t.date)).forEach(t => {
            const amount = Math.abs(t.amount);
            if (fixedCats.includes(t.category)) fixedSum += amount;
            else variableSum += amount;
        });

        const fixedVariableData = [
            { id: 'Fixed', label: 'Fixed', value: toDisplay(fixedSum), color: '#3b82f6' },
            { id: 'Variable', label: 'Variable', value: toDisplay(variableSum), color: '#f59e0b' }
        ];

        // 7. Savings Rate
        const currentIncome = transactions.filter(t => t.type === 'income' && isCurrentMonth(t.date)).reduce((sum, t) => sum + t.amount, 0);
        const currentExpense = transactions.filter(t => t.type === 'expense' && isCurrentMonth(t.date)).reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;

        return {
            monthlyData,
            categoryData,
            velocityData,
            netWorthData,
            budgetHealthData,
            fixedVariableData,
            savingsRate
        };
    }, [transactions, budgets, currency]);

    // Extract derived data for rendering
    const {
        monthlyData = [],
        categoryData = [],
        velocityData = [],
        netWorthData = [],
        budgetHealthData = [],
        fixedVariableData = [],
        savingsRate = 0
    } = processedData || {};



    if (loading) return <div className="p-8 text-center">Loading Gallery...</div>;
    if (error) return (
        <div className="p-8 text-center flex flex-col items-center justify-center h-full text-red-500">
            <AlertCircle size={48} className="mb-4" />
            <p>{error}</p>
        </div>
    );

    const commonTheme = {
        textColor: textColor,
        tooltip: {
            container: {
                background: isDark ? '#333' : '#fff',
                color: textColor,
                fontSize: '12px',
                borderRadius: '4px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
        },
        grid: { line: { stroke: isDark ? '#444' : '#e0e0e0', strokeWidth: 1 } },
        axis: {
            ticks: { text: { fill: textColor, fontSize: 11 } },
            legend: { text: { fill: textColor, fontSize: 12, fontWeight: 600 } }
        },
        labels: { text: { fill: textColor, fontSize: 11, fontWeight: 600 } }
    };

    const ChartCard = ({ title, icon: Icon, children, height = '400px', colSpan = 1 }) => (
        <motion.div
            className={`p-5 rounded-2xl shadow-sm border transition-shadow duration-300 hover:shadow-md ${colSpan === 2 ? 'col-span-1 lg:col-span-2' : ''}`}
            style={{ backgroundColor: cardBg, borderColor, height, willChange: 'transform, opacity' }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: textColor }}>
                {Icon && <Icon size={20} className="text-blue-500" />} {title}
            </h2>
            <div className="h-[calc(100%-2rem)] w-full">
                {children}
            </div>
        </motion.div>
    );

    return (
        <div className="h-full overflow-auto p-6" style={{ backgroundColor: bgColor, color: textColor }}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Financial Intelligence</h1>
                    <p className="opacity-60 text-sm mt-1">Deep dive into your financial health</p>
                </div>
                <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                    <Wallet size={24} className="text-blue-600 dark:text-blue-400" />
                    <div>
                        <p className="text-xs opacity-60 font-semibold uppercase">Savings Rate</p>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{savingsRate}%</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">

                {/* 1. Monthly Comparison */}
                <ChartCard title="Income vs Expense Trend" icon={TrendingUp} colSpan={2}>
                    <ResponsiveBar
                        data={monthlyData}
                        keys={['Income', 'Expense']}
                        indexBy="month"
                        margin={{ top: 10, right: 130, bottom: 50, left: 60 }}
                        padding={0.3}
                        groupMode="grouped"
                        valueScale={{ type: 'linear' }}
                        colors={['#10b981', '#ef4444']}
                        borderRadius={6}
                        animate={animationsEnabled}
                        axisBottom={{ tickSize: 0, tickPadding: 15 }}
                        axisLeft={{
                            tickSize: 0,
                            tickPadding: 10,
                            format: value => CurrencyConverter.format(value, currency, true)
                        }}
                        enableGridY={true}
                        enableLabel={false}
                        legends={[
                            {
                                dataFrom: 'keys',
                                anchor: 'bottom-right',
                                direction: 'column',
                                justify: false,
                                translateX: 120,
                                translateY: 0,
                                itemsSpacing: 10,
                                itemWidth: 100,
                                itemHeight: 20,
                                itemDirection: 'left-to-right',
                                itemOpacity: 0.85,
                                symbolSize: 12,
                                symbolShape: 'circle'
                            }
                        ]}
                        theme={commonTheme}
                        tooltip={({ id, value, color }) => (
                            <div style={{ padding: 12, color, background: isDark ? '#222' : '#fff', border: `1px solid ${borderColor}`, borderRadius: 8 }}>
                                <strong>{id}</strong>: {CurrencyConverter.format(value, currency)}
                            </div>
                        )}
                    />
                </ChartCard>

                {/* 2. Expense Breakdown */}
                <ChartCard title="Where Your Money Went" icon={PieChart}>
                    {categoryData.length > 0 ? (
                        <ResponsivePie
                            data={categoryData}
                            margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
                            innerRadius={0.6}
                            padAngle={0.7}
                            cornerRadius={5}
                            activeOuterRadiusOffset={8}
                            colors={{ scheme: 'nivo' }}
                            borderWidth={1}
                            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                            animate={animationsEnabled}
                            enableArcLinkLabels={true}
                            arcLinkLabelsSkipAngle={10}
                            arcLinkLabelsTextColor={textColor}
                            arcLinkLabelsThickness={2}
                            arcLinkLabelsColor={{ from: 'color' }}
                            enableArcLabels={false}
                            theme={commonTheme}
                            valueFormat={value => CurrencyConverter.format(value, currency)}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center opacity-50">No expenses this month</div>
                    )}
                </ChartCard>

                {/* 3. Spending Velocity */}
                <ChartCard title="Spending Velocity" icon={Activity}>
                    <ResponsiveLine
                        data={velocityData}
                        margin={{ top: 20, right: 110, bottom: 50, left: 60 }}
                        xScale={{ type: 'linear', min: 1, max: 31 }}
                        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                        curve="monotoneX"
                        axisBottom={{ tickSize: 0, tickPadding: 15, legend: 'Day of Month', legendOffset: 36, legendPosition: 'middle' }}
                        axisLeft={{ tickSize: 0, tickPadding: 10, format: value => CurrencyConverter.format(value, currency, true) }}
                        enableGridX={false}
                        enableGridY={true}
                        pointSize={0}
                        pointBorderWidth={2}
                        pointBorderColor={{ from: 'serieColor' }}
                        enableArea={true}
                        areaOpacity={0.1}
                        useMesh={true}
                        animate={animationsEnabled}
                        legends={[
                            {
                                anchor: 'bottom-right',
                                direction: 'column',
                                justify: false,
                                translateX: 100,
                                translateY: 0,
                                itemsSpacing: 0,
                                itemDirection: 'left-to-right',
                                itemWidth: 80,
                                itemHeight: 20,
                                itemOpacity: 0.75,
                                symbolSize: 12,
                                symbolShape: 'circle'
                            }
                        ]}
                        theme={commonTheme}
                        yFormat={value => CurrencyConverter.format(value, currency)}
                    />
                </ChartCard>

                {/* 4. Net Worth Trend */}
                <ChartCard title="Lifetime Net Worth" icon={TrendingUp} colSpan={2}>
                    <ResponsiveLine
                        data={netWorthData}
                        margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
                        xScale={{ type: 'point' }}
                        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                        curve="catmullRom"
                        axisBottom={{ tickSize: 0, tickPadding: 15 }}
                        axisLeft={{ tickSize: 0, tickPadding: 10, format: value => CurrencyConverter.format(value, currency, true) }}
                        enableGridX={false}
                        enableGridY={true}
                        pointSize={8}
                        pointColor={{ theme: 'background' }}
                        pointBorderWidth={2}
                        pointBorderColor={{ from: 'serieColor' }}
                        enableArea={true}
                        areaOpacity={0.15}
                        areaBaselineValue="auto"
                        useMesh={true}
                        animate={animationsEnabled}
                        colors={['#8b5cf6']}
                        theme={commonTheme}
                        yFormat={value => CurrencyConverter.format(value, currency)}
                    />
                </ChartCard>

                {/* 5. Budget Health */}
                <ChartCard title="Budget Health (Top Categories)" icon={Target}>
                    {budgetHealthData.length > 0 ? (
                        <ResponsiveBar
                            data={budgetHealthData}
                            keys={['Spent', 'Limit']}
                            indexBy="category"
                            margin={{ top: 10, right: 130, bottom: 50, left: 60 }}
                            padding={0.4}
                            groupMode="grouped"
                            layout="horizontal"
                            valueScale={{ type: 'linear' }}
                            colors={['#f43f5e', '#e5e7eb']}
                            borderRadius={4}
                            animate={animationsEnabled}
                            axisBottom={{ tickSize: 0, tickPadding: 15, format: value => CurrencyConverter.format(value, currency, true) }}
                            axisLeft={{ tickSize: 0, tickPadding: 10 }}
                            enableGridX={true}
                            enableGridY={false}
                            legends={[
                                {
                                    dataFrom: 'keys',
                                    anchor: 'bottom-right',
                                    direction: 'column',
                                    justify: false,
                                    translateX: 120,
                                    translateY: 0,
                                    itemsSpacing: 2,
                                    itemWidth: 100,
                                    itemHeight: 20,
                                    itemDirection: 'left-to-right',
                                    itemOpacity: 0.85,
                                    symbolSize: 12,
                                    symbolShape: 'circle'
                                }
                            ]}
                            theme={commonTheme}
                            tooltip={({ id, value, color }) => (
                                <div style={{ padding: 12, color, background: isDark ? '#222' : '#fff', border: `1px solid ${borderColor}`, borderRadius: 8 }}>
                                    <strong>{id}</strong>: {CurrencyConverter.format(value, currency)}
                                </div>
                            )}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center opacity-50 text-center">
                            <Target size={48} className="mb-2 opacity-20" />
                            <p>No budgets set.</p>
                            <p className="text-xs">Go to Budget tab to set limits.</p>
                        </div>
                    )}
                </ChartCard>

                {/* 6. Fixed vs Variable */}
                <ChartCard title="Needs vs Wants" icon={Activity}>
                    <ResponsivePie
                        data={fixedVariableData}
                        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                        innerRadius={0.5}
                        padAngle={2}
                        cornerRadius={5}
                        activeOuterRadiusOffset={8}
                        colors={{ datum: 'data.color' }}
                        borderWidth={1}
                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                        animate={animationsEnabled}
                        enableArcLinkLabels={true}
                        arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor={textColor}
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: 'color' }}
                        enableArcLabels={true}
                        arcLabelsSkipAngle={10}
                        arcLabelsTextColor="#fff"
                        theme={commonTheme}
                        valueFormat={value => CurrencyConverter.format(value, currency)}
                    />
                </ChartCard>

            </div>
        </div>
    );
};

export default DataGallery;
