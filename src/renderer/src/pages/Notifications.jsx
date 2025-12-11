import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';

const Notifications = ({ isDark }) => {
    const toast = useToast();
    const [alerts, setAlerts] = useState([]);
    const [otherAlerts, setOtherAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currency, setCurrency] = useState('INR');
    const [formData, setFormData] = useState({
        type: 'stock_watchlist',
        enabled: true,
        message: '',
        conditions: {
            symbol: '',
            targetPrice: 0,
            comparison: 'below'
        }
    });

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const headerBg = isDark ? '#3e3e42' : '#e0e0e0';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const settings = await DataAdapter.getUserSettings();
            setCurrency(settings.defaultCurrency || 'INR');

            const alertsData = await DataAdapter.getAlerts();
            // Separate watchlist alerts from others
            const watchlistAlerts = alertsData.filter(a => a.type === 'stock_watchlist');
            const others = alertsData.filter(a => a.type !== 'stock_watchlist');

            setAlerts(watchlistAlerts);
            setOtherAlerts(others);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load alerts');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAlert = async () => {
        try {
            if (!formData.conditions.symbol || !formData.conditions.targetPrice) {
                toast.error('Please fill in all fields');
                return;
            }

            // Convert Target Price (Display) to Base (INR)
            const rate = CurrencyConverter.convert(1, 'INR', currency);
            const targetPriceInINR = (parseFloat(formData.conditions.targetPrice) || 0) / rate;

            const alertData = {
                ...formData,
                conditions: {
                    ...formData.conditions,
                    targetPrice: targetPriceInINR
                }
            };

            await DataAdapter.addAlert(alertData);
            toast.success('Buy alert created');
            setShowForm(false);
            setFormData({
                type: 'stock_watchlist',
                enabled: true,
                message: '',
                conditions: { symbol: '', targetPrice: 0, comparison: 'below' }
            });
            loadData();
        } catch (error) {
            toast.error('Failed to create alert');
        }
    };

    const handleToggleAlert = async (alert) => {
        try {
            await DataAdapter.updateAlert({ ...alert, enabled: !alert.enabled });
            toast.success(alert.enabled ? 'Alert disabled' : 'Alert enabled');
            loadData();
        } catch (error) {
            toast.error('Failed to update alert');
        }
    };

    const handleDeleteAlert = async (id) => {
        if (!confirm('Delete this alert?')) return;
        try {
            await DataAdapter.deleteAlert(id);
            toast.success('Alert deleted');
            loadData();
        } catch (error) {
            toast.error('Failed to delete alert');
        }
    };

    const formatMoney = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    // Helper to convert INR to Display
    const toDisplay = (amountINR) => {
        return CurrencyConverter.convert(amountINR, 'INR', currency);
    };

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                <div style={{ color: textColor }}>Loading...</div>
            </div>
        );
    }

    return (
        <div className="h-full p-4 overflow-auto" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI' }}>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-xl font-semibold" style={{ color: textColor }}>📋 Watchlist & Buy Alerts</h2>
                    <p className="text-xs opacity-60 mt-1" style={{ color: textColor }}>
                        Set price alerts for stocks you want to buy (not yet in portfolio)
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 text-sm border font-semibold"
                    style={{ backgroundColor: '#0078d4', color: '#fff', borderColor: '#005a9e' }}
                >
                    {showForm ? 'Cancel' : '+ New Buy Alert'}
                </button>
            </div>

            {/* System Notifications */}
            <div className="mb-6 p-4 rounded border" style={{ backgroundColor: panelBg, borderColor }}>
                <h3 className="font-semibold mb-3 text-sm" style={{ color: textColor }}>🔔 System Notifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center p-3 border rounded" style={{ borderColor }}>
                        <div>
                            <div className="font-medium text-sm" style={{ color: textColor }}>Daily P&L Summary</div>
                            <div className="text-xs opacity-60" style={{ color: textColor }}>Get a summary of your income & expenses every evening</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={localStorage.getItem('enable_daily_summary') !== 'false'}
                                onChange={(e) => {
                                    localStorage.setItem('enable_daily_summary', e.target.checked);
                                    toast.success(`Daily summary ${e.target.checked ? 'enabled' : 'disabled'}`);
                                    // Force re-render (simple way)
                                    setLoading(true);
                                    setTimeout(() => setLoading(false), 10);
                                }}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex justify-between items-center p-3 border rounded" style={{ borderColor }}>
                        <div>
                            <div className="font-medium text-sm" style={{ color: textColor }}>Market Open/Close Alerts</div>
                            <div className="text-xs opacity-60" style={{ color: textColor }}>Get notified when stock markets open (9:15 AM) and close (3:30 PM)</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={localStorage.getItem('enable_market_alerts') !== 'false'}
                                onChange={(e) => {
                                    localStorage.setItem('enable_market_alerts', e.target.checked);
                                    toast.success(`Market alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
                                    setLoading(true);
                                    setTimeout(() => setLoading(false), 10);
                                }}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Add Alert Form */}
            {showForm && (
                <div className="border p-4 mb-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                    <h3 className="font-semibold mb-3 text-sm" style={{ color: textColor }}>Create Buy Alert</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs mb-1" style={{ color: textColor }}>Stock Symbol</label>
                            <input
                                type="text"
                                value={formData.conditions.symbol}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    conditions: { ...formData.conditions, symbol: e.target.value.toUpperCase() }
                                })}
                                placeholder="e.g., AAPL, GOOGL, RELIANCE.NS"
                                className="w-full px-2 py-1.5 text-sm border"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Alert when price</label>
                                <select
                                    value={formData.conditions.comparison}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        conditions: { ...formData.conditions, comparison: e.target.value }
                                    })}
                                    className="w-full px-2 py-1.5 text-sm border"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                >
                                    <option value="below">Falls below</option>
                                    <option value="above">Rises above</option>
                                </select>
                            </div>
                            <div>
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Target Price ({currency})</label>
                                    <input
                                        type="number"
                                        value={formData.conditions.targetPrice || ''}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            conditions: { ...formData.conditions, targetPrice: parseFloat(e.target.value) || 0 }
                                        })}
                                        placeholder="e.g., 150.00"
                                        className="w-full px-2 py-1.5 text-sm border"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Custom Message</label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="e.g., Time to buy AAPL! Good entry point."
                                    className="w-full px-2 py-1.5 text-sm border"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                    rows={2}
                                />
                            </div>

                            <button
                                onClick={handleAddAlert}
                                className="w-full px-4 py-2 text-sm border font-semibold"
                                style={{ backgroundColor: '#0078d4', color: '#fff', borderColor: '#005a9e' }}
                            >
                                Create Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alerts List */}
            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                <h3 className="font-semibold mb-3 text-sm" style={{ color: textColor }}>
                    📈 Active Buy Alerts
                </h3>
                {alerts.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-4xl mb-2">📊</div>
                        <p className="text-sm opacity-60" style={{ color: textColor }}>
                            No buy alerts set. Add alerts for stocks you're watching!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {alerts.map(alert => (
                            <div key={alert.id} className="border p-3 rounded flex justify-between items-start" style={{ borderColor }}>
                                <div className="flex-1">
                                    <div className="font-semibold text-sm" style={{ color: textColor }}>
                                        {alert.conditions.symbol}
                                    </div>
                                    <div className="text-xs mt-1" style={{ color: textColor, opacity: 0.8 }}>
                                        Alert when price {alert.conditions.comparison} {formatMoney(toDisplay(alert.conditions.targetPrice))}
                                    </div>
                                    {alert.message && (
                                        <div className="text-xs mt-1 italic" style={{ color: textColor, opacity: 0.6 }}>
                                            "{alert.message}"
                                        </div>
                                    )}
                                    {alert.lastTriggered && (
                                        <div className="text-[10px] mt-1 opacity-50" style={{ color: textColor }}>
                                            Last triggered: {new Date(alert.lastTriggered).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 items-center ml-3">
                                    <button
                                        onClick={() => handleToggleAlert(alert)}
                                        className={`px-2 py-1 text-[10px] border rounded ${alert.enabled ? 'bg-green-100' : 'bg-gray-100'}`}
                                        style={{ borderColor }}
                                    >
                                        {alert.enabled ? 'Enabled' : 'Disabled'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAlert(alert.id)}
                                        className="px-2 py-1 text-[10px] border rounded bg-red-100 hover:bg-red-200"
                                        style={{ borderColor }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Other Alerts Section (Hidden alerts cleanup) */}
            {otherAlerts.length > 0 && (
                <div className="mt-6 border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                    <h3 className="font-semibold mb-3 text-sm text-orange-500">
                        ⚠️ Other Active Alerts
                    </h3>
                    <p className="text-xs mb-3 opacity-70" style={{ color: textColor }}>
                        These alerts are active but not part of your watchlist (e.g., Portfolio or Goal alerts). You can manage them here.
                    </p>
                    <div className="space-y-2">
                        {otherAlerts.map(alert => (
                            <div key={alert.id} className="border p-2 rounded flex justify-between items-center" style={{ borderColor }}>
                                <div className="text-xs" style={{ color: textColor }}>
                                    <span className="font-semibold capitalize">{alert.type.replace('_', ' ')} Alert</span>
                                    {alert.message && <span className="opacity-70 ml-2">- {alert.message}</span>}
                                </div>
                                <button
                                    onClick={() => handleDeleteAlert(alert.id)}
                                    className="px-2 py-1 text-[10px] border rounded bg-red-100 hover:bg-red-200"
                                    style={{ borderColor }}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="mt-4 p-3 border rounded" style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff3cd', borderColor: '#ffecb5' }}>
                <div className="text-xs" style={{ color: isDark ? textColor : '#856404' }}>
                    <strong>💡 Tip:</strong> For stocks you already own, set price alerts directly from Portfolio → Click on stock → Price Alerts section.
                </div>
            </div>
        </div>
    );
};

export default Notifications;
