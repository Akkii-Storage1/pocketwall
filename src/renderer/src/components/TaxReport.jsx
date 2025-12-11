import React, { useState, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';

const TaxReport = ({ isDark, onBack }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const textColor = isDark ? '#e0e0e0' : '#333333';
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const txs = await DataAdapter.getTransactions();
        setTransactions(txs);
        setLoading(false);
    };

    const calculateTax = () => {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const deductions = transactions.filter(t => t.category === 'Charity' || t.category === 'Education').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const taxableIncome = Math.max(0, income - deductions);
        const estimatedTax = taxableIncome * 0.1; // Simplified 10% tax

        return { income, deductions, taxableIncome, estimatedTax };
    };

    const { income, deductions, taxableIncome, estimatedTax } = calculateTax();

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-blue-500 hover:underline">← Back to Reports</button>
                <h1 className="text-2xl font-bold" style={{ color: textColor }}>Tax Report (Estimated)</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg border shadow-sm" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                    <h2 className="text-lg font-semibold mb-4" style={{ color: textColor }}>Summary</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span style={{ color: textColor }}>Total Income</span>
                            <span className="font-bold text-green-500">₹{income.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span style={{ color: textColor }}>Deductions (Charity/Edu)</span>
                            <span className="font-bold text-red-500">-₹{deductions.toLocaleString()}</span>
                        </div>
                        <div className="border-t my-2"></div>
                        <div className="flex justify-between font-bold">
                            <span style={{ color: textColor }}>Taxable Income</span>
                            <span style={{ color: textColor }}>₹{taxableIncome.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg mt-4">
                            <span style={{ color: textColor }}>Est. Tax (10%)</span>
                            <span className="text-red-600">₹{estimatedTax.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-lg border shadow-sm" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                    <h2 className="text-lg font-semibold mb-4" style={{ color: textColor }}>Tax Saving Opportunities</h2>
                    <p className="text-sm opacity-70" style={{ color: textColor }}>
                        Consider investing in ELSS Mutual Funds or donating to charity to reduce your taxable income.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TaxReport;
