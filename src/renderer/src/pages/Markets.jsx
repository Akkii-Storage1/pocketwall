import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useToast } from '../components/Toast';

/**
 * Markets Page - Unified Crypto, Forex, Commodities
 * Features: Holdings + Watchlist with Mini Charts & Real-time Updates
 */

// ==================== SPARKLINE CHART COMPONENT ====================
const SparklineChart = memo(({ data, width = 100, height = 40, color = '#10b981', isUp = true }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!data || data.length < 2) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const points = data;
        const min = Math.min(...points);
        const max = Math.max(...points);
        const range = max - min || 1;

        ctx.clearRect(0, 0, width, height);

        // Draw gradient area
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(0, height);

        points.forEach((point, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - ((point - min) / range) * (height - 4);
            if (i === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        points.forEach((point, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - ((point - min) / range) * (height - 4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = isUp ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.stroke();

    }, [data, width, height, isUp]);

    if (!data || data.length < 2) {
        return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontSize: '10px' }}>No data</div>;
    }

    return <canvas ref={canvasRef} style={{ width, height }} />;
});

// Asset definitions
const CRYPTO_LIST = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', emoji: '₿' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', emoji: 'Ξ' },
    { id: 'tether', symbol: 'USDT', name: 'Tether', emoji: '₮' },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB', emoji: '🔶' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', emoji: '◎' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', emoji: '✕' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', emoji: '₳' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', emoji: '🐕' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', emoji: '●' },
    { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu', emoji: '🐕' },
];

