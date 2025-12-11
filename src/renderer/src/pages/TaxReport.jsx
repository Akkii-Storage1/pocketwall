import React, { useState, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import taxCalculator, { REGIONS, TAX_CONFIG } from '../utils/taxCalculator';
import pdfExport from '../utils/pdfExport';

const TaxReport = ({ isDark }) => {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [region, setRegion] = useState(REGIONS.US);
    const [selectedFY, setSelectedFY] = useState(null);
    const [fyOptions, setFyOptions] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [investments, setInvestments] = useState([]);
    const [taxSummary, setTaxSummary] = useState(null);

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const headerBg = isDark ? '#3e3e42' : '#e0e0e0';

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (region) {
            const options = taxCalculator.getFinancialYearOptions(region, 5);
            setFyOptions(options);
            setSelectedFY(options[0]); // Select current FY
        }
    }, [region]);

    useEffect(() => {
        if (selectedFY && transactions.length > 0) {
            calculateTaxSummary();
        }
    }, [selectedFY, transactions, region]);

    const loadData = async () => {
        setLoading(true);
        try {
            const txs = await DataAdapter.getTransactions() || [];
            const invs = await DataAdapter.getInvestments() || [];

            setTransactions(txs);
            setInvestments(invs);

            // Auto-detect region
            const detectedRegion = taxCalculator.autoDetectRegion(txs);
            setRegion(detectedRegion);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const calculateTaxSummary = () => {
        // Filter transactions for selected FY
        const fyTxs = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= selectedFY.startDate && txDate <= selectedFY.endDate;
        });

        // Categorize transactions
        const { income, deductible, nonDeductible } = taxCalculator.categorizeTaxTransactions(
            fyTxs,
            region,
            TAX_CONFIG[region].currency
        );

        // Calculate totals
        const totalIncome = income.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
        const totalDeductible = deductible.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
        const totalNonDeductible = nonDeductible.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);
        const totalExpenses = totalDeductible + totalNonDeductible;
        const taxableIncome = totalIncome - totalDeductible;

        // Calculate capital gains from investments
        const capitalGains = investments
            .filter(inv => inv.sellDate && new Date(inv.sellDate) >= selectedFY.startDate && new Date(inv.sellDate) <= selectedFY.endDate)
            .map(inv => {
                const cg = taxCalculator.calculateCapitalGains({
                    buyDate: inv.buyDate || inv.date,
                    sellDate: inv.sellDate,
                    buyPrice: inv.buyPrice || inv.pricePerShare,
                    sellPrice: inv.sellPrice,
                    quantity: inv.quantity
                }, region);
                return { ...inv, ...cg };
            });

        const totalCapitalGains = capitalGains.reduce((sum, cg) => sum + cg.gain, 0);

        setTaxSummary({
            totalIncome,
            totalDeductible,
            totalNonDeductible,
            totalExpenses,
            taxableIncome,
            capitalGains,
            totalCapitalGains,
            incomeByCategory: groupByCategory(income),
            deductibleByCategory: groupByCategory(deductible),
            nonDeductibleByCategory: groupByCategory(nonDeductible)
        });
    };

    const groupByCategory = (txs) => {
        return txs.reduce((acc, tx) => {
            const cat = tx.category || 'Uncategorized';
            if (!acc[cat]) acc[cat] = { count: 0, total: 0, transactions: [] };
            acc[cat].count++;
            acc[cat].total += Math.abs(parseFloat(tx.amount));
            acc[cat].transactions.push(tx);
            return acc;
        }, {});
    };

    const formatCurrency = (amount) => {
        const config = TAX_CONFIG[region];
        return `${config.symbol}${Math.abs(amount).toFixed(2)}`;
    };

    const exportToPDF = async () => {
        try {
            await pdfExport.generateTaxReport({
                region,
                fy: selectedFY,
                summary: taxSummary,
                formatCurrency
            });
            toast.success('Tax report exported successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to export tax report');
        }
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                <div className="text-center" style={{ color: textColor }}>
                    <div className="text-4xl mb-4">📊</div>
                    <div>Loading tax data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4" style={{ backgroundColor: bgColor }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>📊 Tax Report</h2>
                <div className="flex gap-2">
                    <select
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="px-3 py-2 border rounded"
                        style={{ backgroundColor: panelBg, color: textColor, borderColor }}
                    >
                        <option value={REGIONS.US}>🇺🇸 United States</option>
                        <option value={REGIONS.INDIA}>🇮🇳 India</option>
                    </select>
                    <select
                        value={selectedFY ? selectedFY.year : ''}
                        onChange={(e) => {
                            const fy = fyOptions.find(f => f.year === e.target.value);
                            setSelectedFY(fy);
                        }}
                        className="px-3 py-2 border rounded"
                        style={{ backgroundColor: panelBg, color: textColor, borderColor }}
                    >
                        {fyOptions.map(fy => (
                            <option key={fy.year} value={fy.year}>{fy.year}</option>
                        ))}
                    </select>
                    <button
                        onClick={exportToPDF}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        📄 Export PDF
                    </button>
                </div>
            </div>

            {/* Tax Summary Cards */}
            {/* Tax Summary Cards */}
            {taxSummary ? (
                <>
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Total Income</div>
                            <div className="text-2xl font-bold text-green-500">{formatCurrency(taxSummary.totalIncome)}</div>
                        </div>
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Tax Deductible Expenses</div>
                            <div className="text-2xl font-bold text-orange-500">{formatCurrency(taxSummary.totalDeductible)}</div>
                        </div>
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Non-Deductible Expenses</div>
                            <div className="text-2xl font-bold text-red-500">{formatCurrency(taxSummary.totalNonDeductible)}</div>
                        </div>
                        <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Estimated Taxable Income</div>
                            <div className="text-2xl font-bold" style={{ color: textColor }}>{formatCurrency(taxSummary.taxableIncome)}</div>
                        </div>
                    </div>

                    {/* US Standard Deduction Comparison */}
                    {region === REGIONS.US && (
                        <div className="mb-6 p-4 rounded border" style={{ backgroundColor: isDark ? '#1e3a8a20' : '#eff6ff', borderColor: isDark ? '#1e40af' : '#bfdbfe' }}>
                            <h3 className="text-lg font-semibold mb-2" style={{ color: isDark ? '#93c5fd' : '#1e40af' }}>💡 Tax Tip: Standard vs Itemized</h3>
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="text-sm mb-1" style={{ color: textColor }}>
                                        Your Itemized Deductions: <strong>{formatCurrency(taxSummary.totalDeductible)}</strong>
                                    </div>
                                    <div className="text-sm" style={{ color: textColor }}>
                                        Standard Deduction (Single): <strong>{formatCurrency(TAX_CONFIG.US.standardDeduction.single)}</strong>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {taxSummary.totalDeductible > TAX_CONFIG.US.standardDeduction.single ? (
                                        <span className="text-green-500 font-bold">Itemizing saves you more!</span>
                                    ) : (
                                        <span className="text-blue-500 font-bold">Standard deduction is better.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Capital Gains Section */}
                    {taxSummary.capitalGains.length > 0 && (
                        <div className="mb-6 p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="text-lg font-semibold mb-3" style={{ color: textColor }}>💰 Capital Gains</h3>
                            <div className="mb-4">
                                <span className="text-sm opacity-60" style={{ color: textColor }}>Total Capital Gains: </span>
                                <span className={`text-xl font-bold ${taxSummary.totalCapitalGains >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatCurrency(taxSummary.totalCapitalGains)}
                                </span>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ backgroundColor: headerBg }}>
                                        <th className="border p-2 text-left" style={{ borderColor, color: textColor }}>Stock</th>
                                        <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>Gain/Loss</th>
                                        <th className="border p-2 text-center" style={{ borderColor, color: textColor }}>Type</th>
                                        <th className="border p-2 text-center" style={{ borderColor, color: textColor }}>Tax Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {taxSummary.capitalGains.map((cg, idx) => (
                                        <tr key={idx}>
                                            <td className="border p-2" style={{ borderColor, color: textColor }}>{cg.symbol}</td>
                                            <td className={`border p-2 text-right font-semibold ${cg.gain >= 0 ? 'text-green-500' : 'text-red-500'}`} style={{ borderColor }}>
                                                {formatCurrency(cg.gain)} ({cg.gainPercent.toFixed(2)}%)
                                            </td>
                                            <td className="border p-2 text-center" style={{ borderColor, color: textColor }}>{cg.type}</td>
                                            <td className="border p-2 text-center text-xs" style={{ borderColor, color: textColor }}>{cg.taxRate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Deductible Expenses Breakdown */}
                    <div className="mb-6 p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: textColor }}>✅ Tax Deductible Expenses</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: headerBg }}>
                                    <th className="border p-2 text-left" style={{ borderColor, color: textColor }}>Category</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>Transactions</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(taxSummary.deductibleByCategory).length > 0 ? (
                                    Object.entries(taxSummary.deductibleByCategory).map(([cat, data]) => (
                                        <tr key={cat}>
                                            <td className="border p-2 font-semibold" style={{ borderColor, color: textColor }}>{cat}</td>
                                            <td className="border p-2 text-right" style={{ borderColor, color: textColor }}>{data.count}</td>
                                            <td className="border p-2 text-right text-orange-500 font-semibold" style={{ borderColor }}>
                                                {formatCurrency(data.total)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="border p-4 text-center opacity-50" style={{ borderColor, color: textColor }}>
                                            No deductible expenses found for this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Income Breakdown */}
                    <div className="p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="text-lg font-semibold mb-3" style={{ color: textColor }}>💵 Income Breakdown</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ backgroundColor: headerBg }}>
                                    <th className="border p-2 text-left" style={{ borderColor, color: textColor }}>Category</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>Transactions</th>
                                    <th className="border p-2 text-right" style={{ borderColor, color: textColor }}>Total Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(taxSummary.incomeByCategory).length > 0 ? (
                                    Object.entries(taxSummary.incomeByCategory).map(([cat, data]) => (
                                        <tr key={cat}>
                                            <td className="border p-2 font-semibold" style={{ borderColor, color: textColor }}>{cat}</td>
                                            <td className="border p-2 text-right" style={{ borderColor, color: textColor }}>{data.count}</td>
                                            <td className="border p-2 text-right text-green-500 font-semibold" style={{ borderColor }}>
                                                {formatCurrency(data.total)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="border p-4 text-center opacity-50" style={{ borderColor, color: textColor }}>
                                            No income records found for this period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 opacity-50">
                    <div className="text-4xl mb-4">📭</div>
                    <div className="text-lg">No tax data available for this period</div>
                    <div className="text-sm">Add transactions or change the financial year</div>
                </div>
            )}
        </div>
    );
};

export default TaxReport;
