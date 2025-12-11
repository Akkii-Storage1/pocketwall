import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Home, Car, Watch, Briefcase, DollarSign, TrendingUp, Edit2, Save, X } from 'lucide-react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import CurrencyConverter from '../utils/CurrencyConverter';

const Assets = ({ isDark }) => {
    const [assets, setAssets] = useState([]);
    const [editingAsset, setEditingAsset] = useState(null);
    const [newAsset, setNewAsset] = useState({
        name: '',
        category: 'real_estate',
        purchaseValue: '',
        currentValue: '',
        purchaseDate: '',
        notes: ''
    });
    const toast = useToast();
    const [currency, setCurrency] = useState('INR');

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const cardBg = isDark ? '#2d2d30' : '#f9fafb';
    const borderColor = isDark ? '#333' : '#e5e7eb';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const settings = await DataAdapter.getUserSettings();
        setCurrency(settings.defaultCurrency || 'INR');
        const data = await DataAdapter.getAssets();
        setAssets(data);
    };

    const saveData = async (updatedAssets) => {
        await DataAdapter.saveAssets(updatedAssets);
        setAssets(updatedAssets);
    };

    const addAsset = async () => {
        if (!newAsset.name || !newAsset.currentValue) return toast.error("Name and Current Value are required");

        // Convert Amounts (Display) to Base (INR)
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const purchaseValueInINR = (parseFloat(newAsset.purchaseValue) || 0) / rate;
        const currentValueInINR = parseFloat(newAsset.currentValue) / rate;

        const asset = {
            id: Date.now(),
            ...newAsset,
            purchaseValue: purchaseValueInINR,
            currentValue: currentValueInINR,
            createdAt: new Date().toISOString()
        };

        const updatedAssets = [...assets, asset];
        await saveData(updatedAssets);
        setNewAsset({ name: '', category: 'real_estate', purchaseValue: '', currentValue: '', purchaseDate: '', notes: '' });
        toast.success("Asset added");
    };

    const updateAsset = async (updatedAsset) => {
        // Convert Amounts (Display) to Base (INR)
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const purchaseValueInINR = (parseFloat(updatedAsset.purchaseValue) || 0) / rate;
        const currentValueInINR = parseFloat(updatedAsset.currentValue) / rate;

        const updatedAssets = assets.map(a => a.id === updatedAsset.id ? {
            ...updatedAsset,
            purchaseValue: purchaseValueInINR,
            currentValue: currentValueInINR
        } : a);

        await saveData(updatedAssets);
        setEditingAsset(null);
        toast.success("Asset updated");
    };

    const deleteAsset = async (id) => {
        if (!confirm("Delete this asset?")) return;
        const updatedAssets = assets.filter(a => a.id !== id);
        await saveData(updatedAssets);
        toast.success("Asset deleted");
    };

    const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const totalPurchaseValue = assets.reduce((sum, a) => sum + a.purchaseValue, 0);
    const totalGain = totalValue - totalPurchaseValue;
    const totalGainPercent = totalPurchaseValue > 0 ? (totalGain / totalPurchaseValue) * 100 : 0;

    const formatMoney = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    // Helper to convert INR to Display
    const toDisplay = (amountINR) => {
        return CurrencyConverter.convert(amountINR, 'INR', currency);
    };

    const getIcon = (category) => {
        switch (category) {
            case 'real_estate': return <Home size={20} className="text-blue-500" />;
            case 'vehicle': return <Car size={20} className="text-orange-500" />;
            case 'gold': return <Watch size={20} className="text-yellow-500" />;
            case 'business': return <Briefcase size={20} className="text-purple-500" />;
            default: return <DollarSign size={20} className="text-green-500" />;
        }
    };

    const getCategoryLabel = (category) => {
        switch (category) {
            case 'real_estate': return 'Real Estate';
            case 'vehicle': return 'Vehicle';
            case 'gold': return 'Gold & Jewelry';
            case 'business': return 'Business Equity';
            default: return 'Other Asset';
        }
    };

    return (
        <div className="p-6 h-full flex flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Home className="text-indigo-500" /> Fixed Assets
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: cardBg, borderColor }}>
                    <div className="text-sm opacity-70">Total Asset Value</div>
                    <div className="text-2xl font-bold text-blue-500">{formatMoney(toDisplay(totalValue))}</div>
                </div>
                <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: cardBg, borderColor }}>
                    <div className="text-sm opacity-70">Total Invested</div>
                    <div className="text-xl font-bold">{formatMoney(toDisplay(totalPurchaseValue))}</div>
                </div>
                <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: cardBg, borderColor }}>
                    <div className="text-sm opacity-70">Unrealized Gain</div>
                    <div className={`text-xl font-bold ${totalGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {totalGain >= 0 ? '+' : ''}{formatMoney(toDisplay(totalGain))} ({totalGainPercent.toFixed(2)}%)
                    </div>
                </div>
            </div>

            {/* Add New Form */}
            <div className="p-4 rounded-xl border shadow-sm mb-6" style={{ backgroundColor: cardBg, borderColor }}>
                <h3 className="font-semibold mb-3">Add New Asset</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                    <select
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light', backgroundColor: isDark ? '#2d2d30' : '#ffffff' }}
                        value={newAsset.category}
                        onChange={e => setNewAsset({ ...newAsset, category: e.target.value })}
                    >
                        <option value="real_estate" style={{ backgroundColor: isDark ? '#2d2d30' : '#ffffff', color: textColor }}>Real Estate</option>
                        <option value="vehicle" style={{ backgroundColor: isDark ? '#2d2d30' : '#ffffff', color: textColor }}>Vehicle</option>
                        <option value="gold" style={{ backgroundColor: isDark ? '#2d2d30' : '#ffffff', color: textColor }}>Gold & Jewelry</option>
                        <option value="business" style={{ backgroundColor: isDark ? '#2d2d30' : '#ffffff', color: textColor }}>Business Equity</option>
                        <option value="other" style={{ backgroundColor: isDark ? '#2d2d30' : '#ffffff', color: textColor }}>Other</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Asset Name"
                        className="p-2 rounded border bg-transparent lg:col-span-2"
                        style={{ borderColor, color: textColor }}
                        value={newAsset.name}
                        onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder={`Purchase Value (${currency})`}
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor }}
                        value={newAsset.purchaseValue}
                        onChange={e => setNewAsset({ ...newAsset, purchaseValue: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder={`Current Value (${currency})`}
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor }}
                        value={newAsset.currentValue}
                        onChange={e => setNewAsset({ ...newAsset, currentValue: e.target.value })}
                    />
                    <button
                        onClick={addAsset}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 justify-center"
                    >
                        <Plus size={18} /> Add
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
                <div className="space-y-2">
                    {assets.length === 0 ? (
                        <div className="text-center opacity-50 mt-10">No assets found.</div>
                    ) : (
                        assets.sort((a, b) => b.currentValue - a.currentValue).map(asset => {
                            const gain = asset.currentValue - asset.purchaseValue;
                            const gainPercent = asset.purchaseValue > 0 ? (gain / asset.purchaseValue) * 100 : 0;

                            return (
                                <div
                                    key={asset.id}
                                    className="flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md"
                                    style={{ backgroundColor: cardBg, borderColor }}
                                >
                                    {editingAsset?.id === asset.id ? (
                                        /* Edit Mode */
                                        <>
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                                                <input
                                                    type="text"
                                                    className="p-2 rounded border bg-transparent"
                                                    style={{ borderColor, color: textColor }}
                                                    value={editingAsset.name}
                                                    onChange={e => setEditingAsset({ ...editingAsset, name: e.target.value })}
                                                />
                                                <input
                                                    type="number"
                                                    className="p-2 rounded border bg-transparent"
                                                    style={{ borderColor, color: textColor }}
                                                    value={editingAsset.purchaseValue}
                                                    onChange={e => setEditingAsset({ ...editingAsset, purchaseValue: e.target.value })}
                                                    placeholder="Purchase"
                                                />
                                                <input
                                                    type="number"
                                                    className="p-2 rounded border bg-transparent"
                                                    style={{ borderColor, color: textColor }}
                                                    value={editingAsset.currentValue}
                                                    onChange={e => setEditingAsset({ ...editingAsset, currentValue: e.target.value })}
                                                    placeholder="Current"
                                                />
                                            </div>
                                            <div className="flex gap-2 ml-2">
                                                <button onClick={() => updateAsset(editingAsset)} className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900 p-2 rounded">
                                                    <Save size={16} />
                                                </button>
                                                <button onClick={() => setEditingAsset(null)} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        /* View Mode */
                                        <>
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                                                    {getIcon(asset.category)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-lg">{asset.name}</div>
                                                    <div className="text-xs opacity-70 flex items-center gap-2">
                                                        <span className="capitalize">{getCategoryLabel(asset.category)}</span>
                                                        {asset.purchaseDate && <span>• Bought: {new Date(asset.purchaseDate).toLocaleDateString()}</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 text-right">
                                                <div>
                                                    <div className="text-xs opacity-70">Current Value</div>
                                                    <div className="font-bold text-lg">{formatMoney(toDisplay(asset.currentValue))}</div>
                                                </div>
                                                <div className="hidden md:block">
                                                    <div className="text-xs opacity-70">Gain/Loss</div>
                                                    <div className={`font-medium ${gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {gain >= 0 ? '+' : ''}{formatMoney(toDisplay(gain))} ({gainPercent.toFixed(1)}%)
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const rate = CurrencyConverter.convert(1, 'INR', currency);
                                                        setEditingAsset({
                                                            ...asset,
                                                            purchaseValue: (asset.purchaseValue * rate).toFixed(2),
                                                            currentValue: (asset.currentValue * rate).toFixed(2)
                                                        });
                                                    }}
                                                    className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-2 rounded ml-2"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => deleteAsset(asset.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-2 rounded ml-2">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default Assets;
