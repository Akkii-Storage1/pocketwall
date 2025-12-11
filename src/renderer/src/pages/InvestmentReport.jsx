import React, { useState, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import stockApi from '../utils/stockApi';
import PieChart from '../components/PieChart';
import LineChart from '../components/LineChart';
import pdfExport from '../utils/pdfExport';

const InvestmentReport = ({ isDark }) => {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [investments, setInvestments] = useState([]);
    const [performanceData, setPerformanceData] = useState(null);
    const [allocationData, setAllocationData] = useState([]);
    const [timeRange, setTimeRange] = useState('ALL'); // 1M, 3M, 6M, 1Y, ALL

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const headerBg = isDark ? '#3e3e42' : '#e0e0e0';

    useEffect(() => {
        loadInvestments();
    }, []);

    useEffect(() => {
        if (investments.length > 0) {
            calculatePerformance();
        }
    }, [investments, timeRange]);

    const loadInvestments = async () => {
        setLoading(true);
        try {
            const invs = await DataAdapter.getInvestments() || [];

            // Fetch current prices for all investments
            const updatedInvs = await Promise.all(
                invs.map(async (inv) => {
                    try {
                        const priceData = await stockApi.fetchStockPrice(inv.symbol, inv.exchange);
                        return {
                            ...inv,
                            currentPrice: priceData?.currentPrice || inv.buyPrice || 0,
                            currentValue: (priceData?.currentPrice || inv.buyPrice || 0) * inv.quantity
                        };
                    } catch (error) {
                        return {
                            ...inv,
                            currentPrice: inv.buyPrice || 0,
                            currentValue: (inv.buyPrice || 0) * inv.quantity
                        };
                    }
                })
            );

            setInvestments(updatedInvs);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load investments');
        } finally {
            setLoading(false);
        }
    };

    const calculatePerformance = () => {
        if (investments.length === 0) {
            setPerformanceData(null);
            return;
        }

        // Calculate total invested and current value
        let totalInvested = 0;
        let totalCurrentValue = 0;

        const stockPerformance = investments.map(inv => {
            const invested = (inv.buyPrice || inv.pricePerShare || 0) * inv.quantity;
            const current = inv.currentValue || 0;
            const gain = current - invested;
            const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

            totalInvested += invested;
            totalCurrentValue += current;

            // Calculate CAGR
            const buyDate = new Date(inv.buyDate || inv.date);
            const currentDate = new Date();
            const years = (currentDate - buyDate) / (365.25 * 24 * 60 * 60 * 1000);
            const cagr = years > 0 ? (Math.pow(current / invested, 1 / years) - 1) * 100 : gainPercent;

            return {
                ...inv,
                invested,
                current,
                gain,
                gainPercent,
                cagr,
                years
            };
        });

        // Sort by performance
        const sorted = [...stockPerformance].sort((a, b) => b.gainPercent - a.gainPercent);
        const bestPerformer = sorted[0];
        const worstPerformer = sorted[sorted.length - 1];

        // Calculate portfolio CAGR
        const totalGain = totalCurrentValue - totalInvested;
        const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

        // Weighted average holding period
        const avgYears = investments.reduce((sum, inv) => {
            const buyDate = new Date(inv.buyDate || inv.date);
            const years = (new Date() - buyDate) / (365.25 * 24 * 60 * 60 * 1000);
            return sum + years;
        }, 0) / investments.length;

        const portfolioCAGR = avgYears > 0 ? (Math.pow(totalCurrentValue / totalInvested, 1 / avgYears) - 1) * 100 : totalGainPercent;

        // Allocation by stock
        const allocation = stockPerformance.map(sp => ({
            label: sp.symbol,
            value: sp.current,
            color: sp.gainPercent >= 0 ? '#00ff00' : '#ff0000'
        })).sort((a, b) => b.value - a.value);

        setAllocationData(allocation);
        setPerformanceData({
            totalInvested,
            totalCurrentValue,
            totalGain,
            totalGainPercent,
            portfolioCAGR,
            bestPerformer,
            worstPerformer,
            stockPerformance
        });
    };

    const formatCurrency = (amount, exchange = 'NSE') => {
        const symbol = exchange === 'US' ? '$' : '₹';
        return `${symbol}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const exportToPDF = async () => {
        try {
            await pdfExport.generateInvestmentReport({
                performanceData,
                allocationData,
                formatCurrency
            });
            toast.success('Investment report exported successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export investment report');
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                <div className="text-center" style={{ color: textColor }}>
                    <div className="text-4xl mb-4">📈</div>
                    <div>Loading investment data...</div>
                </div>
            </div>
        );
    }

    // Early return removed to show header
    const isEmpty = !performanceData;

    return (
        <div className="h-full overflow-y-auto p-4" style={{ backgroundColor: bgColor }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>📈 Investment Performance Report</h2>
                <button
                    onClick={exportToPDF}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    📄 Export PDF
                </button>
            </div>

            {/* Summary Cards */}
            {!isEmpty ? (
                <>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Total Invested</div>
                            <div className="text-2xl font-bold" style={{ color: textColor }}>
                                {formatCurrency(performanceData.totalInvested)}
                            </div>
                        </div>
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Current Value</div>
                            <div className="text-2xl font-bold text-blue-500">
                                {formatCurrency(performanceData.totalCurrentValue)}
                            </div>
                        </div>
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Absolute Returns</div>
                            <div className={`text-2xl font-bold ${performanceData.totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {performanceData.totalGain >= 0 ? '+' : ''}{formatCurrency(performanceData.totalGain)}
                            </div>
                            <div className={`text-sm ${performanceData.totalGainPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ({performanceData.totalGainPercent.toFixed(2)}%)
                            </div>
                        </div>
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Portfolio CAGR</div>
                            <div className={`text-2xl font-bold ${performanceData.portfolioCAGR >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {performanceData.portfolioCAGR.toFixed(2)}%
                            </div>
                            <div className="text-xs opacity-60" style={{ color: textColor }}>Compound Annual Growth Rate</div>
                        </div>
                    </div>

                    {/* Best/Worst Performers */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="text-sm font-semibold mb-2 text-green-500">🏆 Best Performer</h3>
                            {performanceData.bestPerformer && (
                                <>
                                    <div className="text-xl font-bold" style={{ color: textColor }}>
                                        {performanceData.bestPerformer.symbol}
                                    </div>
                                    <div className="text-2xl font-bold text-green-500">
                                        +{performanceData.bestPerformer.gainPercent.toFixed(2)}%
                                    </div>
                                    <div className="text-sm opacity-60" style={{ color: textColor }}>
                                        CAGR: {performanceData.bestPerformer.cagr.toFixed(2)}%
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="text-sm font-semibold mb-2 text-red-500">📉 Worst Performer</h3>
                            {performanceData.worstPerformer && (
                                <>
                                    <div className="text-xl font-bold" style={{ color: textColor }}>
                                        {performanceData.worstPerformer.symbol}
                                    </div>
                                    <div className={`text-2xl font-bold ${performanceData.worstPerformer.gainPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {performanceData.worstPerformer.gainPercent >= 0 ? '+' : ''}{performanceData.worstPerformer.gainPercent.toFixed(2)}%
                                    </div>
                                    <div className="text-sm opacity-60" style={{ color: textColor }}>
                                        CAGR: {performanceData.worstPerformer.cagr.toFixed(2)}%
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Allocation Chart */}
                    <div className="mb-6 p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: textColor }}>Portfolio Allocation</h3>
                        <div className="h-64">
                            <PieChart data={allocationData} isDark={isDark} />
                        </div>
                    </div>

                    {/* Stock-wise Performance Table */}
                    <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: textColor }}>Stock-wise Performance</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: headerBg }}>
                                    <th className="border p-2 text-left" style={{ borderColor, color: textColor }}>Stock</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>Invested</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>Current</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>Gain/Loss</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>% Return</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>CAGR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performanceData.stockPerformance.map((sp, idx) => (
                                    <tr key={idx}>
                                        <td className="border p-2 font-semibold" style={{ borderColor, color: textColor }}>
                                            {sp.symbol}
                                            <div className="text-xs opacity-60">{sp.quantity} shares</div>
                                        </td>
                                        <td className="border p-2 text-right" style={{ borderColor, color: textColor }}>
                                            {formatCurrency(sp.invested, sp.exchange)}
                                        </td>
                                        <td className="border p-2 text-right" style={{ borderColor, color: textColor }}>
                                            {formatCurrency(sp.current, sp.exchange)}
                                        </td>
                                        <td className={`border p-2 text-right font-semibold ${sp.gain >= 0 ? 'text-green-500' : 'text-red-500'}`} style={{ borderColor }}>
                                            {sp.gain >= 0 ? '+' : ''}{formatCurrency(sp.gain, sp.exchange)}
                                        </td>
                                        <td className={`border p-2 text-right font-semibold ${sp.gainPercent >= 0 ? 'text-green-500' : 'text-red-500'}`} style={{ borderColor }}>
                                            {sp.gainPercent >= 0 ? '+' : ''}{sp.gainPercent.toFixed(2)}%
                                        </td>
                                        <td className={`border p-2 text-right ${sp.cagr >= 0 ? 'text-green-500' : 'text-red-500'}`} style={{ borderColor }}>
                                            {sp.cagr.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                    <div className="text-4xl mb-4">📈</div>
                    <div className="text-lg">No investment data available</div>
                    <div className="text-sm">Add investments to see performance analytics</div>
                </div>
            )}
        </div>
    );
};

export default InvestmentReport;
