
import React, { useState, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import stockApi from '../utils/stockApi';
import CurrencyConverter from '../utils/CurrencyConverter';
import cryptoApi from '../utils/cryptoApi';
import PieChart from '../components/PieChart';
import { useToast } from '../components/Toast';
import ShareButton from '../components/ShareButton';
import FeatureGate from '../components/FeatureGate';
import PortfolioInsightsModal from '../components/PortfolioInsightsModal';
import { formatDate } from '../utils/DateFormatter';

const Portfolio = ({ isDark, currency: globalCurrency }) => {
    const [holdings, setHoldings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currency, setCurrency] = useState(globalCurrency || 'INR');
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedStock, setSelectedStock] = useState(null);
    const [marketData, setMarketData] = useState([]);
    const [allocationData, setAllocationData] = useState([]);
    const [bestWorst, setBestWorst] = useState({ best: null, worst: null });
    const [showInsightsModal, setShowInsightsModal] = useState(false);
    const toast = useToast();

    const textColor = isDark ? '#ffffff' : '#000000';
    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';

    const [sortConfig, setSortConfig] = useState({ key: 'currentValue', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({
        'US': true,
        'Indian': true,
        'Crypto': true,
        'Forex': true,
        'Commodity': true,
        'Mutual Fund': true,
        'Fixed Asset': true
    });

    // Asset Type Filter State (Dropdown Multi-Select)
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const PORTFOLIO_CATEGORIES = [
        { id: 'Indian', label: '🇮🇳 Indian Stocks', emoji: '🇮🇳' },
        { id: 'US', label: '🇺🇸 US Stocks', emoji: '🇺🇸' },
        { id: 'Mutual Fund', label: '📊 Mutual Funds', emoji: '📊' },
        { id: 'Crypto', label: '₿ Crypto', emoji: '₿' },
        { id: 'Forex', label: '💱 Forex', emoji: '💱' },
        { id: 'Commodity', label: '🥇 Commodities', emoji: '🥇' },
        { id: 'Fixed Asset', label: '🏠 Fixed Assets', emoji: '🏠' }
    ];
    const [assetFilter, setAssetFilter] = useState(PORTFOLIO_CATEGORIES.map(c => c.id)); // All selected by default

    // Helper to get category for a holding
    const getHoldingCategory = (h) => {
        if (h.assetClass === 'Crypto' || h.exchange === 'Crypto') return 'Crypto';
        if (h.assetClass === 'Mutual Fund' || h.exchange === 'MF') return 'Mutual Fund';
        if (h.assetClass === 'Fixed Asset' || h.exchange === 'Fixed Asset') return 'Fixed Asset';
        if (h.assetClass === 'Forex' || h.exchange === 'Forex') return 'Forex';
        if (h.assetClass === 'Commodity' || h.exchange === 'Commodity') return 'Commodity';
        if (h.exchange === 'US' || h.exchange === 'NYSE' || h.exchange === 'NASDAQ') return 'US';
        return 'Indian'; // Default to Indian stocks
    };

    // Filter holdings based on selected categories
    const getFilteredHoldings = () => {
        if (assetFilter.length === 0) return [];
        return holdings.filter(h => assetFilter.includes(getHoldingCategory(h)));
    };

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortHoldings = (items) => {
        return [...items].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Handle strings
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    useEffect(() => {
        loadPortfolio();
    }, []);

    useEffect(() => {
        let interval;
        if (autoRefresh) {
            interval = setInterval(() => refreshPrices(), 30000);
        }
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const loadPortfolio = async () => {
        setLoading(true);
        try {
            const settings = await DataAdapter.getUserSettings();
            setCurrency(settings.defaultCurrency || 'INR');

            // 1. Load Stocks & ETFs
            let stockHoldings = [];
            try {
                const investments = await DataAdapter.getInvestments();
                if (investments && investments.length > 0) {
                    const grouped = {};
                    investments.forEach(inv => {
                        const key = `${inv.symbol}_${inv.exchange || 'NSE'}`;
                        if (!grouped[key]) {
                            grouped[key] = {
                                symbol: inv.symbol,
                                name: inv.name,
                                exchange: inv.exchange || 'NSE',
                                assetClass: inv.assetClass || 'Stock',
                                quantity: 0,
                                totalInvested: 0,
                                purchases: []
                            };
                        }
                        grouped[key].quantity += parseFloat(inv.quantity);
                        grouped[key].totalInvested += parseFloat(inv.quantity) * parseFloat(inv.buyPrice || inv.pricePerShare);
                        grouped[key].purchases.push(inv);
                    });

                    const holdingsArray = Object.values(grouped);
                    stockHoldings = await Promise.all(
                        holdingsArray.map(async (holding) => {
                            try {
                                // Try to load from DB first
                                let storedPrice = await DataAdapter.getStoredPrice(holding.symbol, holding.exchange);
                                let priceData = null;

                                // If manual price exists, use it and skip API
                                if (storedPrice && storedPrice.isManual) {
                                    priceData = storedPrice;
                                } else {
                                    // Otherwise try API
                                    try {
                                        if (holding.assetClass === 'Mutual Fund') {
                                            const navData = await stockApi.fetchMutualFundNAV(holding.symbol);
                                            if (navData) {
                                                priceData = {
                                                    currentPrice: parseFloat(navData.nav),
                                                    dayChange: navData.dayChange || 0,
                                                    dayChangePercent: navData.dayChangePercent || 0,
                                                    timestamp: new Date(navData.date).getTime(),
                                                    isStale: false
                                                };
                                            }
                                        } else {
                                            priceData = await stockApi.fetchStockPrice(holding.symbol, holding.exchange);
                                        }
                                    } catch (e) {
                                        console.warn(`Failed to fetch price for ${holding.symbol}`, e);
                                    }

                                    if (priceData) {
                                        await DataAdapter.saveStoredPrice(holding.symbol, holding.exchange, priceData);
                                    } else {
                                        // Fallback to stored price if API fails
                                        priceData = storedPrice;
                                    }
                                }

                                // Fallback if no data available at all
                                if (!priceData) {
                                    priceData = {
                                        currentPrice: 0,
                                        dayChange: 0,
                                        dayChangePercent: 0,
                                        timestamp: Date.now(),
                                        isStale: true,
                                        noData: true
                                    };
                                }

                                const avgBuyPrice = holding.totalInvested / holding.quantity;
                                const currentValue = holding.quantity * priceData.currentPrice;
                                const profitLoss = currentValue - holding.totalInvested;
                                const profitLossPercent = holding.totalInvested > 0 ? (profitLoss / holding.totalInvested) * 100 : 0;

                                return {
                                    ...holding,
                                    avgBuyPrice,
                                    currentPrice: priceData.currentPrice,
                                    currentValue,
                                    profitLoss,
                                    profitLossPercent,
                                    dayChange: priceData.dayChange || 0,
                                    dayChangePercent: priceData.dayChangePercent || 0,
                                    dayHigh: priceData.dayHigh,
                                    dayLow: priceData.dayLow,
                                    lastUpdated: priceData.timestamp,
                                    isStale: priceData.isStale,
                                    noData: priceData.noData,
                                    error: priceData.error,
                                    isManual: priceData.isManual,
                                    dailyGain: (priceData.dayChange || 0) * holding.quantity
                                };
                            } catch (err) {
                                console.error(`Error processing holding ${holding.symbol}`, err);
                                return { ...holding, error: 'Processing Error', noData: true, currentPrice: 0, currentValue: 0, profitLoss: 0, profitLossPercent: 0 };
                            }
                        })
                    );
                }
            } catch (stockError) {
                console.error("Failed to load stock holdings", stockError);
                toast.error("Failed to load Stocks");
            }

            // 2. Load Crypto
            let cryptoHoldings = [];
            try {
                const savedCrypto = localStorage.getItem('pocketwall_crypto_holdings');
                const cryptoMap = savedCrypto ? JSON.parse(savedCrypto) : {};
                const cryptoIds = Object.keys(cryptoMap);

                if (cryptoIds.length > 0) {
                    // Fetch in INR
                    const cryptoPrices = await cryptoApi.getMultipleCryptoPrices(cryptoIds, 'inr');

                    cryptoHoldings = cryptoIds.map(id => {
                        const data = cryptoMap[id];
                        // Handle legacy (number) vs new (object) format
                        const quantity = typeof data === 'number' ? data : (data.quantity || 0);
                        const avgBuyPrice = typeof data === 'number' ? 0 : (data.avgPrice || 0);
                        const totalInvested = typeof data === 'number' ? 0 : (data.invested || 0);

                        let currentPrice = 0;
                        let dayChangePercent = 0;

                        if (cryptoPrices[id]) {
                            // Handle normalized format { price, change }
                            currentPrice = cryptoPrices[id].price || 0;
                            dayChangePercent = cryptoPrices[id].change || 0;
                        }

                        const currentValue = quantity * currentPrice;
                        const profitLoss = currentValue - totalInvested;
                        const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

                        return {
                            symbol: id.toUpperCase(),
                            name: id,
                            exchange: 'Crypto',
                            assetClass: 'Crypto',
                            quantity,
                            totalInvested,
                            avgBuyPrice,
                            currentPrice,
                            currentValue,
                            profitLoss,
                            profitLossPercent,
                            dayChange: (currentValue * dayChangePercent) / 100,
                            dayChangePercent,
                            dailyGain: (currentValue * dayChangePercent) / 100,
                            lastUpdated: Date.now(),
                            isStale: false,
                            noData: currentPrice === 0
                        };
                    });
                }
            } catch (cryptoError) {
                console.error("Failed to load crypto holdings", cryptoError);
                toast.error("Failed to load Crypto");
            }

            // 3. Load Mutual Funds (Legacy support - merge if any exist in old storage)
            // New MFs are saved in DataAdapter.investments and handled above.
            let mfHoldings = [];
            try {
                const savedMF = localStorage.getItem('pocketwall_mf_holdings');
                const mfMap = savedMF ? JSON.parse(savedMF) : {};
                const mfCodes = Object.keys(mfMap);

                // Only process if not already in stockHoldings (which now includes MFs from DB)
                const existingSymbols = new Set(stockHoldings.map(h => h.symbol));
                const newMfCodes = mfCodes.filter(c => !existingSymbols.has(c));

                if (newMfCodes.length > 0) {
                    mfHoldings = await Promise.all(newMfCodes.map(async (code) => {
                        const quantity = mfMap[code];
                        let navData = null;
                        try {
                            navData = await stockApi.fetchMutualFundNAV(code);
                        } catch (e) {
                            console.warn(`Failed to fetch NAV for ${code}`, e);
                        }

                        const currentPrice = navData ? navData.nav : 0;
                        const currentValue = quantity * currentPrice;

                        return {
                            symbol: navData ? navData.schemeName.substring(0, 20) + '...' : code,
                            name: navData ? navData.schemeName : code,
                            exchange: 'MF',
                            assetClass: 'Mutual Fund',
                            quantity,
                            totalInvested: 0, // Unknown without transaction history
                            avgBuyPrice: 0,
                            currentPrice,
                            currentValue,
                            profitLoss: 0,
                            profitLossPercent: 0,
                            dayChange: navData ? navData.dayChange : 0,
                            dayChangePercent: navData ? navData.dayChangePercent : 0,
                            dailyGain: navData ? (quantity * navData.dayChange) : 0,
                            lastUpdated: navData ? new Date(navData.date).getTime() : Date.now(),
                            isStale: false,
                            noData: currentPrice === 0
                        };
                    }));
                }
            } catch (mfError) {
                console.error("Failed to load MF holdings", mfError);
            }

            // 4. Load Fixed Assets
            let assetHoldings = [];
            try {
                const assets = await DataAdapter.getAssets();
                assetHoldings = assets.map(asset => ({
                    symbol: asset.name,
                    name: asset.description || asset.name,
                    exchange: 'Fixed Asset',
                    assetClass: 'Fixed Asset',
                    quantity: 1,
                    totalInvested: parseFloat(asset.purchaseValue) || 0,
                    avgBuyPrice: parseFloat(asset.purchaseValue) || 0,
                    currentPrice: parseFloat(asset.currentValue) || 0,
                    currentValue: parseFloat(asset.currentValue) || 0,
                    profitLoss: (parseFloat(asset.currentValue) || 0) - (parseFloat(asset.purchaseValue) || 0),
                    profitLossPercent: (parseFloat(asset.purchaseValue) || 0) > 0 ? (((parseFloat(asset.currentValue) || 0) - (parseFloat(asset.purchaseValue) || 0)) / (parseFloat(asset.purchaseValue) || 0)) * 100 : 0,
                    dayChange: 0,
                    dayChangePercent: 0,
                    dailyGain: 0,
                    lastUpdated: Date.now(),
                    isStale: false,
                    noData: false
                }));
            } catch (assetError) {
                console.error("Failed to load assets", assetError);
            }

            // 5. Load Markets Holdings (Forex & Commodities)
            let marketsHoldings = [];
            try {
                const savedMarkets = localStorage.getItem('pocketwall_markets_holdings');
                const marketsData = savedMarkets ? JSON.parse(savedMarkets) : { entries: [] };
                const entries = marketsData.entries || [];

                // Forex rates for current value calculation
                let forexRates = {};
                let commodityPrices = { 'gold': 7500, 'silver': 95, 'crude-oil': 6000, 'natural-gas': 270, 'platinum': 3200, 'copper': 750 };

                try {
                    const forexRes = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
                    if (forexRes.ok) {
                        const data = await forexRes.json();
                        forexRates = data.rates;
                    }
                } catch (e) { console.warn('Failed to fetch forex rates for portfolio'); }

                marketsHoldings = entries.map(entry => {
                    let currentPrice = entry.price;
                    let assetClass = entry.assetType;
                    let exchange = entry.assetType;

                    // Get current price based on asset type
                    if (entry.assetType === 'Forex' && forexRates[entry.assetId]) {
                        currentPrice = 1 / forexRates[entry.assetId];
                    } else if (entry.assetType === 'Commodity') {
                        currentPrice = commodityPrices[entry.assetId] || entry.price;
                    }

                    const currentValue = entry.quantity * currentPrice;
                    const profitLoss = currentValue - entry.invested;
                    const profitLossPercent = entry.invested > 0 ? (profitLoss / entry.invested) * 100 : 0;

                    return {
                        symbol: entry.assetId.toUpperCase(),
                        name: entry.assetId,
                        exchange: exchange,
                        assetClass: assetClass,
                        quantity: entry.quantity,
                        totalInvested: entry.invested,
                        avgBuyPrice: entry.price,
                        currentPrice,
                        currentValue,
                        profitLoss,
                        profitLossPercent,
                        dayChange: 0,
                        dayChangePercent: 0,
                        dailyGain: 0,
                        lastUpdated: Date.now(),
                        isStale: false,
                        noData: false
                    };
                });
            } catch (marketsError) {
                console.error("Failed to load markets holdings", marketsError);
            }

            setHoldings([...stockHoldings, ...cryptoHoldings, ...mfHoldings, ...assetHoldings, ...marketsHoldings]);

            // Calculate Analytics
            const allHoldings = [...stockHoldings, ...cryptoHoldings, ...mfHoldings, ...assetHoldings, ...marketsHoldings];
            if (allHoldings.length > 0) {
                // Best/Worst - Only filter items with 0 price (include stocks even if API had issues but have price)
                const validHoldings = allHoldings.filter(h => h.currentPrice > 0 && h.profitLossPercent !== 0);
                const sortedByPerf = [...validHoldings].sort((a, b) => b.profitLossPercent - a.profitLossPercent);

                setBestWorst({
                    best: sortedByPerf.length > 0 ? sortedByPerf[0] : null,
                    worst: sortedByPerf.length > 0 ? sortedByPerf[sortedByPerf.length - 1] : null
                });

                // Allocation
                const totalValue = allHoldings.reduce((acc, h) => acc + h.currentValue, 0);
                const alloc = allHoldings.map(h => ({
                    id: h.symbol,
                    label: h.symbol,
                    value: h.currentValue,
                    percent: totalValue > 0 ? (h.currentValue / totalValue) * 100 : 0
                })).sort((a, b) => b.value - a.value);
                setAllocationData(alloc);

                // Market Comparison - Fetch index for each exchange type
                const exchangeTypes = [...new Set(allHoldings.map(h => h.exchange))];
                const marketIndices = [];

                for (const exchange of exchangeTypes) {
                    let marketSymbol, marketName;
                    if (exchange === 'US' || exchange === 'NASDAQ' || exchange === 'NYSE') {
                        marketSymbol = 'SPY';
                        marketName = 'S&P 500';
                    } else if (exchange === 'NSE' || exchange === 'BSE') {
                        marketSymbol = 'NIFTYBEES.NS';
                        marketName = 'Nifty 50';
                    } else if (exchange === 'Crypto') {
                        marketSymbol = 'bitcoin';
                        marketName = 'Bitcoin';
                    } else {
                        continue; // Skip unknown exchanges or MF
                    }

                    try {
                        let market = null;
                        if (exchange === 'Crypto') {
                            const data = await cryptoApi.getMultipleCryptoPrices(['bitcoin']);
                            if (data.bitcoin) {
                                market = { dayChangePercent: data.bitcoin.usd_24h_change || 0 };
                            }
                        } else {
                            market = await stockApi.fetchStockPrice(marketSymbol, exchange === 'US' ? 'US' : 'NSE');
                        }

                        if (market) {
                            marketIndices.push({
                                exchange,
                                name: marketName,
                                change: market.dayChangePercent
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to fetch market data for ${exchange}`, e);
                    }
                }

                setMarketData(marketIndices);
            }

            setLastUpdated(new Date());
            toast.success(`Portfolio loaded: ${allHoldings.length} holdings`);
        } catch (error) {
            console.error('Portfolio error:', error);
            toast.error('Failed to load portfolio');
        } finally {
            setLoading(false);
        }
    };

    const refreshPrices = async (force = false) => {
        if (holdings.length === 0) return;

        if (force) {
            stockApi.clearCache();
            cryptoApi.clearCache();
            toast.success('Cache cleared. Fetching fresh prices...');
        }

        const updated = await Promise.all(
            holdings.map(async (h) => {
                // Handle Crypto
                if (h.assetClass === 'Crypto') {
                    try {
                        const prices = await cryptoApi.getMultipleCryptoPrices([h.name]); // name is the id
                        let currentPrice = h.currentPrice;
                        let dayChangePercent = h.dayChangePercent;

                        if (prices[h.name]) {
                            if (typeof prices[h.name] === 'object') {
                                currentPrice = prices[h.name].usd || 0;
                                dayChangePercent = prices[h.name].usd_24h_change || 0;
                            } else {
                                currentPrice = prices[h.name];
                            }
                        }

                        const currentValue = h.quantity * currentPrice;
                        // Crypto currently assumes 0 cost basis or we don't track it well yet in this view
                        const profitLoss = 0;
                        return h;
                    } catch (cryptoError) {
                        console.error("Failed to load crypto holdings", cryptoError);
                        toast.error("Failed to load Crypto");
                    }
                }

                // Handle Fixed Assets (No API refresh)
                if (h.assetClass === 'Fixed Asset') {
                    return h;
                }

                // Handle Stocks/ETFs/etc
                let pd = null;
                try {
                    pd = await stockApi.fetchStockPrice(h.symbol, h.exchange);
                } catch (e) {
                    console.warn(`Failed to refresh ${h.symbol}`, e);
                }

                if (pd) {
                    await DataAdapter.saveStoredPrice(h.symbol, h.exchange, pd);
                } else {
                    pd = await DataAdapter.getStoredPrice(h.symbol, h.exchange);
                }

                if (!pd) {
                    // Fallback to existing price if both API and Storage fail
                    if (h.currentPrice > 0) {
                        pd = {
                            currentPrice: h.currentPrice,
                            dayChange: h.dayChange || 0,
                            dayChangePercent: h.dayChangePercent || 0,
                            timestamp: h.lastUpdated || Date.now(),
                            isStale: true,
                            noData: h.noData
                        };
                    } else {
                        pd = { currentPrice: 0, dayChange: 0, dayChangePercent: 0, timestamp: Date.now(), isStale: true, noData: true };
                    }
                }

                const cv = h.quantity * pd.currentPrice;
                const pl = cv - h.totalInvested;
                return {
                    ...h,
                    currentPrice: pd.currentPrice,
                    currentValue: cv,
                    profitLoss: pl,
                    profitLossPercent: h.totalInvested > 0 ? (pl / h.totalInvested) * 100 : 0,
                    dayChange: pd.dayChange || 0,
                    dayChangePercent: pd.dayChangePercent || 0,
                    dailyGain: (pd.dayChange || 0) * h.quantity,
                    lastUpdated: pd.timestamp,
                    isStale: pd.isStale,
                    noData: pd.noData,
                    error: pd.error
                };
            })
        );
        setHoldings(updated);
        setLastUpdated(new Date());
    };

    const handleManualUpdate = async (symbol, exchange, newPrice) => {
        const price = parseFloat(newPrice);
        if (isNaN(price) || price <= 0) {
            toast.error('Invalid price');
            return;
        }

        const priceData = {
            currentPrice: price,
            dayChange: 0, // Reset daily change since we don't know it
            dayChangePercent: 0,
            timestamp: Date.now(),
            isManual: true
        };

        await DataAdapter.saveStoredPrice(symbol, exchange, priceData);
        toast.success(`Updated price for ${symbol}`);
        loadPortfolio(); // Reload to reflect changes
    };

    const getCurrency = (ex) => (ex === 'US' || ex === 'NASDAQ' || ex === 'NYSE') ? 'USD' : 'INR';

    // Helper to convert to Display Currency
    const toDisplay = (amount, exchange) => {
        // If it's US stock, it's in USD. If Indian/MF/Asset, it's in INR.
        // We need to convert FROM the source currency TO the user's display currency.
        const sourceCurrency = (exchange === 'US' || exchange === 'NASDAQ' || exchange === 'NYSE') ? 'USD' : 'INR';
        return CurrencyConverter.convert(amount, sourceCurrency, currency);
    };

    const formatPrice = (amt, ex) => CurrencyConverter.format(toDisplay(amt, ex), currency);
    const formatPercent = (p) => `${p >= 0 ? '+' : ''}${(p || 0).toFixed(2)}%`;

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                <div className="text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <div style={{ color: textColor }}>Loading portfolio...</div>
                </div>
            </div>
        );
    }

    if (holdings.length === 0) {
        return (
            <div className="h-full flex items-center justify-center flex-col gap-4" style={{ backgroundColor: bgColor }}>
                <div className="text-6xl">📊</div>
                <div style={{ color: textColor }} className="text-xl font-semibold">No investments yet</div>
                <div style={{ color: textColor, opacity: 0.6 }}>
                    Add some investments to see your portfolio
                </div>
            </div>
        );
    }

    return (
        <FeatureGate feature="investments">
            <div className="h-full overflow-y-auto p-4" style={{ backgroundColor: bgColor }}>
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold" style={{ color: textColor }}>💰 Portfolio</h2>
                    <div className="flex gap-2 items-center">
                        {lastUpdated && <span className="text-xs opacity-50" style={{ color: textColor }}>Updated: {lastUpdated.toLocaleTimeString()}</span>}
                        <label className="flex items-center gap-2 text-sm" style={{ color: textColor }}>
                            <input type="checkbox" checked={autoRefresh} onChange={(e) => { setAutoRefresh(e.target.checked); if (e.target.checked) toast.success('Auto-refresh ON'); }} />
                            Auto-refresh
                        </label>
                        <button onClick={() => refreshPrices(true)} className="px-3 py-1 text-sm border" style={{ backgroundColor: '#0078d4', color: '#fff', borderColor: '#005a9e' }}>🔄 Force Refresh</button>
                        <button onClick={loadPortfolio} className="px-3 py-1 text-sm border" style={{ backgroundColor: '#107c10', color: '#fff', borderColor: '#0e6b0e' }}>↻ Reload</button>
                        <ShareButton
                            type="portfolio"
                            data={{
                                totalValue: holdings.reduce((acc, h) => acc + toDisplay(h.currentValue, h.exchange), 0),
                                invested: holdings.reduce((acc, h) => acc + toDisplay(h.totalInvested, h.exchange), 0),
                                totalGain: holdings.reduce((acc, h) => acc + toDisplay(h.profitLoss, h.exchange), 0),
                                returnPercent: 0, // Calculated inside if needed, or pass 0
                                bestStock: bestWorst.best
                            }}
                            isDark={isDark}
                            className="px-3 py-1 text-sm border"
                        />
                    </div>
                </div>

                {/* Asset Type Filter Dropdown */}
                <div className="mb-4 relative">
                    <button
                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded border text-sm transition-colors"
                        style={{
                            backgroundColor: isDark ? '#3e3e42' : '#f5f5f5',
                            borderColor,
                            color: textColor
                        }}
                    >
                        <span>Filter:</span>
                        <span style={{ opacity: 0.8 }}>
                            {assetFilter.length === PORTFOLIO_CATEGORIES.length
                                ? 'All Assets'
                                : `${assetFilter.length} of ${PORTFOLIO_CATEGORIES.length}`}
                        </span>
                        <span style={{ opacity: 0.5 }}>{showFilterDropdown ? '▲' : '▼'}</span>
                    </button>

                    {showFilterDropdown && (
                        <>
                            {/* Backdrop to close dropdown */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowFilterDropdown(false)}
                            />

                            {/* Dropdown Panel */}
                            <div
                                className="absolute left-0 top-full mt-1 z-20 p-3 rounded-lg border shadow-xl min-w-[280px]"
                                style={{ backgroundColor: panelBg, borderColor }}
                            >
                                <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor }}>
                                    <span className="text-xs font-medium" style={{ color: textColor, opacity: 0.7 }}>Asset Type</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setAssetFilter(PORTFOLIO_CATEGORIES.map(c => c.id))}
                                            className="text-xs px-2 py-0.5 rounded"
                                            style={{ backgroundColor: isDark ? '#4e4e52' : '#e0e0e0', color: textColor }}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setAssetFilter([])}
                                            className="text-xs px-2 py-0.5 rounded"
                                            style={{ backgroundColor: isDark ? '#4e4e52' : '#e0e0e0', color: textColor }}
                                        >
                                            None
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {PORTFOLIO_CATEGORIES.map(cat => {
                                        const isSelected = assetFilter.includes(cat.id);
                                        const count = holdings.filter(h => getHoldingCategory(h) === cat.id).length;
                                        return (
                                            <label
                                                key={cat.id}
                                                className="flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors"
                                                style={{
                                                    color: textColor,
                                                    backgroundColor: isSelected ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') : 'transparent'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setAssetFilter([...assetFilter, cat.id]);
                                                        } else {
                                                            setAssetFilter(assetFilter.filter(f => f !== cat.id));
                                                        }
                                                    }}
                                                    className="w-3.5 h-3.5 rounded"
                                                    style={{ accentColor: isDark ? '#0078d4' : '#0066cc' }}
                                                />
                                                <span className="flex-1 text-sm">{cat.label}</span>
                                                {count > 0 && (
                                                    <span className="text-xs" style={{ opacity: 0.5 }}>{count}</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>

                                <div className="mt-3 pt-3 border-t text-xs opacity-60" style={{ borderColor, color: textColor }}>
                                    Showing {getFilteredHoldings().length} of {holdings.length} holdings
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Summary by Currency */}
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="border p-4 rounded cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1" style={{ backgroundColor: panelBg, borderColor }} onClick={() => setShowInsightsModal(true)}>
                        <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>
                            {assetFilter.length < PORTFOLIO_CATEGORIES.length ? 'Filtered ' : 'Total '}Portfolio Value
                        </div>
                        <div className="text-2xl font-bold sensitive-amount" style={{ color: textColor }}>
                            {CurrencyConverter.format(getFilteredHoldings().reduce((acc, h) => acc + toDisplay(h.currentValue, h.exchange), 0), currency)}
                        </div>
                        <div className="text-xs opacity-50" style={{ color: textColor }}>{getFilteredHoldings().length} holdings</div>
                    </div>
                    <div className="border p-4 rounded cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1" style={{ backgroundColor: panelBg, borderColor }} onClick={() => setShowInsightsModal(true)}>
                        <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>
                            {assetFilter.length < PORTFOLIO_CATEGORIES.length ? 'Filtered ' : 'Total '}Invested
                        </div>
                        <div className="text-2xl font-bold sensitive-amount" style={{ color: textColor }}>
                            {CurrencyConverter.format(getFilteredHoldings().reduce((acc, h) => acc + toDisplay(h.totalInvested, h.exchange), 0), currency)}
                        </div>
                    </div>
                    <div className="border p-4 rounded cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1" style={{ backgroundColor: panelBg, borderColor }} onClick={() => setShowInsightsModal(true)}>
                        <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>
                            {assetFilter.length < PORTFOLIO_CATEGORIES.length ? 'Filtered ' : 'Total '}Profit/Loss
                        </div>
                        <div className="text-2xl font-bold sensitive-amount" style={{ color: getFilteredHoldings().reduce((acc, h) => acc + toDisplay(h.profitLoss, h.exchange), 0) >= 0 ? '#10b981' : '#ef4444' }}>
                            {CurrencyConverter.format(getFilteredHoldings().reduce((acc, h) => acc + toDisplay(h.profitLoss, h.exchange), 0), currency)}
                        </div>
                    </div>
                    <div className="border p-4 rounded cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1" style={{ backgroundColor: panelBg, borderColor }} onClick={() => setShowInsightsModal(true)}>
                        <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Today's P&L</div>
                        <div className="text-2xl font-bold sensitive-amount" style={{ color: getFilteredHoldings().reduce((acc, h) => acc + toDisplay(h.dailyGain || 0, h.exchange), 0) >= 0 ? '#10b981' : '#ef4444' }}>
                            {CurrencyConverter.format(getFilteredHoldings().reduce((acc, h) => acc + toDisplay(h.dailyGain || 0, h.exchange), 0), currency)}
                        </div>
                        <div className="text-xs opacity-50" style={{ color: textColor }}>
                            {/* Calculate rough percentage for today */}
                            {(() => {
                                const filtered = getFilteredHoldings();
                                const totalVal = filtered.reduce((acc, h) => acc + toDisplay(h.currentValue, h.exchange), 0);
                                const totalDaily = filtered.reduce((acc, h) => acc + toDisplay(h.dailyGain || 0, h.exchange), 0);
                                const prevVal = totalVal - totalDaily;
                                const pct = prevVal > 0 ? (totalDaily / prevVal) * 100 : 0;
                                return formatPercent(pct);
                            })()}
                        </div>
                    </div>
                </div>

                {/* Highlights & Market Comparison */}
                {holdings.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Best Overall */}
                            <div className={`p-3 rounded border flex flex-col justify-center ${!isDark ? 'glass-panel' : ''}`} style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-[10px] uppercase font-bold opacity-50 mb-1" style={{ color: textColor }}>🚀 Best Overall</div>
                                {bestWorst.best ? (
                                    <div>
                                        <div className="font-bold text-sm truncate" title={bestWorst.best.name || bestWorst.best.symbol} style={{ color: textColor }}>
                                            {bestWorst.best.name || bestWorst.best.symbol}
                                        </div>
                                        <div className="text-lg font-bold text-green-500">
                                            +{bestWorst.best.profitLossPercent.toFixed(2)}%
                                        </div>
                                    </div>
                                ) : <span className="text-xs opacity-50">N/A</span>}
                            </div>

                            {/* Worst Overall */}
                            <div className={`p-3 rounded border flex flex-col justify-center ${!isDark ? 'glass-panel' : ''}`} style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-[10px] uppercase font-bold opacity-50 mb-1" style={{ color: textColor }}>📉 Worst Overall</div>
                                {bestWorst.worst ? (
                                    <div>
                                        <div className="font-bold text-sm truncate" title={bestWorst.worst.name || bestWorst.worst.symbol} style={{ color: textColor }}>
                                            {bestWorst.worst.name || bestWorst.worst.symbol}
                                        </div>
                                        <div className={`text-lg font-bold ${bestWorst.worst.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {bestWorst.worst.profitLossPercent.toFixed(2)}%
                                        </div>
                                    </div>
                                ) : <span className="text-xs opacity-50">N/A</span>}
                            </div>

                            {/* Top Day Gainer */}
                            <div className={`p-3 rounded border flex flex-col justify-center ${!isDark ? 'glass-panel' : ''}`} style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-[10px] uppercase font-bold opacity-50 mb-1" style={{ color: textColor }}>☀️ Top Day Gainer</div>
                                {(() => {
                                    const dayBest = [...holdings].sort((a, b) => b.dayChangePercent - a.dayChangePercent)[0];
                                    if (!dayBest || dayBest.dayChangePercent <= 0) return <span className="text-xs opacity-50">N/A</span>;
                                    return (
                                        <div>
                                            <div className="font-bold text-sm truncate" title={dayBest.name || dayBest.symbol} style={{ color: textColor }}>
                                                {dayBest.name || dayBest.symbol}
                                            </div>
                                            <div className="text-lg font-bold text-green-500">
                                                +{dayBest.dayChangePercent.toFixed(2)}%
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Top Day Loser */}
                            <div className={`p-3 rounded border flex flex-col justify-center ${!isDark ? 'glass-panel' : ''}`} style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-[10px] uppercase font-bold opacity-50 mb-1" style={{ color: textColor }}>🌧️ Top Day Loser</div>
                                {(() => {
                                    const dayWorst = [...holdings].sort((a, b) => a.dayChangePercent - b.dayChangePercent)[0];
                                    if (!dayWorst || dayWorst.dayChangePercent >= 0) return <span className="text-xs opacity-50">N/A</span>;
                                    return (
                                        <div>
                                            <div className="font-bold text-sm truncate" title={dayWorst.name || dayWorst.symbol} style={{ color: textColor }}>
                                                {dayWorst.name || dayWorst.symbol}
                                            </div>
                                            <div className="text-lg font-bold text-red-500">
                                                {dayWorst.dayChangePercent.toFixed(2)}%
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Market Comparison */}
                        <div className={`p-4 rounded border flex flex-col ${!isDark ? 'glass-panel' : ''}`} style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="text-sm font-semibold mb-4" style={{ color: textColor }}>Market Comparison (Today)</h3>
                            <div className="flex-1 flex flex-col justify-center gap-4">
                                {/* User Portfolio */}
                                <div>
                                    <div className="flex justify-between text-xs mb-1" style={{ color: textColor }}>
                                        <span>Your Portfolio</span>
                                        <span className={holdings.reduce((acc, h) => acc + (h.dayChange || 0), 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                            {formatPercent(holdings.reduce((acc, h) => acc + (h.dayChangePercent * (h.currentValue / holdings.reduce((sum, i) => sum + i.currentValue, 0))), 0))}
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${holdings.reduce((acc, h) => acc + (h.dayChange || 0), 0) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(Math.abs(holdings.reduce((acc, h) => acc + (h.dayChangePercent * (h.currentValue / holdings.reduce((sum, i) => sum + i.currentValue, 0))), 0)) * 10, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Market Indices */}
                                {marketData.length > 0 ? (
                                    marketData.map((market, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between text-xs mb-1" style={{ color: textColor }}>
                                                <span>{market.name}</span>
                                                <span className={(market.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                                                    {formatPercent(market.change || 0)}
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${(market.change || 0) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                                    style={{ width: `${Math.min(Math.abs(market.change || 0) * 10, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs opacity-50" style={{ color: textColor }}>No market data available</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Holdings Table */}
                <div className="border rounded mb-4" style={{ backgroundColor: panelBg, borderColor }}>
                    <div className="p-3 border-b" style={{ borderColor }}><h3 className="font-semibold" style={{ color: textColor }}>Holdings</h3></div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b" style={{ borderColor }}>
                                <tr style={{ color: textColor, opacity: 0.7 }}>
                                    <th onClick={() => handleSort('symbol')} className="text-left p-2 cursor-pointer hover:opacity-100">
                                        Stock {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('quantity')} className="text-right p-2 cursor-pointer hover:opacity-100">
                                        Qty {sortConfig.key === 'quantity' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('avgBuyPrice')} className="text-right p-2 cursor-pointer hover:opacity-100">
                                        Avg Buy {sortConfig.key === 'avgBuyPrice' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('currentPrice')} className="text-right p-2 cursor-pointer hover:opacity-100">
                                        Current {sortConfig.key === 'currentPrice' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('currentValue')} className="text-right p-2 cursor-pointer hover:opacity-100">
                                        Value {sortConfig.key === 'currentValue' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('dayChangePercent')} className="text-right p-2 cursor-pointer hover:opacity-100">
                                        Day Chg {sortConfig.key === 'dayChangePercent' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('dailyGain')} className="text-right p-2 cursor-pointer hover:opacity-100">
                                        Today's P&L {sortConfig.key === 'dailyGain' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                    <th onClick={() => handleSort('profitLoss')} className="text-right p-2 cursor-pointer hover:opacity-100">
                                        Total P&L {sortConfig.key === 'profitLoss' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Group holdings by asset type */}
                                {['US', 'Indian', 'Crypto', 'Forex', 'Commodity', 'Mutual Fund', 'Fixed Asset'].map(category => {
                                    // Skip category if not selected in filter
                                    if (!assetFilter.includes(category)) return null;

                                    const filteredList = getFilteredHoldings();
                                    let categoryHoldings = [];
                                    let categoryLabel = '';

                                    if (category === 'US') {
                                        categoryHoldings = filteredList.filter(h => h.exchange === 'US' || h.exchange === 'NASDAQ' || h.exchange === 'NYSE');
                                        categoryLabel = '🇺🇸 US Stocks';
                                    } else if (category === 'Indian') {
                                        categoryHoldings = filteredList.filter(h => h.exchange === 'NSE' || h.exchange === 'BSE');
                                        categoryLabel = '🇮🇳 Indian Stocks';
                                    } else if (category === 'Crypto') {
                                        categoryHoldings = filteredList.filter(h => h.exchange === 'Crypto' || h.assetClass === 'Crypto');
                                        categoryLabel = '₿ Cryptocurrency';
                                    } else if (category === 'Forex') {
                                        categoryHoldings = filteredList.filter(h => h.assetClass === 'Forex');
                                        categoryLabel = '💱 Forex';
                                    } else if (category === 'Commodity') {
                                        categoryHoldings = filteredList.filter(h => h.assetClass === 'Commodity');
                                        categoryLabel = '🛢️ Commodities';
                                    } else if (category === 'Mutual Fund') {
                                        categoryHoldings = filteredList.filter(h => h.exchange === 'MF' || h.assetClass === 'Mutual Fund');
                                        categoryLabel = '📈 Mutual Funds';
                                    } else if (category === 'Fixed Asset') {
                                        categoryHoldings = filteredList.filter(h => h.assetClass === 'Fixed Asset');
                                        categoryLabel = '🏠 Fixed Assets';
                                    }

                                    if (categoryHoldings.length === 0) return null;

                                    // Apply Sorting
                                    categoryHoldings = sortHoldings(categoryHoldings);

                                    // Calculate Category Totals
                                    const catTotalValue = categoryHoldings.reduce((sum, h) => sum + h.currentValue, 0);
                                    const catTotalInvested = categoryHoldings.reduce((sum, h) => sum + h.totalInvested, 0);
                                    const catTotalPL = categoryHoldings.reduce((sum, h) => sum + h.profitLoss, 0);
                                    const catDailyGain = categoryHoldings.reduce((sum, h) => sum + (h.dailyGain || 0), 0);
                                    const catDayChangePercent = catTotalValue > 0 ? (catDailyGain / (catTotalValue - catDailyGain)) * 100 : 0;

                                    const isExpanded = expandedCategories[category];

                                    return (
                                        <React.Fragment key={category}>
                                            {/* Category Header */}
                                            <tr className="bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer" onClick={() => toggleCategory(category)}>
                                                <td className="p-2 font-bold text-sm flex items-center gap-2" style={{ color: textColor }}>
                                                    <span className="opacity-60 text-xs">{isExpanded ? '▼' : '▶'}</span>
                                                    {categoryLabel} ({categoryHoldings.length})
                                                </td>
                                                <td className="text-right p-2 font-semibold" style={{ color: textColor }}></td>
                                                <td className="text-right p-2 font-semibold" style={{ color: textColor }}></td>
                                                <td className="text-right p-2 font-semibold sensitive-amount text-xs" style={{ color: textColor }}>
                                                    Invested: {formatPrice(catTotalInvested, 'INR')}
                                                </td>
                                                <td className="text-right p-2 font-semibold sensitive-amount" style={{ color: textColor }}>
                                                    {formatPrice(catTotalValue, 'INR')}
                                                </td>
                                                <td className="text-right p-2 font-semibold" style={{ color: catDailyGain >= 0 ? '#10b981' : '#ef4444' }}>
                                                    <div className="flex flex-col items-end">
                                                        <span>{formatPrice(catDailyGain, 'INR')}</span>
                                                        <span className="text-xs opacity-70">({formatPercent(catDayChangePercent)})</span>
                                                    </div>
                                                </td>
                                                <td className="text-right p-2 font-semibold sensitive-amount" style={{ color: catDailyGain >= 0 ? '#10b981' : '#ef4444' }}>
                                                    {formatPrice(catDailyGain, 'INR')}
                                                </td>
                                                <td className="text-right p-2 font-semibold sensitive-amount" style={{ color: catTotalPL >= 0 ? '#10b981' : '#ef4444' }}>
                                                    {formatPrice(catTotalPL, 'INR')}
                                                </td>
                                            </tr>

                                            {/* Holdings for this category */}
                                            {isExpanded && categoryHoldings.map((h, i) => (
                                                <tr key={`${category}-${i}`} className="border-b hover:bg-opacity-5 hover:bg-blue-500 cursor-pointer" style={{ borderColor }} onClick={() => setSelectedStock(h)}>
                                                    <td className="p-2">
                                                        <div style={{ color: textColor }} className="font-medium">
                                                            {category === 'Mutual Fund' ? (
                                                                <div className="flex flex-col">
                                                                    <span>{h.name}</span>
                                                                    <span className="text-[10px] opacity-60">{h.symbol !== h.name ? h.symbol : ''}</span>
                                                                </div>
                                                            ) : (
                                                                h.symbol
                                                            )}
                                                            {h.noData && <span className="text-xs text-red-500 ml-1" title={h.error || "No Data"}>⚠️</span>}
                                                            {h.isStale && !h.noData && <span className="text-xs opacity-50 ml-1">(Cached)</span>}
                                                            {h.isManual && <span className="text-xs text-blue-500 ml-1" title="Manually Updated">✏️</span>}
                                                        </div>
                                                        <div style={{ color: textColor, opacity: 0.5 }} className="text-xs">
                                                            {h.exchange} • {h.assetClass}
                                                        </div>
                                                    </td>
                                                    <td className="text-right p-2" style={{ color: textColor }}>{h.quantity}</td>
                                                    <td className="text-right p-2 sensitive-amount" style={{ color: textColor }}>{formatPrice(h.avgBuyPrice, h.exchange)}</td>
                                                    <td className="text-right p-2 sensitive-amount" style={{ color: textColor }}>{formatPrice(h.currentPrice, h.exchange)}</td>
                                                    <td className="text-right p-2 sensitive-amount" style={{ color: textColor }}>{formatPrice(h.currentValue, h.exchange)}</td>
                                                    <td className={`text-right p-2 ${h.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {formatPercent(h.dayChangePercent)}
                                                    </td>
                                                    <td className={`text-right p-2 sensitive-amount ${h.dailyGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {formatPrice(h.dailyGain, h.exchange)}
                                                    </td>
                                                    <td className={`text-right p-2 sensitive-amount ${h.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {formatPrice(h.profitLoss, h.exchange)}
                                                        <div className="text-[10px] opacity-70">
                                                            {formatPercent(h.profitLossPercent)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div >

                {/* Stock Detail Modal */}
                {
                    selectedStock && (
                        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setSelectedStock(null)}>
                            <div className="border rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: panelBg, borderColor }} onClick={(e) => e.stopPropagation()}>
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-2xl font-bold" style={{ color: textColor }}>{selectedStock.symbol}</h3>
                                        <div className="text-sm opacity-60" style={{ color: textColor }}>{selectedStock.name} • {selectedStock.exchange}</div>
                                    </div>
                                    <button onClick={() => setSelectedStock(null)} className="text-2xl opacity-60 hover:opacity-100" style={{ color: textColor }}>×</button>
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="border p-3 rounded" style={{ borderColor }}>
                                        <div className="text-xs opacity-60" style={{ color: textColor }}>Current Price</div>
                                        <div className="text-xl font-bold sensitive-amount" style={{ color: textColor }}>{formatPrice(selectedStock.currentPrice, selectedStock.exchange)}</div>
                                        <div className="text-xs" style={{ color: selectedStock.dayChange >= 0 ? '#10b981' : '#ef4444' }}>
                                            {selectedStock.dayChange >= 0 ? '▲' : '▼'} {formatPercent(selectedStock.dayChangePercent)}
                                        </div>
                                    </div>
                                    <div className="border p-3 rounded" style={{ borderColor }}>
                                        <div className="text-xs opacity-60" style={{ color: textColor }}>Profit/Loss</div>
                                        <div className="text-xl font-bold sensitive-amount" style={{ color: selectedStock.profitLoss >= 0 ? '#10b981' : '#ef4444' }}>
                                            {formatPrice(selectedStock.profitLoss, selectedStock.exchange)}
                                        </div>
                                        <div className="text-xs" style={{ color: selectedStock.profitLoss >= 0 ? '#10b981' : '#ef4444' }}>
                                            {formatPercent(selectedStock.profitLossPercent)}
                                        </div>
                                    </div>
                                </div>

                                {/* Transaction History */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-sm" style={{ color: textColor }}>Transaction History</h4>
                                        <div className="text-right">
                                            <div className="text-xs opacity-60" style={{ color: textColor }}>Total Invested</div>
                                            <div className="font-bold text-sm sensitive-amount" style={{ color: textColor }}>
                                                {formatPrice(selectedStock.totalInvested, selectedStock.exchange)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border rounded" style={{ borderColor }}>
                                        <table className="w-full text-xs">
                                            <thead className="border-b" style={{ borderColor }}>
                                                <tr style={{ color: textColor, opacity: 0.7 }}>
                                                    <th className="text-left p-2">Date</th>
                                                    <th className="text-right p-2">Qty</th>
                                                    <th className="text-right p-2">Price</th>
                                                    <th className="text-right p-2">Total</th>
                                                    <th className="text-center p-2">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedStock.purchases && selectedStock.purchases.length > 0 ? (
                                                    selectedStock.purchases.map((txn, idx) => (
                                                        <tr key={txn.id} className="border-b" style={{ borderColor }}>
                                                            <td className="p-2" style={{ color: textColor }}>{formatDate(txn.date || txn.createdAt, currency)}</td>
                                                            <td className="text-right p-2" style={{ color: textColor }}>{txn.quantity}</td>
                                                            <td className="text-right p-2 sensitive-amount" style={{ color: textColor }}>{formatPrice(txn.buyPrice || txn.pricePerShare, selectedStock.exchange)}</td>
                                                            <td className="text-right p-2 font-medium sensitive-amount" style={{ color: textColor }}>
                                                                {formatPrice((txn.buyPrice || txn.pricePerShare) * txn.quantity, selectedStock.exchange)}
                                                            </td>
                                                            <td className="text-center p-2">
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm('Delete this transaction?')) {
                                                                            await DataAdapter.deleteInvestment(txn.id);
                                                                            toast.success('Transaction deleted');
                                                                            loadPortfolio();
                                                                            setSelectedStock(null);
                                                                        }
                                                                    }}
                                                                    className="text-[10px] px-2 py-0.5 border hover:bg-red-100"
                                                                    style={{ borderColor, color: '#dc2626' }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="5" className="text-center p-4 opacity-60" style={{ color: textColor }}>No transactions</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Manual Price Update (Fallback) */}
                                <div className="border p-4 rounded mb-6" style={{ borderColor, backgroundColor: isDark ? '#2d2d30' : '#f8f9fa' }}>
                                    <h4 className="font-semibold text-sm mb-2" style={{ color: textColor }}>✏️ Manual Price Update</h4>
                                    <div className="text-xs opacity-70 mb-3" style={{ color: textColor }}>
                                        Use this if the automatic price update fails (e.g. for certain NSE stocks).
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            id="manual-price-input"
                                            placeholder="Enter current price"
                                            className="flex-1 px-2 py-1 text-sm border rounded"
                                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                            step="0.01"
                                        />
                                        <button
                                            onClick={() => {
                                                const val = document.getElementById('manual-price-input').value;
                                                handleManualUpdate(selectedStock.symbol, selectedStock.exchange, val);
                                            }}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>

                                {/* Price Alerts Section */}
                                <div className="border-t pt-4" style={{ borderColor }}>
                                    <h4 className="font-semibold text-sm mb-3" style={{ color: textColor }}>🔔 Price Alerts</h4>
                                    <div className="space-y-3">
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs mb-1" style={{ color: textColor }}>Alert when price</label>
                                                <select
                                                    className="w-full px-2 py-1.5 text-sm border"
                                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                                    defaultValue="below"
                                                    id={`alert-${selectedStock.symbol}-comparison`}
                                                >
                                                    <option value="below">Falls below</option>
                                                    <option value="above">Rises above</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs mb-1" style={{ color: textColor }}>Target Price</label>
                                                <input
                                                    type="number"
                                                    placeholder={selectedStock.currentPrice}
                                                    className="w-full px-2 py-1.5 text-sm border"
                                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                                    id={`alert-${selectedStock.symbol}-price`}
                                                    step="0.01"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1" style={{ color: textColor }}>Custom Message (optional)</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., Time to buy more!"
                                                className="w-full px-2 py-1.5 text-sm border"
                                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                                id={`alert-${selectedStock.symbol}-message`}
                                            />
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const comparison = document.getElementById(`alert-${selectedStock.symbol}-comparison`).value;
                                                const targetPrice = parseFloat(document.getElementById(`alert-${selectedStock.symbol}-price`).value);
                                                const message = document.getElementById(`alert-${selectedStock.symbol}-message`).value;

                                                if (!targetPrice || targetPrice <= 0) {
                                                    toast.error('Please enter a valid target price');
                                                    return;
                                                }

                                                const alert = {
                                                    type: 'stock_owned',
                                                    symbol: selectedStock.symbol,
                                                    enabled: true,
                                                    conditions: {
                                                        targetPrice,
                                                        comparison
                                                    },
                                                    message: message || `${selectedStock.symbol} ${comparison} ${getSymbol(selectedStock.exchange)}${targetPrice}`
                                                };

                                                await DataAdapter.addAlert(alert);
                                                toast.success('Price alert created!');
                                                // Clear form
                                                document.getElementById(`alert-${selectedStock.symbol}-price`).value = '';
                                                document.getElementById(`alert-${selectedStock.symbol}-message`).value = '';
                                            }}
                                            className="w-full px-4 py-2 text-sm border font-semibold"
                                            style={{ backgroundColor: '#0078d4', color: '#fff', borderColor: '#005a9e' }}
                                        >
                                            + Set Alert
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                <PortfolioInsightsModal
                    isOpen={showInsightsModal}
                    onClose={() => setShowInsightsModal(false)}
                    holdings={holdings}
                    currency={currency}
                    isDark={isDark}
                />
            </div >
        </FeatureGate >
    );
};

export default Portfolio;
