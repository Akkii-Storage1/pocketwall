import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import DataAdapter from '../utils/dataAdapter';

/**
 * Forex Page - Currency Holdings
 * Table-based layout like Investments page
 */

const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
    { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
    { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
    { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
    { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
    { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
    { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
    { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
    { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
    { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
    { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
    { code: 'KRW', name: 'Korean Won', flag: '🇰🇷' },
    { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
    { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
];

const Forex = ({ isDark, isPrivacyMode }) => {
    const toast = useToast();
    const [baseCurrency, setBaseCurrency] = useState('INR');
    const [rates, setRates] = useState({});
    const [loading, setLoading] = useState(false);

    const [holdings, setHoldings] = useState(() => {
        const saved = localStorage.getItem('pocketwall_forex_holdings');
        return saved ? JSON.parse(saved) : {};
    });

    const [formData, setFormData] = useState({
        currency: 'USD',
        amount: '',
        rate: '',
        date: new Date().toISOString().slice(0, 10),
        type: 'buy'
    });
    const [editingId, setEditingId] = useState(null);

    // Converter
    const [convertAmount, setConvertAmount] = useState(1);
    const [convertFrom, setConvertFrom] = useState('USD');
    const [convertTo, setConvertTo] = useState('INR');

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const inputBg = isDark ? '#1e1e1e' : '#ffffff';

    useEffect(() => { loadSettings(); }, []);
    useEffect(() => {
        fetchRates();
        const interval = setInterval(fetchRates, 60000 * 15);
        return () => clearInterval(interval);
    }, [baseCurrency]);
    useEffect(() => { localStorage.setItem('pocketwall_forex_holdings', JSON.stringify(holdings)); }, [holdings]);

    const loadSettings = async () => {
        const settings = await DataAdapter.getUserSettings();
        if (settings?.defaultCurrency) setBaseCurrency(settings.defaultCurrency);
    };

    const fetchRates = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
            if (response.ok) {
                const data = await response.json();
                setRates(data.rates);
            }
        } catch (error) {
            console.error('Failed to fetch rates');
        }
        setLoading(false);
    };

    const handleCurrencyChange = (code) => {
        const rate = rates[code] ? (1 / rates[code]) : 0;
        setFormData({ ...formData, currency: code, rate: rate.toFixed(4) });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.amount || !formData.rate) {
            return toast.error('Enter amount and rate');
        }

        const amount = parseFloat(formData.amount);
        const rate = parseFloat(formData.rate);
        const code = formData.currency;
        if (isNaN(amount) || amount <= 0) return toast.error('Invalid amount');

        const newEntry = {
            id: editingId || Date.now().toString(),
            currency: code,
            amount,
            rate,
            invested: amount * rate,
            date: formData.date,
            type: formData.type
        };

        setHoldings(prev => {
            if (editingId) {
                // Update existing
                const entries = prev.entries || [];
                const updatedEntries = entries.map(e => e.id === editingId ? newEntry : e);
                return { ...prev, entries: updatedEntries };
            } else {
                // Add new entry
                const entries = prev.entries || [];
                return { ...prev, entries: [...entries, newEntry] };
            }
        });

        toast.success(editingId ? 'Updated successfully' : `Added ${amount} ${code}`);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            currency: 'USD',
            amount: '',
            rate: '',
            date: new Date().toISOString().slice(0, 10),
            type: 'buy'
        });
        setEditingId(null);
    };

    const handleEdit = (entry) => {
        setFormData({
            currency: entry.currency,
            amount: entry.amount.toString(),
            rate: entry.rate.toString(),
            date: entry.date,
            type: entry.type || 'buy'
        });
        setEditingId(entry.id);
    };

    const handleDelete = (id) => {
        if (!confirm('Delete this transaction?')) return;
        setHoldings(prev => ({
            ...prev,
            entries: (prev.entries || []).filter(e => e.id !== id)
        }));
        toast.success('Deleted');
    };

    const getEntries = () => holdings.entries || [];

    const getTotalInvested = () => getEntries().reduce((sum, e) => sum + (e.invested || 0), 0);

    const getTotalValue = () => getEntries().reduce((sum, e) => {
        const currentRate = rates[e.currency] ? (1 / rates[e.currency]) : e.rate;
        return sum + (e.amount * currentRate);
    }, 0);

    const getConvertedAmount = () => {
        if (!rates[convertFrom] || !rates[convertTo]) return 0;
        return (convertAmount / rates[convertFrom]) * rates[convertTo];
    };

    const formatMoney = (amount) => `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const getCurrency = (code) => CURRENCIES.find(c => c.code === code) || { code, flag: '💱', name: code };
    const totalPnL = getTotalValue() - getTotalInvested();

    return (
        <div className="h-full p-4 overflow-auto" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: textColor }}>💱 Forex Holdings</h2>

            {/* Converter Bar */}
            <div className="p-3 rounded border mb-4 flex items-center gap-3 flex-wrap" style={{ backgroundColor: panelBg, borderColor }}>
                <span className="text-sm font-medium" style={{ color: textColor }}>Convert:</span>
                <input type="number" value={convertAmount} onChange={(e) => setConvertAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 text-sm border rounded" style={{ backgroundColor: inputBg, borderColor, color: textColor }} />
                <select value={convertFrom} onChange={(e) => setConvertFrom(e.target.value)}
                    className="px-2 py-1 text-sm border rounded" style={{ backgroundColor: inputBg, borderColor, color: textColor }}>
                    <option value="INR">INR</option>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                </select>
                <span style={{ color: textColor }}>=</span>
                <select value={convertTo} onChange={(e) => setConvertTo(e.target.value)}
                    className="px-2 py-1 text-sm border rounded" style={{ backgroundColor: inputBg, borderColor, color: textColor }}>
                    <option value="INR">INR</option>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                </select>
                <div className="px-3 py-1 rounded bg-emerald-500 text-white font-bold text-sm">
                    {getConvertedAmount().toFixed(4)} {convertTo}
                </div>
                {loading && <span className="text-xs opacity-50 ml-auto" style={{ color: textColor }}>Updating rates...</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add/Edit Form */}
                <div className="md:col-span-1">
                    <div className="p-4 rounded border shadow-sm sticky top-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="font-semibold mb-4" style={{ color: textColor }}>
                            {editingId ? 'Edit Transaction' : 'Add Currency'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Currency</label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => handleCurrencyChange(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border rounded"
                                    style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.flag} {c.code} - {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Date</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-2 py-1.5 text-sm border rounded"
                                    style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Amount ({formData.currency})</label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        step="any"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Rate (1 {formData.currency} = ₹)</label>
                                    <input
                                        type="number"
                                        value={formData.rate}
                                        onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        step="any"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Total (INR)</label>
                                <div className="px-2 py-1.5 text-sm border rounded bg-opacity-10 bg-gray-500" style={{ color: textColor, borderColor }}>
                                    <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                                        {formatMoney((parseFloat(formData.amount) || 0) * (parseFloat(formData.rate) || 0))}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button type="submit" className="flex-1 py-2 text-sm font-semibold text-white rounded"
                                    style={{ backgroundColor: editingId ? '#0078d4' : '#10b981' }}>
                                    {editingId ? 'Update' : '+ Add'}
                                </button>
                                {editingId && (
                                    <button type="button" onClick={resetForm}
                                        className="px-4 py-2 text-sm border rounded" style={{ backgroundColor: panelBg, color: textColor, borderColor }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="md:col-span-2">
                    <div className="p-4 rounded border shadow-sm h-full overflow-hidden flex flex-col" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold" style={{ color: textColor }}>Transactions</h3>
                            <div className="flex gap-4 text-sm">
                                <span style={{ color: textColor }}>Invested: <strong className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(getTotalInvested())}</strong></span>
                                <span className="text-emerald-500">Value: <strong className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(getTotalValue())}</strong></span>
                                <span className={totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                                    P&L: <strong className={isPrivacyMode ? 'privacy-blur' : ''}>{totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL)}</strong>
                                </span>
                            </div>
                        </div>

                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="border-b" style={{ borderColor }}>
                                    <tr style={{ color: textColor, opacity: 0.7 }}>
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Currency</th>
                                        <th className="p-2 text-right">Amount</th>
                                        <th className="p-2 text-right">Buy Rate</th>
                                        <th className="p-2 text-right">Current Rate</th>
                                        <th className="p-2 text-right">Value (INR)</th>
                                        <th className="p-2 text-right">P&L</th>
                                        <th className="p-2 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getEntries().length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="p-8 text-center opacity-50" style={{ color: textColor }}>
                                                No forex transactions. Add currency holdings to track!
                                            </td>
                                        </tr>
                                    ) : (
                                        getEntries().sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => {
                                            const cur = getCurrency(entry.currency);
                                            const currentRate = rates[entry.currency] ? (1 / rates[entry.currency]) : entry.rate;
                                            const currentValue = entry.amount * currentRate;
                                            const pnl = currentValue - entry.invested;
                                            const pnlPercent = entry.invested > 0 ? (pnl / entry.invested) * 100 : 0;

                                            return (
                                                <tr key={entry.id} className="border-b hover:bg-opacity-5 hover:bg-gray-500" style={{ borderColor }}>
                                                    <td className="p-2" style={{ color: textColor }}>{new Date(entry.date).toLocaleDateString()}</td>
                                                    <td className="p-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{cur.flag}</span>
                                                            <div>
                                                                <div className="font-medium" style={{ color: textColor }}>{entry.currency}</div>
                                                                <div className="text-xs opacity-50" style={{ color: textColor }}>{cur.name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-right" style={{ color: textColor }}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>{entry.amount.toLocaleString()}</span>
                                                    </td>
                                                    <td className="p-2 text-right" style={{ color: textColor }}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>₹{entry.rate.toFixed(2)}</span>
                                                    </td>
                                                    <td className="p-2 text-right text-emerald-500">
                                                        ₹{currentRate.toFixed(2)}
                                                    </td>
                                                    <td className="p-2 text-right font-medium" style={{ color: textColor }}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(currentValue)}</span>
                                                    </td>
                                                    <td className={`p-2 text-right font-medium ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                                                            {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}
                                                            <div className="text-xs">({pnlPercent.toFixed(1)}%)</div>
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => handleEdit(entry)}
                                                                className="text-xs px-2 py-1 border rounded hover:bg-opacity-10 hover:bg-blue-500"
                                                                style={{ color: '#0078d4', borderColor: '#0078d4' }}>
                                                                Edit
                                                            </button>
                                                            <button onClick={() => handleDelete(entry.id)}
                                                                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50">
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {getEntries().length > 0 && (
                                    <tfoot>
                                        <tr className="font-bold border-t" style={{ backgroundColor: isDark ? '#333' : '#eee' }}>
                                            <td colSpan={5} className="p-2 text-right" style={{ color: textColor }}>Total</td>
                                            <td className="p-2 text-right" style={{ color: textColor }}>{formatMoney(getTotalValue())}</td>
                                            <td className={`p-2 text-right ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Forex;
