import React, { useState, useEffect, useMemo } from 'react';
import { formatDate } from '../utils/DateFormatter';
import DateRangePicker from '../components/DateRangePicker';
import PayeeChart from '../components/PayeeChart';
import TrendChart from '../components/TrendChart';
import { useToast } from '../components/Toast';
import DataAdapter from '../utils/dataAdapter';
import ExportManager from '../utils/ExportManager';
import TaxReport from '../components/TaxReport';
import InvestmentReport from '../components/InvestmentReport';
import ErrorBoundary from '../components/ErrorBoundary';

const Reports = ({ isDark, setActiveTab, view, currency }) => {
    const [transactions, setTransactions] = useState([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(true);
    const [userSettings, setUserSettings] = useState({ defaultCurrency: 'INR' });
    const { success, error, info } = useToast();

    const textColor = isDark ? '#e0e0e0' : '#333333';
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [txs, settings] = await Promise.all([
                DataAdapter.getTransactions(),
                DataAdapter.getUserSettings()
            ]);
            setTransactions(txs);
            if (settings) setUserSettings(settings);
        } catch (error) {
            console.error('Error loading reports data:', error);
            error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const filteredTransactions = useMemo(() => {
        if (!dateRange.start || !dateRange.end) return transactions;

        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);

        return transactions.filter(t => {
            const date = new Date(t.date);
            return date >= start && date <= end;
        });
    }, [transactions, dateRange]);

    const totalSpent = useMemo(() => {
        return filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    }, [filteredTransactions]);

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency || userSettings.defaultCurrency
        }).format(amount);
    };

    const handleDownload = () => {
        try {
            const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
            const expenses = totalSpent;
            const savings = income - expenses;
            const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

            const stats = {
                income: formatMoney(income),
                expenses: formatMoney(expenses),
                savings: formatMoney(savings),
                count: filteredTransactions.length,
                savingsRate: savingsRate
            };
            ExportManager.generateSummaryReport(stats, dateRange);
            success('Report downloaded');
        } catch (error) {
            console.error(error);
            error('Failed to download report: ' + error.message);
        }
    };

    const [reminderEnabled, setReminderEnabled] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('monthlyReportReminder');
        if (stored) setReminderEnabled(JSON.parse(stored));
    }, []);

    const toggleReminder = () => {
        const newState = !reminderEnabled;
        setReminderEnabled(newState);
        localStorage.setItem('monthlyReportReminder', JSON.stringify(newState));
        if (newState) {
            success('Monthly reminders enabled');
            if (Notification.permission !== 'granted') {
                Notification.requestPermission();
            }
        } else {
            info('Monthly reminders disabled');
        }
    };

    if (loading) {
        return <div className="p-8 text-center" style={{ color: textColor }}>Loading reports...</div>;
    }

    if (view === 'taxreport') {
        return <TaxReport isDark={isDark} onBack={() => setActiveTab('reports')} />;
    }

    if (view === 'investmentreport') {
        return <InvestmentReport isDark={isDark} onBack={() => setActiveTab('reports')} />;
    }

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold" style={{ color: textColor }}>Advanced Reports</h1>
                <div className="flex gap-2">
                    <button
                        onClick={toggleReminder}
                        className={`px-3 py-2 rounded border flex items-center gap-2 text-sm ${reminderEnabled ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500' : 'hover:bg-opacity-10'}`}
                        style={{ borderColor: reminderEnabled ? '#eab308' : (isDark ? '#555' : '#ccc'), color: textColor }}
                        title="Get notified on the 1st of every month"
                    >
                        <span>{reminderEnabled ? '🔔' : '🔕'}</span>
                        {reminderEnabled ? 'Reminders On' : 'Enable Reminders'}
                    </button>
                    <button
                        onClick={() => setActiveTab('taxreport')}
                        className="px-4 py-2 rounded border hover:bg-opacity-10"
                        style={{ borderColor: isDark ? '#555' : '#ccc', color: textColor }}
                    >
                        📋 Tax Report
                    </button>
                    <button
                        onClick={() => setActiveTab('investmentreport')}
                        className="px-4 py-2 rounded border hover:bg-opacity-10"
                        style={{ borderColor: isDark ? '#555' : '#ccc', color: textColor }}
                    >
                        📈 Investment Report
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
                    >
                        Download PDF
                    </button>
                    <DateRangePicker onChange={setDateRange} isDark={isDark} />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                    <h3 className="text-sm font-medium opacity-70 mb-1" style={{ color: textColor }}>Total Spent</h3>
                    <p className="text-2xl font-bold text-red-500">{formatMoney(totalSpent)}</p>
                    <p className="text-xs opacity-50 mt-1" style={{ color: textColor }}>
                        {formatDate(dateRange.start, currency)} to {formatDate(dateRange.end, currency)}
                    </p>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                    <h3 className="text-sm font-medium opacity-70 mb-1" style={{ color: textColor }}>Transaction Count</h3>
                    <p className="text-2xl font-bold" style={{ color: textColor }}>{filteredTransactions.length}</p>
                    <p className="text-xs opacity-50 mt-1" style={{ color: textColor }}>In selected period</p>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                    <h3 className="text-sm font-medium opacity-70 mb-1" style={{ color: textColor }}>Avg. Transaction</h3>
                    <p className="text-2xl font-bold" style={{ color: textColor }}>
                        {filteredTransactions.length > 0 ? formatMoney(totalSpent / filteredTransactions.length) : formatMoney(0)}
                    </p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="h-[400px]">
                    <ErrorBoundary fallback={<div className="h-full flex items-center justify-center border rounded opacity-50">Unable to load Trend Chart</div>}>
                        <TrendChart
                            transactions={filteredTransactions}
                            isDark={isDark}
                            currency={currency || userSettings.defaultCurrency}
                            dateRange={dateRange}
                        />
                    </ErrorBoundary>
                </div>
                <div className="h-[400px]">
                    <ErrorBoundary fallback={<div className="h-full flex items-center justify-center border rounded opacity-50">Unable to load Payee Chart</div>}>
                        <PayeeChart
                            transactions={filteredTransactions}
                            isDark={isDark}
                            currency={currency || userSettings.defaultCurrency}
                        />
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );
};

export default Reports;
