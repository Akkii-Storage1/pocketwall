import React, { useState, useEffect } from 'react';
import cryptoApi, { POPULAR_CRYPTO_IDS } from '../utils/cryptoApi';
import { useToast } from '../components/Toast';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';

const Crypto = ({ isDark, isPrivacyMode }) => {
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [watchlist, setWatchlist] = useState(() => {
        const saved = localStorage.getItem('pocketwall_crypto_watchlist');
        return saved ? JSON.parse(saved) : Object.values(POPULAR_CRYPTO_IDS);
    });
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);
    const [currency, setCurrency] = useState('INR');

    // Holdings now track quantity AND avgBuyPrice
    const [holdings, setHoldings] = useState(() => {
        const saved = localStorage.getItem('pocketwall_crypto_holdings');
        return saved ? JSON.parse(saved) : {};
    });

    const [showBuyModal, setShowBuyModal] = useState(null); // Coin ID to buy
    const [buyForm, setBuyForm] = useState({ quantity: '', price: '' });

    const [editingCoin, setEditingCoin] = useState(null);
    const [editForm, setEditForm] = useState({ quantity: '', avgPrice: '' });

    const bgColor = isDark ? '#1e1e1e' : '#f8f9fa';
    const cardBg = isDark ? '#2d2d30' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#e9ecef';
    const accentColor = '#f7931a'; // Bitcoin Orange

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (currency) {
            fetchPrices();
            const interval = setInterval(fetchPrices, 60000); // Update every minute
            return () => clearInterval(interval);
        }
    }, [watchlist, currency]);

    useEffect(() => {
        localStorage.setItem('pocketwall_crypto_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    useEffect(() => {
        localStorage.setItem('pocketwall_crypto_holdings', JSON.stringify(holdings));
    }, [holdings]);

    const loadSettings = async () => {
        const settings = await DataAdapter.getUserSettings();
        if (settings && settings.defaultCurrency) {
            setCurrency(settings.defaultCurrency);
        }
    };

    const fetchPrices = async () => {
        if (watchlist.length === 0) return;
        try {
            // We fetch in INR (base) or USD depending on API support, but here we assume API supports currency param
            // or we convert. cryptoApi usually takes currency.
            // If cryptoApi supports dynamic currency, pass it. 
            // Assuming cryptoApi.getMultipleCryptoPrices takes currency code (lowercase)
            const currencyCode = currency.toLowerCase();
            console.log('Fetching prices for:', watchlist, 'in', currencyCode);
            const data = await cryptoApi.getMultipleCryptoPrices(watchlist, currencyCode);

            // If API returns in requested currency, great. 
            // If API defaults to INR/USD, we might need conversion. 
            // For now assuming cryptoApi handles it or returns base values we can convert.
            // Actually, Coingecko API (likely used) supports vs_currency.

            setPrices(data);
        } catch (error) {
            console.error('Failed to fetch crypto prices', error);
            toast.error('Could not update crypto prices');
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm) return;
        setLoading(true);
        try {
            const results = await cryptoApi.searchCrypto(searchTerm);
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed', error);
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const addToWatchlist = (coinId) => {
        if (!watchlist.includes(coinId)) {
            setWatchlist([...watchlist, coinId]);
            setSearchResults([]);
            setSearchTerm('');
            toast.success('Added to watchlist');
        }
    };

    const removeFromWatchlist = (coinId) => {
        setWatchlist(watchlist.filter(id => id !== coinId));
        toast.success('Removed from watchlist');
    };

    const handleBuyClick = async (coinId) => {
        let currentPrice = 0;

        if (prices[coinId]) {
            currentPrice = prices[coinId].price;
        } else {
            // Fetch price if not in watchlist/cache
            try {
                const data = await cryptoApi.getMultipleCryptoPrices([coinId], currency.toLowerCase());
                if (data && data[coinId]) {
                    currentPrice = data[coinId].price;
                    // Update local prices state so we don't fetch again immediately
                    setPrices(prev => ({ ...prev, [coinId]: data[coinId] }));
                }
            } catch (error) {
                console.error("Failed to fetch price for buy:", error);
                toast.error("Could not fetch latest price. Please enter manually.");
            }
        }

        setBuyForm({ quantity: '', price: currentPrice });
        setShowBuyModal(coinId);
    };

    const confirmBuy = () => {
        if (!buyForm.quantity || !buyForm.price) {
            toast.error('Please enter quantity and price');
            return;
        }

        const qty = parseFloat(buyForm.quantity);
        const price = parseFloat(buyForm.price);
        const coinId = showBuyModal;

        if (isNaN(qty) || qty <= 0 || isNaN(price) || price < 0) {
            toast.error('Invalid values');
            return;
        }

        setHoldings(prev => {
            const current = prev[coinId] || { quantity: 0, avgPrice: 0, invested: 0 };
            // Handle legacy format where it might just be a number
            const currentQty = typeof current === 'number' ? current : (current.quantity || 0);

            // Legacy invested amount is likely in INR. If we are now in USD, we have a problem mixing currencies.
            // Ideally, we should store everything in a BASE currency (e.g. INR) and convert on display.
            // OR store with currency metadata.
            // For now, assuming user sticks to one currency or we just sum up raw values (which is flawed but standard for simple apps).
            // BETTER: Convert input price to INR (Base) before storing if we want consistency?
            // BUT user expects to see what they entered.
            // Let's assume for now we store in the currency they bought in, or just raw numbers.
            // If we want to support switching, we should probably store everything in Base (INR) and convert display.
            // But 'invested' is historical. 

            // If the user is entering in USD, and we store it, then 'invested' is in USD.
            // If they switch back to INR, 'invested' will be treated as INR if we don't track currency.
            // For this fix, we will assume the user wants to see values in their selected currency.
            // If they switch currency, historical 'invested' number won't auto-convert unless we know its original currency.
            // Given the constraints, we will just display what is stored, but formatted with the selected symbol.
            // Wait, if they switch to USD, they expect 50000 INR invested to show as ~600 USD.
            // So we MUST convert historical 'invested' (assumed INR) to current currency.

            // STRATEGY: Assume stored 'invested' is always in INR (Base).
            // When buying in USD, convert to INR before storing.
            // When displaying, convert INR to USD.

            // However, 'price' in buyForm is in 'currency'.
            // So: Invested (INR) = Qty * Price (Currency) / Rate (Currency->INR)
            // Rate (Currency->INR) = 1 / Rate (INR->Currency)

            const rate = currency === 'INR' ? 1 : (1 / CurrencyConverter.convert(1, 'INR', currency));
            const investedInINR = (qty * price) * rate;

            const currentInvestedINR = typeof current === 'number' ? 0 : (current.invested || 0); // Assumed INR

            const newQty = currentQty + qty;
            const newInvestedINR = currentInvestedINR + investedInINR;
            const newAvgPriceINR = newInvestedINR / newQty;

            return {
                ...prev,
                [coinId]: {
                    quantity: newQty,
                    avgPrice: newAvgPriceINR, // Stored in INR
                    invested: newInvestedINR  // Stored in INR
                }
            };
        });

        toast.success(`Bought ${qty} ${coinId}`);
        setShowBuyModal(null);
    };

    const handleEditClick = (coinId, data) => {
        const quantity = typeof data === 'number' ? data : (data.quantity || 0);
        // avgPrice is stored in INR. Convert to current currency for editing.
        const avgPriceINR = typeof data === 'number' ? 0 : (data.avgPrice || 0);
        const avgPriceDisplay = CurrencyConverter.convert(avgPriceINR, 'INR', currency);

        setEditForm({
            quantity: quantity.toString(),
            avgPrice: avgPriceDisplay.toString()
        });
        setEditingCoin(coinId);
    };

    const confirmEdit = () => {
        if (!editForm.quantity || !editForm.avgPrice) {
            toast.error('Please enter quantity and average price');
            return;
        }

        const qty = parseFloat(editForm.quantity);
        const avgPriceDisplay = parseFloat(editForm.avgPrice);
        const coinId = editingCoin;

        if (isNaN(qty) || qty < 0 || isNaN(avgPriceDisplay) || avgPriceDisplay < 0) {
            toast.error('Invalid values');
            return;
        }

        if (qty === 0) {
            // If quantity is 0, remove the holding
            const newHoldings = { ...holdings };
            delete newHoldings[coinId];
            setHoldings(newHoldings);
            toast.success('Removed ' + coinId);
        } else {
            // Convert edited price back to INR for storage
            const rate = currency === 'INR' ? 1 : (1 / CurrencyConverter.convert(1, 'INR', currency));
            const avgPriceINR = avgPriceDisplay * rate;

            setHoldings(prev => ({
                ...prev,
                [coinId]: {
                    quantity: qty,
                    avgPrice: avgPriceINR,
                    invested: qty * avgPriceINR
                }
            }));
            toast.success('Updated ' + coinId);
        }

        setEditingCoin(null);
    };

    const getTotalValue = () => {
        return Object.entries(holdings).reduce((total, [coinId, data]) => {
            const qty = typeof data === 'number' ? data : (data.quantity || 0);
            const priceData = prices[coinId];
            const price = priceData ? (priceData.price || 0) : 0; // Price is in 'currency'
            return total + (qty * price);
        }, 0);
    };

    const getTotalInvested = () => {
        // Sum invested amounts (stored in INR), then convert to display currency
        const totalInvestedINR = Object.values(holdings).reduce((total, data) => {
            return total + (typeof data === 'number' ? 0 : (data.invested || 0));
        }, 0);

        return CurrencyConverter.convert(totalInvestedINR, 'INR', currency);
    };

    const formatMoney = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    return (
        <div className="h-full overflow-hidden flex flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Header */}
            <div className="p-6 pb-0">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <span className="text-yellow-500 text-4xl">₿</span> Crypto Market
                        </h1>
                        <p className="opacity-70">Track and manage your digital assets</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right p-4 rounded-xl bg-gray-800 text-white shadow-lg border border-gray-700">
                            <div className="text-sm opacity-70">Total Invested</div>
                            <div className={`text-xl font-bold ${isPrivacyMode ? 'blur-sm' : ''}`}>
                                {formatMoney(getTotalInvested())}
                            </div>
                        </div>
                        <div className="text-right p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-lg">
                            <div className="text-sm opacity-90">Current Value</div>
                            <div className={`text-3xl font-bold ${isPrivacyMode ? 'blur-sm' : ''}`}>
                                {formatMoney(getTotalValue())}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-6 p-6 pt-0">
                {/* Left Column: Market & Watchlist */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* Search */}
                    <div className="p-4 rounded-xl shadow-md" style={{ backgroundColor: cardBg }}>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search coins (e.g., Bitcoin, Solana)..."
                                className="flex-1 p-3 rounded-lg border bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ borderColor, color: textColor }}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                            >
                                {loading ? '...' : 'Search'}
                            </button>
                        </form>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg" style={{ borderColor }}>
                                {searchResults.map(coin => (
                                    <div
                                        key={coin.id}
                                        className="p-3 border-b last:border-0 flex justify-between items-center hover:bg-opacity-10 hover:bg-blue-500 cursor-pointer transition-colors"
                                        style={{ borderColor }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <img src={coin.thumb} alt={coin.name} className="w-8 h-8 rounded-full" />
                                            <div>
                                                <div className="font-bold">{coin.name}</div>
                                                <div className="text-xs opacity-70">{coin.symbol}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => addToWatchlist(coin.id)}
                                                className="px-3 py-1 text-xs border border-blue-500 text-blue-500 rounded hover:bg-blue-500 hover:text-white transition-colors"
                                            >
                                                + Watch
                                            </button>
                                            <button
                                                onClick={() => handleBuyClick(coin.id)}
                                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                            >
                                                Buy
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Watchlist Grid */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        <h3 className="font-bold text-xl mb-4 sticky top-0 bg-opacity-90 backdrop-blur-sm py-2 z-10" style={{ backgroundColor: bgColor }}>Watchlist</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {watchlist.map(coinId => {
                                const priceData = prices[coinId] || { price: 0, change: 0 };
                                const currentPrice = priceData.price;
                                const change = priceData.change;

                                return (
                                    <div key={coinId} className="p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow relative group" style={{ backgroundColor: cardBg, borderColor }}>
                                        <button
                                            onClick={() => removeFromWatchlist(coinId)}
                                            className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                        >
                                            ✕
                                        </button>

                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-lg capitalize">{coinId.replace(/-/g, ' ')}</h4>
                                            <div className={`text-sm font-mono ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                                            </div>
                                        </div>

                                        <div className="text-2xl font-bold mb-4 sensitive-amount">
                                            {formatMoney(currentPrice || 0)}
                                        </div>

                                        <button
                                            onClick={() => handleBuyClick(coinId)}
                                            className="w-full py-2 bg-opacity-10 bg-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-semibold rounded-lg transition-colors"
                                        >
                                            Buy / Add
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Portfolio Holdings */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <div className="flex-1 p-6 rounded-xl shadow-lg flex flex-col" style={{ backgroundColor: cardBg }}>
                        <h3 className="font-bold text-xl mb-4">Your Holdings</h3>

                        {Object.keys(holdings).length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-50 text-center">
                                <div className="text-5xl mb-4">👛</div>
                                <p>Your crypto wallet is empty.</p>
                                <p className="text-sm">Buy coins from the watchlist to see them here.</p>
                            </div>
                        ) : (<>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {Object.entries(holdings).map(([coinId, data]) => {
                                    // Handle legacy data format (just number) vs new object format
                                    const quantity = typeof data === 'number' ? data : (data.quantity || 0);
                                    const investedINR = typeof data === 'number' ? 0 : (data.invested || 0);
                                    const avgPriceINR = typeof data === 'number' ? 0 : (data.avgPrice || 0);

                                    // Convert for display
                                    const investedDisplay = CurrencyConverter.convert(investedINR, 'INR', currency);
                                    const avgPriceDisplay = CurrencyConverter.convert(avgPriceINR, 'INR', currency);

                                    const priceData = prices[coinId];
                                    const currentPrice = priceData ? (priceData.price || 0) : 0; // In selected currency
                                    const currentValue = quantity * currentPrice;
                                    const pnl = currentValue - investedDisplay;
                                    const pnlPercent = investedDisplay > 0 ? (pnl / investedDisplay) * 100 : 0;

                                    return (
                                        <div key={coinId} className="p-4 rounded-lg border bg-opacity-50" style={{ borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8f9fa' }}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-bold capitalize">{coinId.replace(/-/g, ' ')}</div>
                                                <div className={`font-bold ${isPrivacyMode ? 'blur-sm' : ''}`}>{formatMoney(currentValue)}</div>
                                            </div>
                                            <div className="flex justify-between text-sm opacity-70 mb-2">
                                                <span>{quantity} coins</span>
                                                <span>Avg: {formatMoney(avgPriceDisplay)}</span>
                                            </div>

                                            {investedDisplay > 0 && (
                                                <div className={`text-xs font-bold flex justify-between pt-2 border-t ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`} style={{ borderColor }}>
                                                    <span>PnL: {pnl >= 0 ? '+' : ''}{formatMoney(pnl)}</span>
                                                    <span>{pnl >= 0 ? '▲' : '▼'} {Math.abs(pnlPercent).toFixed(2)}%</span>
                                                </div>
                                            )}

                                            <div className="mt-3 flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditClick(coinId, data)}
                                                    className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 border border-blue-500 rounded hover:bg-blue-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Sell all ${coinId}?`)) {
                                                            const newHoldings = { ...holdings };
                                                            delete newHoldings[coinId];
                                                            setHoldings(newHoldings);
                                                            toast.success('Sold all ' + coinId);
                                                        }
                                                    }}
                                                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-500 rounded hover:bg-red-50 transition-colors"
                                                >
                                                    Sell All
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-4 pt-4 border-t" style={{ borderColor }}>
                                <div className="flex justify-between items-center font-bold">
                                    <span>Total Portfolio</span>
                                    <span>{formatMoney(getTotalValue())}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm opacity-70 mt-1">
                                    <span>Invested</span>
                                    <span>{formatMoney(getTotalInvested())}</span>
                                </div>
                                <div className={`flex justify-between items-center text-sm font-bold mt-1 ${getTotalValue() - getTotalInvested() >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    <span>PnL</span>
                                    <span>{getTotalValue() - getTotalInvested() >= 0 ? '+' : ''}{formatMoney(getTotalValue() - getTotalInvested())}</span>
                                </div>
                            </div>
                        </>
                        )}
                    </div>
                </div>
            </div>

            {/* Buy Modal */}
            {
                showBuyModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
                        <div className="w-full max-w-sm p-6 rounded-2xl shadow-2xl transform transition-all scale-100" style={{ backgroundColor: cardBg }}>
                            <h3 className="text-2xl font-bold mb-1 capitalize">Buy {showBuyModal.replace(/-/g, ' ')}</h3>
                            <p className="text-sm opacity-60 mb-6">Add to your portfolio</p>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        value={buyForm.quantity}
                                        onChange={(e) => setBuyForm({ ...buyForm, quantity: e.target.value })}
                                        className="w-full p-3 rounded-lg border text-lg font-mono"
                                        style={{ backgroundColor: bgColor, borderColor, color: textColor }}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">Price per Coin ({currency})</label>
                                    <input
                                        type="number"
                                        value={buyForm.price}
                                        onChange={(e) => setBuyForm({ ...buyForm, price: e.target.value })}
                                        className="w-full p-3 rounded-lg border text-lg font-mono"
                                        style={{ backgroundColor: bgColor, borderColor, color: textColor }}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="p-3 rounded bg-blue-500 bg-opacity-10 text-blue-500 flex justify-between font-bold">
                                    <span>Total</span>
                                    <span>{formatMoney((parseFloat(buyForm.quantity) || 0) * (parseFloat(buyForm.price) || 0))}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBuyModal(null)}
                                    className="flex-1 py-3 font-bold rounded-lg border hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
                                    style={{ borderColor, color: textColor }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmBuy}
                                    className="flex-1 py-3 font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                                >
                                    Confirm Buy
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                editingCoin && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
                        <div className="w-full max-w-sm p-6 rounded-2xl shadow-2xl transform transition-all scale-100" style={{ backgroundColor: cardBg }}>
                            <h3 className="text-2xl font-bold mb-1 capitalize">Edit {editingCoin.replace(/-/g, ' ')}</h3>
                            <p className="text-sm opacity-60 mb-6">Update holding details</p>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">Total Quantity</label>
                                    <input
                                        type="number"
                                        value={editForm.quantity}
                                        onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                                        className="w-full p-3 rounded-lg border text-lg font-mono"
                                        style={{ backgroundColor: bgColor, borderColor, color: textColor }}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase opacity-70 mb-1">Average Buy Price ({currency})</label>
                                    <input
                                        type="number"
                                        value={editForm.avgPrice}
                                        onChange={(e) => setEditForm({ ...editForm, avgPrice: e.target.value })}
                                        className="w-full p-3 rounded-lg border text-lg font-mono"
                                        style={{ backgroundColor: bgColor, borderColor, color: textColor }}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="p-3 rounded bg-blue-500 bg-opacity-10 text-blue-500 flex justify-between font-bold">
                                    <span>Total Invested</span>
                                    <span>{formatMoney((parseFloat(editForm.quantity) || 0) * (parseFloat(editForm.avgPrice) || 0))}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditingCoin(null)}
                                    className="flex-1 py-3 font-bold rounded-lg border hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
                                    style={{ borderColor, color: textColor }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmEdit}
                                    className="flex-1 py-3 font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Crypto;