const FOREX_LIST = [
    { id: 'USD', symbol: 'USD', name: 'US Dollar', emoji: '🇺🇸' },
    { id: 'EUR', symbol: 'EUR', name: 'Euro', emoji: '🇪🇺' },
    { id: 'GBP', symbol: 'GBP', name: 'British Pound', emoji: '🇬🇧' },
    { id: 'JPY', symbol: 'JPY', name: 'Japanese Yen', emoji: '🇯🇵' },
    { id: 'AUD', symbol: 'AUD', name: 'Australian Dollar', emoji: '🇦🇺' },
    { id: 'CAD', symbol: 'CAD', name: 'Canadian Dollar', emoji: '🇨🇦' },
    { id: 'CHF', symbol: 'CHF', name: 'Swiss Franc', emoji: '🇨🇭' },
    { id: 'AED', symbol: 'AED', name: 'UAE Dirham', emoji: '🇦🇪' },
    { id: 'SGD', symbol: 'SGD', name: 'Singapore Dollar', emoji: '🇸🇬' },
    { id: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', emoji: '🇸🇦' },
];

const COMMODITY_LIST = [
    { id: 'gold', symbol: 'XAU', name: 'Gold', emoji: '🥇', unit: 'gm' },
    { id: 'silver', symbol: 'XAG', name: 'Silver', emoji: '🥈', unit: 'gm' },
    { id: 'crude-oil', symbol: 'WTI', name: 'Crude Oil', emoji: '🛢️', unit: 'barrel' },
    { id: 'natural-gas', symbol: 'NG', name: 'Natural Gas', emoji: '🔥', unit: 'MMBtu' },
    { id: 'platinum', symbol: 'XPT', name: 'Platinum', emoji: '💎', unit: 'gm' },
    { id: 'copper', symbol: 'HG', name: 'Copper', emoji: '🟤', unit: 'kg' },
];

const Markets = ({ isDark, isPrivacyMode, setActiveTab }) => {
    const toast = useToast();
    const [activeView, setActiveView] = useState('holdings');

    // Holdings state
    const [holdings, setHoldings] = useState(() => {
        const saved = localStorage.getItem('pocketwall_markets_holdings');
        return saved ? JSON.parse(saved) : { entries: [] };
    });

    // Watchlist state
    const [watchlist, setWatchlist] = useState(() => {
        const saved = localStorage.getItem('pocketwall_markets_watchlist');
        return saved ? JSON.parse(saved) : [];
    });

    const [prices, setPrices] = useState({ crypto: {}, forex: {}, commodity: {} });
    const [chartData, setChartData] = useState({}); // Store sparkline data for each asset
    const [priceChanges, setPriceChanges] = useState({});
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isLive, setIsLive] = useState(true);
    const intervalRef = useRef(null);
    const chartIntervalRef = useRef(null);

    const [formData, setFormData] = useState({
        assetType: 'Crypto',
        assetId: 'bitcoin',
        quantity: '',
        price: '',
        date: new Date().toISOString().slice(0, 10)
    });
    const [editingId, setEditingId] = useState(null);
    const [filterType, setFilterType] = useState('All');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Original theme colors
    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const inputBg = isDark ? '#1e1e1e' : '#ffffff';

    useEffect(() => {
        localStorage.setItem('pocketwall_markets_holdings', JSON.stringify(holdings));
    }, [holdings]);

    useEffect(() => {
        localStorage.setItem('pocketwall_markets_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    useEffect(() => {
        fetchPrices();
        fetchChartData();
    }, []);

    // Real-time price updates every 5 seconds
    useEffect(() => {
        if (activeView === 'watchlist' && isLive) {
            intervalRef.current = setInterval(() => fetchPrices(true), 5000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [activeView, isLive, watchlist]);

    // Chart data refresh every 60 seconds (to avoid API rate limits)
    useEffect(() => {
        if (activeView === 'watchlist' && isLive) {
            chartIntervalRef.current = setInterval(() => fetchChartData(), 60000);
        }
        return () => { if (chartIntervalRef.current) clearInterval(chartIntervalRef.current); };
    }, [activeView, isLive, watchlist]);

    // Fetch chart data when watchlist changes
    useEffect(() => {
        if (watchlist.length > 0) {
            fetchChartData();
        }
    }, [watchlist.length]);

    const fetchChartData = useCallback(async () => {
        // Only fetch for crypto assets (CoinGecko provides chart data)
        const cryptoItems = watchlist.filter(w => w.type === 'Crypto');
        if (cryptoItems.length === 0) return;

        const newChartData = { ...chartData };

        // Fetch chart data for each crypto (with rate limiting)
        for (let i = 0; i < cryptoItems.length; i++) {
            const item = cryptoItems[i];
            try {
                // Fetch 24h data with 1h intervals (24 points)
                const res = await fetch(`https://api.coingecko.com/api/v3/coins/${item.id}/market_chart?vs_currency=inr&days=1`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.prices && data.prices.length > 0) {
                        // Sample 24 points for sparkline
                        const prices = data.prices;
                        const step = Math.floor(prices.length / 24);
                        const sampledPrices = [];
                        for (let j = 0; j < prices.length; j += step) {
                            sampledPrices.push(prices[j][1]);
                        }
                        newChartData[`Crypto-${item.id}`] = sampledPrices;
                    }
                }
                // Small delay to avoid rate limiting
                if (i < cryptoItems.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (e) {
                console.error(`Failed to fetch chart for ${item.id}`);
            }
        }

        // Generate mock chart data for Forex and Commodities
        watchlist.filter(w => w.type !== 'Crypto').forEach(item => {
            const basePrice = getPrice(item.type, item.id);
            const mockData = [];
            for (let i = 0; i < 24; i++) {
                mockData.push(basePrice * (1 + (Math.random() - 0.5) * 0.02));
            }
            newChartData[`${item.type}-${item.id}`] = mockData;
        });

        setChartData(newChartData);
    }, [watchlist, chartData]);

    const fetchPrices = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const prevPrices = { ...prices };
            const cryptoIds = new Set(['bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana', 'ripple', 'cardano', 'dogecoin', 'polkadot', 'shiba-inu']);
            watchlist.filter(w => w.type === 'Crypto').forEach(w => cryptoIds.add(w.id));
            (holdings.entries || []).filter(e => e.assetType === 'Crypto').forEach(e => cryptoIds.add(e.assetId));

            const cryptoRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${Array.from(cryptoIds).join(',')}&vs_currencies=inr&include_24hr_change=true`);
            const cryptoData = await cryptoRes.json();

            const forexRes = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
            const forexData = await forexRes.json();

            const commodityPrices = {
                'gold': 7500 + (Math.random() - 0.5) * 30,
                'silver': 95 + (Math.random() - 0.5) * 1,
                'crude-oil': 6000 + (Math.random() - 0.5) * 50,
                'natural-gas': 270 + (Math.random() - 0.5) * 5,
                'platinum': 3200 + (Math.random() - 0.5) * 30,
                'copper': 750 + (Math.random() - 0.5) * 5
            };

            const newPrices = { crypto: cryptoData, forex: forexData.rates, commodity: commodityPrices };

            // Detect changes for animation
            const changes = {};
            watchlist.forEach(item => {
                const oldP = getPrice(item.type, item.id, prevPrices);
                const newP = getPrice(item.type, item.id, newPrices);
                if (oldP > 0 && newP !== oldP) {
                    changes[`${item.type}-${item.id}`] = newP > oldP ? 'up' : 'down';
                }
            });
            if (Object.keys(changes).length > 0) {
                setPriceChanges(changes);
                setTimeout(() => setPriceChanges({}), 1500);

                // Update chart data with new price point
                setChartData(prev => {
                    const updated = { ...prev };
                    watchlist.forEach(item => {
                        const key = `${item.type}-${item.id}`;
                        if (updated[key] && updated[key].length > 0) {
                            const newPrice = getPrice(item.type, item.id, newPrices);
                            updated[key] = [...updated[key].slice(1), newPrice];
                        }
                    });
                    return updated;
                });
            }

            setPrices(newPrices);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch prices');
        }
        if (!silent) setLoading(false);
    }, [watchlist, holdings, prices]);

    const getPrice = (type, id, priceData = prices) => {
        if (type === 'Crypto') return priceData.crypto?.[id]?.inr || 0;
        if (type === 'Forex') return priceData.forex?.[id] ? (1 / priceData.forex[id]) : 0;
        return priceData.commodity?.[id] || 0;
    };

    const get24hChange = (type, id) => type === 'Crypto' ? (prices.crypto?.[id]?.inr_24h_change || 0) : 0;

    const getAssetList = () => formData.assetType === 'Crypto' ? CRYPTO_LIST : formData.assetType === 'Forex' ? FOREX_LIST : COMMODITY_LIST;

    const getAssetInfo = (type, id) => {
        const list = type === 'Crypto' ? CRYPTO_LIST : type === 'Forex' ? FOREX_LIST : COMMODITY_LIST;
        return list.find(a => a.id === id) || { id, symbol: id.toUpperCase(), name: id, emoji: '📦' };
    };

    const getTypeColor = (type) => type === 'Crypto' ? '#f7931a' : type === 'Forex' ? '#10b981' : '#f59e0b';

    const handleCryptoSearch = async () => {
        if (!searchQuery || searchQuery.length < 2) return;
        setSearching(true);
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchQuery)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults((data.coins || []).slice(0, 8).map(c => ({ id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, emoji: '🪙' })));
            }
        } catch (e) { console.error('Search failed'); }
        setSearching(false);
    };

    const selectSearchResult = async (coin) => {
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=inr`);
            if (res.ok) {
                const data = await res.json();
                const price = data[coin.id]?.inr || 0;
                setFormData({ ...formData, assetId: coin.id, price: price.toString() });
                setPrices(prev => ({ ...prev, crypto: { ...prev.crypto, [coin.id]: { inr: price } } }));
            }
        } catch (e) { setFormData({ ...formData, assetId: coin.id }); }
        setSearchResults([]);
        setSearchQuery('');
        toast.success(`Selected: ${coin.name}`);
    };

    const handleAssetTypeChange = (type) => {
        const defaultAsset = type === 'Crypto' ? 'bitcoin' : type === 'Forex' ? 'USD' : 'gold';
        setFormData({ ...formData, assetType: type, assetId: defaultAsset, price: getPrice(type, defaultAsset).toFixed(2) });
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleAssetChange = (id) => setFormData({ ...formData, assetId: id, price: getPrice(formData.assetType, id).toFixed(2) });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.quantity || !formData.price) return toast.error('Enter quantity and price');
        const quantity = parseFloat(formData.quantity);
        const price = parseFloat(formData.price);
        if (isNaN(quantity) || quantity <= 0) return toast.error('Invalid quantity');

        const newEntry = { id: editingId || Date.now().toString(), assetType: formData.assetType, assetId: formData.assetId, quantity, price, invested: quantity * price, date: formData.date };
        setHoldings(prev => editingId ? { entries: prev.entries.map(e => e.id === editingId ? newEntry : e) } : { entries: [...prev.entries, newEntry] });
        toast.success(editingId ? 'Updated' : `Added ${quantity} ${getAssetInfo(formData.assetType, formData.assetId).symbol}`);
        resetForm();
    };

    const resetForm = () => {
        setFormData({ assetType: 'Crypto', assetId: 'bitcoin', quantity: '', price: '', date: new Date().toISOString().slice(0, 10) });
        setEditingId(null);
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleEdit = (entry) => {
        setFormData({ assetType: entry.assetType, assetId: entry.assetId, quantity: entry.quantity.toString(), price: entry.price.toString(), date: entry.date });
        setEditingId(entry.id);
        setActiveView('holdings');
    };

    const handleDelete = (id) => {
        if (!confirm('Delete?')) return;
        setHoldings(prev => ({ entries: prev.entries.filter(e => e.id !== id) }));
        toast.success('Deleted');
    };

    const addToWatchlist = async (type, id) => {
        if (watchlist.find(w => w.type === type && w.id === id)) { toast.info('Already added'); return; }
        const asset = getAssetInfo(type, id);
        setWatchlist(prev => [...prev, { type, id, symbol: asset.symbol, name: asset.name, emoji: asset.emoji }]);
        toast.success(`${asset.symbol} added`);
        setSearchResults([]);
        setSearchQuery('');
        if (type === 'Crypto') {
            try {
                const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=inr&include_24hr_change=true`);
                if (res.ok) { const data = await res.json(); setPrices(prev => ({ ...prev, crypto: { ...prev.crypto, ...data } })); }
            } catch (e) { }
        }
    };

    const removeFromWatchlist = (type, id) => {
        setWatchlist(prev => prev.filter(w => !(w.type === type && w.id === id)));
        setChartData(prev => {
            const updated = { ...prev };
            delete updated[`${type}-${id}`];
            return updated;
        });
        toast.success('Removed');
    };

    const isInWatchlist = (type, id) => watchlist.some(w => w.type === type && w.id === id);

    const getFilteredEntries = () => { const e = holdings.entries || []; return filterType === 'All' ? e : e.filter(x => x.assetType === filterType); };

    const getTotalByType = (type) => {
        const entries = (holdings.entries || []).filter(e => type === 'All' || e.assetType === type);
        const invested = entries.reduce((s, e) => s + (e.invested || 0), 0);
        const value = entries.reduce((s, e) => s + (e.quantity * getPrice(e.assetType, e.assetId)), 0);
        return { invested, value, pnl: value - invested };
    };

    const formatMoney = (a) => `₹${a.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const formatChange = (c) => `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`;
    const totals = getTotalByType(filterType);
    const getUnit = (type, id) => type === 'Commodity' ? (COMMODITY_LIST.find(x => x.id === id)?.unit || '') : '';

    return (
        <div className="h-full p-4 overflow-auto" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI' }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold" style={{ color: textColor }}>📊 Markets</h2>
                <div className="flex items-center gap-3">
                    <button onClick={() => fetchPrices()} disabled={loading} className="px-3 py-1 text-sm border rounded" style={{ backgroundColor: '#0078d4', color: '#fff' }}>
                        {loading ? '⏳' : '🔄'} Refresh
                    </button>
                    <button onClick={() => setActiveTab?.('watchlist')} className="px-3 py-1 text-sm border rounded"
                        style={{ backgroundColor: isDark ? '#3e3e42' : '#e0e0e0', color: textColor, borderColor }}>
                        👁️ Go to Watchlist →
                    </button>
                </div>
            </div>


            {/* ===================== HOLDINGS VIEW ===================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Add/Edit Form */}
                <div className="md:col-span-1">
                    <div className="p-4 rounded border shadow-sm sticky top-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="font-semibold mb-4" style={{ color: textColor }}>{editingId ? 'Edit Transaction' : 'Add New Transaction'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Asset Type</label>
                                <select value={formData.assetType} onChange={(e) => handleAssetTypeChange(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border rounded" style={{ backgroundColor: inputBg, color: textColor, borderColor }}>
                                    <option value="Crypto">🪙 Crypto</option>
                                    <option value="Forex">💱 Forex</option>
                                    <option value="Commodity">🛢️ Commodity</option>
                                </select>
                            </div>
                            {formData.assetType === 'Crypto' && (
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Search Crypto</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCryptoSearch())}
                                            placeholder="Type to search..." className="w-full px-2 py-1.5 text-sm border rounded" style={{ backgroundColor: inputBg, color: textColor, borderColor }} />
                                        <button type="button" onClick={handleCryptoSearch} className="px-3 py-1 text-sm rounded" style={{ backgroundColor: '#f7931a', color: '#fff' }}>
                                            {searching ? '...' : '🔍'}
                                        </button>
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="mt-1 border rounded max-h-32 overflow-auto" style={{ backgroundColor: panelBg, borderColor }}>
                                            {searchResults.map(coin => (
                                                <button key={coin.id} type="button" onClick={() => selectSearchResult(coin)}
                                                    className="w-full text-left px-2 py-1 text-sm hover:bg-opacity-10 hover:bg-gray-500" style={{ color: textColor }}>
                                                    {coin.emoji} {coin.symbol} - {coin.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>
                                    {formData.assetType === 'Crypto' ? 'Select Crypto' : formData.assetType === 'Forex' ? 'Select Currency' : 'Select Commodity'}
                                </label>
                                <select value={formData.assetId} onChange={(e) => handleAssetChange(e.target.value)}
                                    className="w-full px-2 py-1.5 text-sm border rounded" style={{ backgroundColor: inputBg, color: textColor, borderColor }}>
                                    {getAssetList().map(a => <option key={a.id} value={a.id}>{a.emoji} {a.symbol} - {a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Date</label>
                                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-2 py-1.5 text-sm border rounded" style={{ backgroundColor: inputBg, color: textColor, borderColor }} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Quantity {getUnit(formData.assetType, formData.assetId) && `(${getUnit(formData.assetType, formData.assetId)})`}</label>
                                    <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} placeholder="0" step="any"
                                        className="w-full px-2 py-1.5 text-sm border rounded" style={{ backgroundColor: inputBg, color: textColor, borderColor }} />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Price (₹)</label>
                                    <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" step="any"
                                        className="w-full px-2 py-1.5 text-sm border rounded" style={{ backgroundColor: inputBg, color: textColor, borderColor }} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Total (INR)</label>
                                <div className="px-2 py-1.5 text-sm border rounded bg-opacity-10 bg-gray-500" style={{ color: textColor, borderColor }}>
                                    <span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0))}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="submit" className="flex-1 py-2 text-sm font-semibold text-white rounded" style={{ backgroundColor: editingId ? '#0078d4' : getTypeColor(formData.assetType) }}>
                                    {editingId ? 'Update' : '+ Add'}
                                </button>
                                {editingId && <button type="button" onClick={resetForm} className="px-4 py-2 text-sm border rounded" style={{ backgroundColor: panelBg, color: textColor, borderColor }}>Cancel</button>}
                            </div>
                        </form>
                        <div className="mt-4 pt-4 border-t text-xs space-y-1" style={{ borderColor }}>
                            <div className="flex justify-between"><span style={{ color: textColor, opacity: 0.7 }}>🪙 Crypto:</span><span style={{ color: '#f7931a' }} className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(getTotalByType('Crypto').value)}</span></div>
                            <div className="flex justify-between"><span style={{ color: textColor, opacity: 0.7 }}>💱 Forex:</span><span style={{ color: '#10b981' }} className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(getTotalByType('Forex').value)}</span></div>
                            <div className="flex justify-between"><span style={{ color: textColor, opacity: 0.7 }}>🛢️ Commodities:</span><span style={{ color: '#f59e0b' }} className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(getTotalByType('Commodity').value)}</span></div>
                        </div>
                    </div>
                </div>

                {/* Holdings Table */}
                <div className="md:col-span-2">
                    <div className="p-4 rounded border shadow-sm h-full overflow-hidden flex flex-col" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold" style={{ color: textColor }}>Transactions</h3>
                                <div className="flex rounded border overflow-hidden" style={{ borderColor }}>
                                    {['All', 'Crypto', 'Forex', 'Commodity'].map(t => (
                                        <button key={t} onClick={() => setFilterType(t)} className={`px-2 py-1 text-xs ${filterType === t ? 'font-bold' : ''}`}
                                            style={{ backgroundColor: filterType === t ? (isDark ? '#3e3e42' : '#e0e0e0') : 'transparent', color: t === 'All' ? textColor : getTypeColor(t) }}>{t}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-4 text-sm">
                                <span style={{ color: textColor }}>Invested: <strong className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(totals.invested)}</strong></span>
                                <span className="text-blue-500">Value: <strong className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(totals.value)}</strong></span>
                                <span className={totals.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>P&L: <strong className={isPrivacyMode ? 'privacy-blur' : ''}>{totals.pnl >= 0 ? '+' : ''}{formatMoney(totals.pnl)}</strong></span>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="border-b" style={{ borderColor }}>
                                    <tr style={{ color: textColor, opacity: 0.7 }}>
                                        <th className="p-2">Date</th><th className="p-2">Asset</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Buy</th>
                                        <th className="p-2 text-right">Current</th><th className="p-2 text-right">Value</th><th className="p-2 text-right">P&L</th><th className="p-2 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getFilteredEntries().length === 0 ? (
                                        <tr><td colSpan="8" className="p-8 text-center opacity-50" style={{ color: textColor }}>No transactions</td></tr>
                                    ) : getFilteredEntries().sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => {
                                        const asset = getAssetInfo(entry.assetType, entry.assetId);
                                        const currentPrice = getPrice(entry.assetType, entry.assetId);
                                        const currentValue = entry.quantity * currentPrice;
                                        const pnl = currentValue - entry.invested;
                                        const pnlPercent = entry.invested > 0 ? (pnl / entry.invested) * 100 : 0;
                                        const unit = getUnit(entry.assetType, entry.assetId);
                                        return (
                                            <tr key={entry.id} className="border-b hover:bg-opacity-5 hover:bg-gray-500" style={{ borderColor }}>
                                                <td className="p-2" style={{ color: textColor }}>{new Date(entry.date).toLocaleDateString()}</td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{asset.emoji}</span>
                                                        <div>
                                                            <div className="font-medium" style={{ color: getTypeColor(entry.assetType) }}>{asset.symbol}</div>
                                                            <div className="text-xs opacity-50" style={{ color: textColor }}>{entry.assetType}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right" style={{ color: textColor }}><span className={isPrivacyMode ? 'privacy-blur' : ''}>{entry.quantity}{unit ? ` ${unit}` : ''}</span></td>
                                                <td className="p-2 text-right" style={{ color: textColor }}><span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(entry.price)}</span></td>
                                                <td className="p-2 text-right" style={{ color: getTypeColor(entry.assetType) }}>{formatMoney(currentPrice)}</td>
                                                <td className="p-2 text-right font-medium" style={{ color: textColor }}><span className={isPrivacyMode ? 'privacy-blur' : ''}>{formatMoney(currentValue)}</span></td>
                                                <td className={`p-2 text-right font-medium ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                                                        {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}<div className="text-xs">({pnlPercent.toFixed(1)}%)</div>
                                                    </span>
                                                </td>
                                                <td className="p-2 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={() => handleEdit(entry)} className="text-xs px-2 py-1 border rounded hover:bg-opacity-10 hover:bg-blue-500" style={{ color: '#0078d4', borderColor: '#0078d4' }}>Edit</button>
                                                        <button onClick={() => handleDelete(entry.id)} className="text-xs text-red-500 px-2 py-1 border border-red-300 rounded hover:bg-red-50">Del</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {getFilteredEntries().length > 0 && (
                                    <tfoot>
                                        <tr className="font-bold border-t" style={{ backgroundColor: isDark ? '#333' : '#eee' }}>
                                            <td colSpan={5} className="p-2 text-right" style={{ color: textColor }}>Total</td>
                                            <td className="p-2 text-right" style={{ color: textColor }}>{formatMoney(totals.value)}</td>
                                            <td className={`p-2 text-right ${totals.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{totals.pnl >= 0 ? '+' : ''}{formatMoney(totals.pnl)}</td>
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

export default Markets;
