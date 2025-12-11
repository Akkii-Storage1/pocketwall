import React, { useState, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import { generateInsights } from '../utils/insights';
import FinancialHealthScore from '../components/FinancialHealthScore';
import BillCard from '../components/BillCard';
import CurrencyConverter from '../utils/CurrencyConverter';

const Insights = ({ isDark }) => {
    const [insights, setInsights] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [currency, setCurrency] = useState('INR');

    const textColor = isDark ? '#ffffff' : '#000000';
    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        setLoading(true);
        try {
            const settings = await DataAdapter.getUserSettings();
            setCurrency(settings.defaultCurrency || 'INR');

            const transactions = await DataAdapter.getTransactions();
            const budgetLimits = JSON.parse(localStorage.getItem('budgetLimits') || '{}');
            const budgets = Object.entries(budgetLimits).map(([category, limit]) => ({ category, limit }));
            const investments = await DataAdapter.getInvestments();
            const recurringRules = await DataAdapter.getRecurringRules();

            const result = generateInsights(transactions, budgets, investments, recurringRules);
            setInsights(result);
        } catch (error) {
            console.error('Error loading insights:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount) => {
        return CurrencyConverter.format(CurrencyConverter.convert(amount, 'INR', currency), currency);
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                <div className="text-center">
                    <div className="text-4xl mb-4">🤖</div>
                    <div style={{ color: textColor }}>Analyzing your data...</div>
                </div>
            </div>
        );
    }

    if (!insights || !insights.hasData) {
        return (
            <div className="h-full flex items-center justify-center flex-col gap-4" style={{ backgroundColor: bgColor }}>
                <div className="text-6xl">🤖</div>
                <div style={{ color: textColor }} className="text-xl font-semibold">
                    {insights?.message || 'No insights available'}
                </div>
                <div style={{ color: textColor, opacity: 0.6 }}>
                    Add more transactions to unlock insights
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4" style={{ backgroundColor: bgColor }}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>🤖 Financial Insights</h2>
                <button onClick={loadInsights} className="px-4 py-2 text-sm border rounded" style={{ backgroundColor: '#0078d4', color: '#fff', borderColor: '#005a9e' }}>🔄 Refresh</button>
            </div>

            <div className="mb-6">
                <FinancialHealthScore score={insights.healthScore.score} rating={insights.healthScore.rating} color={insights.healthScore.color} breakdown={insights.healthScore.breakdown} isDark={isDark} />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                {insights.patterns && (
                    <div className="border rounded-lg p-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="text-sm opacity-60 mb-2" style={{ color: textColor }}>Spending Pattern</div>
                        <div className="text-lg font-semibold mb-2" style={{ color: textColor }}>
                            {insights.patterns.difference > 0 ? 'Weekend Spender' : 'Weekday Spender'}
                        </div>
                        <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>{insights.patterns.insight}</div>
                    </div>
                )}

                <div className="border rounded-lg p-4" style={{ backgroundColor: panelBg, borderColor }}>
                    <div className="text-sm opacity-60 mb-2" style={{ color: textColor }}>Unusual Activity</div>
                    <div className="text-3xl font-bold mb-2" style={{ color: insights.unusual.length > 0 ? '#ef4444' : '#10b981' }}>
                        {insights.unusual.length}
                    </div>
                    <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                        {insights.unusual.length > 0 ? `${insights.unusual.length} unusual detected` : 'All good ✅'}
                    </div>
                </div>

                {insights.prediction && insights.prediction.prediction > 0 && (
                    <div className="border rounded-lg p-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="text-sm opacity-60 mb-2" style={{ color: textColor }}>Next Month</div>
                        <div className="text-2xl font-bold mb-2" style={{ color: textColor }}>{formatMoney(insights.prediction.prediction)}</div>
                        <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                            {insights.prediction.trend > 0 ? '↑' : '↓'} {Math.abs(Math.round(insights.prediction.trend))}%
                        </div>
                    </div>
                )}
            </div>

            <div className="border-b mb-4" style={{ borderColor }}>
                <div className="flex gap-4">
                    {['overview', 'recommendations', 'bills'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className="px-4 py-2 text-sm font-medium capitalize"
                            style={{ color: activeTab === tab ? '#0078d4' : textColor, borderBottom: activeTab === tab ? '2px solid #0078d4' : 'none', opacity: activeTab === tab ? 1 : 0.7 }}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                {activeTab === 'overview' && insights.prediction && (
                    <div className="border rounded-lg p-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h4 className="font-semibold mb-2" style={{ color: textColor }}>Expense Prediction</h4>
                        <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                            Based on {insights.prediction.monthsAnalyzed} months, predicted: <strong>{formatMoney(insights.prediction.prediction)}</strong>
                        </p>
                    </div>
                )}

                {activeTab === 'recommendations' && (
                    <div className="space-y-3">
                        {insights.recommendations && insights.recommendations.length > 0 ? (
                            insights.recommendations.map((rec, idx) => (
                                <div key={idx} className="border rounded-lg p-4" style={{ backgroundColor: panelBg, borderColor, borderLeft: `4px solid ${rec.priority === 'high' ? '#ef4444' : '#eab308'}` }}>
                                    <h4 className="font-semibold mb-2" style={{ color: textColor }}>
                                        {rec.type === 'reduce' ? '💡' : '💰'} {rec.title}
                                    </h4>
                                    <p className="text-sm" style={{ color: textColor, opacity: 0.8 }}>{rec.message}</p>
                                    {rec.savings && <div className="text-sm font-semibold mt-2" style={{ color: '#10b981' }}>Save: {formatMoney(rec.savings)}/mo</div>}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8" style={{ color: textColor, opacity: 0.6 }}>No recommendations 🎉</div>
                        )}
                    </div>
                )}

                {activeTab === 'bills' && (
                    <div className="space-y-3">
                        {insights.bills && insights.bills.length > 0 ? (
                            insights.bills.map((bill, idx) => (
                                <BillCard key={idx} bill={bill} isDark={isDark} currency={currency} />
                            ))
                        ) : (
                            <div className="text-center py-8" style={{ color: textColor, opacity: 0.6 }}>
                                <div className="text-4xl mb-2">📅</div>
                                <div>No recurring bills detected yet</div>
                                <div className="text-sm mt-1">Add more regular transactions to see predictions</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Insights;
