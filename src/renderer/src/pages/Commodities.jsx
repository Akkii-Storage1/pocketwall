import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import DataAdapter from '../utils/dataAdapter';

/**
 * Commodities Page - Gold, Silver, Oil Holdings
 * Table-based layout like Investments page
 */

const COMMODITIES = [
    { id: 'gold', name: 'Gold', symbol: 'XAU', unit: 'gm', emoji: '🥇' },
    { id: 'silver', name: 'Silver', symbol: 'XAG', unit: 'gm', emoji: '🥈' },
    { id: 'crude-oil', name: 'Crude Oil', symbol: 'WTI', unit: 'barrel', emoji: '🛢️' },
    { id: 'natural-gas', name: 'Natural Gas', symbol: 'NG', unit: 'MMBtu', emoji: '🔥' },
    { id: 'platinum', name: 'Platinum', symbol: 'XPT', unit: 'gm', emoji: '💎' },
    { id: 'copper', name: 'Copper', symbol: 'HG', unit: 'kg', emoji: '🟤' },
    { id: 'palladium', name: 'Palladium', symbol: 'XPD', unit: 'gm', emoji: '⚪' },
    { id: 'aluminum', name: 'Aluminum', symbol: 'ALI', unit: 'kg', emoji: '🔘' },
];

const Commodities = ({ isDark, isPrivacyMode }) => {
    const toast = useToast();
    const [currency, setCurrency] = useState('INR');
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);

    const [holdings, setHoldings] = useState(() => {
        const saved = localStorage.getItem('pocketwall_commodities_holdings');
        return saved ? JSON.parse(saved) : {};
    });

    const [formData, setFormData] = useState({
        commodity: 'gold',
        quantity: '',
        price: '',
        date: new Date().toISOString().slice(0, 10),
        type: 'buy'
    });
    const [editingId, setEditingId] = useState(null);

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const inputBg = isDark ? '#1e1e1e' : '#ffffff';

    useEffect(() => { loadSettings(); }, []);
    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, 60000 * 10);
        return () => clearInterval(interval);
    }, [currency]);
    useEffect(() => { localStorage.setItem('pocketwall_commodities_holdings', JSON.stringify(holdings)); }, [holdings]);

    const loadSettings = async () => {
        const settings = await DataAdapter.getUserSettings();
        if (settings?.defaultCurrency) setCurrency(settings.defaultCurrency);
    };

    const fetchPrices = async () => {
        setLoading(true);
        try {
            // Approximate current prices in INR
            const basePrices = {
                'gold': 7500, 'silver': 95, 'crude-oil': 6000, 'natural-gas': 270,
                'platinum': 3200, 'copper': 750, 'palladium': 4500, 'aluminum': 210,
            };
            setPrices(basePrices);
        } catch (error) {
            console.error('Failed to fetch prices');
        }
        setLoading(false);
    };

    const handleCommodityChange = (id) => {
        setFormData({ ...formData, commodity: id, price: (prices[id] || 0).toString() });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.quantity || !formData.price) {
            return toast.error('Enter quantity and price');
        }

        const quantity = parseFloat(formData.quantity);
        const price = parseFloat(formData.price);
        const id = formData.commodity;
        if (isNaN(quantity) || quantity <= 0) return toast.error('Invalid quantity');

        const newEntry = {
            id: editingId || Date.now().toString(),
            commodity: id,
            quantity,
            price,
            invested: quantity * price,
            date: formData.date,
            type: formData.type
        };

        setHoldings(prev => {
            if (editingId) {
                const entries = prev.entries || [];
                const updatedEntries = entries.map(e => e.id === editingId ? newEntry : e);
                return { ...prev, entries: updatedEntries };
            } else {
                const entries = prev.entries || [];
                return { ...prev, entries: [...entries, newEntry] };
            }
        });

        toast.success(editingId ? 'Updated' : `Added ${quantity} ${getCommodity(id).unit} of ${getCommodity(id).name}`);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            commodity: 'gold',
            quantity: '',
            price: '',
            date: new Date().toISOString().slice(0, 10),
            type: 'buy'
        });
        setEditingId(null);
    };

    const handleEdit = (entry) => {
        setFormData({
            commodity: entry.commodity,
            quantity: entry.quantity.toString(),
            price: entry.price.toString(),
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
        const currentPrice = prices[e.commodity] || e.price;
        return sum + (e.quantity * currentPrice);
    }, 0);

    const formatMoney = (amount) => `₹${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    const getCommodity = (id) => COMMODITIES.find(c => c.id === id) || { id, name: id, emoji: '📦', unit: 'unit' };
    const totalPnL = getTotalValue() - getTotalInvested();

    return (
        <div className="h-full p-4 overflow-auto" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI' }}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: textColor }}>🛢️ Commodity Holdings</h2>

            {/* Market Prices Bar */}
            <div className="p-3 rounded border mb-4 flex items-center gap-4 flex-wrap" style={{ backgroundColor: panelBg, borderColor }}>
                <span className="text-sm font-medium" style={{ color: textColor }}>Market Prices:</span>
                {COMMODITIES.slice(0, 6).map(c => (
                    <div key={c.id} className="flex items-center gap-1 text-sm">
                        <span>{c.emoji}</span>
                        <span style={{ color: textColor }}>{c.symbol}:</span>
                        <span className="font-bold text-amber-500">{formatMoney(prices[c.id] || 0)}/{c.unit}</span>
                    </div>
                ))}
                {loading && <span className="text-xs opacity-50 ml-auto" style={{ color: textColor }}>Updating...</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add/Edit Form */}
                <div className="md:col-span-1">
                    <div className="p-4 rounded border shadow-sm sticky top-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="font-semibold mb-4" style={{ color: textColor }}>
                            {editingId ? 'Edit Transaction' : 'Add Commodity'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Commodity</label>
                                <select
                                    value={formData.commodity}
                                    onChange={(e) => handleCommodityChange(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border rounded"
                                    style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                >
                                    {COMMODITIES.map(c => (
                                        <option key={c.id} value={c.id}>{c.emoji} {c.name} ({c.symbol})</option>
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
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>
                                        Quantity ({getCommodity(formData.commodity).unit})
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        step="any"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>
                                        Price (₹/{getCommodity(formData.commodity).unit})
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
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
                                        {formatMoney((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0))}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button type="submit" className="flex-1 py-2 text-sm font-semibold text-white rounded"
                                    style={{ backgroundColor: editingId ? '#0078d4' : '#f59e0b' }}>
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
                                <span className="text-amber-500">Value: <strong className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(getTotalValue())}</strong></span>
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
                                        <th className="p-2">Commodity</th>
                                        <th className="p-2 text-right">Quantity</th>
                                        <th className="p-2 text-right">Buy Price</th>
                                        <th className="p-2 text-right">Current</th>
                                        <th className="p-2 text-right">Value (INR)</th>
                                        <th className="p-2 text-right">P&L</th>
                                        <th className="p-2 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getEntries().length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="p-8 text-center opacity-50" style={{ color: textColor }}>
                                                No commodity transactions. Add gold, silver or oil holdings!
                                            </td>
                                        </tr>
                                    ) : (
                                        getEntries().sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => {
                                            const c = getCommodity(entry.commodity);
                                            const currentPrice = prices[entry.commodity] || entry.price;
                                            const currentValue = entry.quantity * currentPrice;
                                            const pnl = currentValue - entry.invested;
                                            const pnlPercent = entry.invested > 0 ? (pnl / entry.invested) * 100 : 0;

                                            return (
                                                <tr key={entry.id} className="border-b hover:bg-opacity-5 hover:bg-gray-500" style={{ borderColor }}>
                                                    <td className="p-2" style={{ color: textColor }}>{new Date(entry.date).toLocaleDateString()}</td>
                                                    <td className="p-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{c.emoji}</span>
                                                            <div>
                                                                <div className="font-medium" style={{ color: textColor }}>{c.name}</div>
                                                                <div className="text-xs opacity-50" style={{ color: textColor }}>{c.symbol}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-right" style={{ color: textColor }}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>{entry.quantity} {c.unit}</span>
                                                    </td>
                                                    <td className="p-2 text-right" style={{ color: textColor }}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(entry.price)}/{c.unit}</span>
                                                    </td>
                                                    <td className="p-2 text-right text-amber-500">
                                                        {formatMoney(currentPrice)}/{c.unit}
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

export default Commodities;
