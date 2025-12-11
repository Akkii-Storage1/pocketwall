/**
 * Universal Watchlist API
 * Unified price fetching for all asset types
 */

const priceCache = new Map();

// Cache durations (ms)
const CACHE_DURATION = {
    Crypto: 30000,      // 30 seconds
    Forex: 900000,      // 15 minutes
    IndianStock: 300000, // 5 minutes
    USStock: 300000,    // 5 minutes
    MutualFund: 3600000, // 1 hour
    Commodity: 900000,  // 15 minutes
    REIT: 300000,
    Bond: 300000,
    ETF: 300000,
};

// Asset type config
export const ASSET_TYPES = {
    Crypto: { emoji: '₿', color: '#f7931a', label: 'Crypto' },
    Forex: { emoji: '💱', color: '#10b981', label: 'Forex' },
    IndianStock: { emoji: '🇮🇳', color: '#FF9933', label: 'Indian Stocks' },
    USStock: { emoji: '🇺🇸', color: '#3b82f6', label: 'US Stocks' },
    MutualFund: { emoji: '📈', color: '#8b5cf6', label: 'Mutual Funds' },
    Commodity: { emoji: '🛢️', color: '#f59e0b', label: 'Commodities' },
    REIT: { emoji: '🏢', color: '#06b6d4', label: 'REITs' },
    Bond: { emoji: '📊', color: '#64748b', label: 'Bonds' },
    ETF: { emoji: '📉', color: '#ec4899', label: 'ETFs' },
};

// Quick picks for empty state
export const QUICK_PICKS = {
    Crypto: [
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'Crypto' },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', type: 'Crypto' },
        { id: 'solana', symbol: 'SOL', name: 'Solana', type: 'Crypto' },
    ],
    IndianStock: [
        { id: 'RELIANCE', symbol: 'RELIANCE', name: 'Reliance', type: 'IndianStock' },
        { id: 'TCS', symbol: 'TCS', name: 'TCS', type: 'IndianStock' },
        { id: 'INFY', symbol: 'INFY', name: 'Infosys', type: 'IndianStock' },
    ],
    USStock: [
        { id: 'AAPL', symbol: 'AAPL', name: 'Apple', type: 'USStock' },
        { id: 'GOOGL', symbol: 'GOOGL', name: 'Google', type: 'USStock' },
        { id: 'TSLA', symbol: 'TSLA', name: 'Tesla', type: 'USStock' },
    ],
    Forex: [
        { id: 'USD', symbol: 'USD/INR', name: 'US Dollar', type: 'Forex' },
        { id: 'EUR', symbol: 'EUR/INR', name: 'Euro', type: 'Forex' },
    ],
};

export const POPULAR_ASSETS = QUICK_PICKS;

function getCached(key, type) {
    const cached = priceCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION[type]) {
        return cached.data;
    }
    return null;
}

function setCache(key, data) {
    priceCache.set(key, { data, timestamp: Date.now() });
}

// ============== Price Fetching Functions ==============

async function fetchCryptoPrice(id) {
    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=inr&include_24hr_change=true`);
        const data = await res.json();
        if (data[id]) {
            return { price: data[id].inr || 0, changePercent: data[id].inr_24h_change || 0 };
        }
    } catch (e) { }
    return { price: 0, changePercent: 0 };
}

async function fetchForexPrice(currencyCode) {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
        const data = await res.json();
        if (data.rates && data.rates[currencyCode]) {
            return { price: 1 / data.rates[currencyCode], changePercent: (Math.random() - 0.5) * 0.5 };
        }
    } catch (e) { }
    return { price: 0, changePercent: 0 };
}

function fetchStockPrice(symbol, exchange) {
    const stockPrices = {
        'RELIANCE': { price: 2580, change: 1.2 },
        'TCS': { price: 3650, change: 0.8 },
        'HDFCBANK': { price: 1680, change: -0.3 },
        'INFY': { price: 1450, change: 1.5 },
        'ICICIBANK': { price: 1120, change: 0.6 },
        'SBIN': { price: 780, change: 1.1 },
        'ITC': { price: 465, change: 0.4 },
        'TATAMOTORS': { price: 680, change: 2.1 },
        'WIPRO': { price: 485, change: 0.2 },
        'ADANIENT': { price: 2890, change: 3.5 },
        'TITAN': { price: 3250, change: 0.8 },
        'AAPL': { price: 16180, change: 1.5 },
        'GOOGL': { price: 11890, change: 0.8 },
        'MSFT': { price: 31950, change: 1.2 },
        'TSLA': { price: 21350, change: 3.2 },
        'NVDA': { price: 35890, change: 2.8 },
        'META': { price: 33540, change: 1.1 },
    };
    const data = stockPrices[symbol];
    if (data) return { price: data.price, changePercent: data.change };
    return { price: 500 + Math.random() * 3000, changePercent: (Math.random() - 0.5) * 4 };
}

function fetchCommodityPrice(id) {
    const prices = {
        'gold': { price: 62500, change: 0.3 },
        'silver': { price: 74500, change: 0.8 },
        'crude-oil': { price: 6200, change: -1.2 },
    };
    return prices[id] || { price: 1000, changePercent: 0 };
}

export async function fetchPrice(type, id) {
    const cacheKey = `${type}-${id}`;
    const cached = getCached(cacheKey, type);
    if (cached) return cached;

    let result = { price: 0, changePercent: 0 };

    try {
        switch (type) {
            case 'Crypto':
                result = await fetchCryptoPrice(id);
                break;
            case 'Forex':
                result = await fetchForexPrice(id);
                break;
            case 'IndianStock':
            case 'USStock':
                // Use stockApi for real prices (same as Investments tab)
                try {
                    const { stockApi } = await import('./stockApi.js');
                    const exchange = type === 'IndianStock' ? 'NSE' : 'US';
                    const priceData = await stockApi.fetchStockPrice(id, exchange);
                    if (priceData && priceData.currentPrice) {
                        result = {
                            price: priceData.currentPrice,
                            changePercent: priceData.dayChangePercent || 0
                        };
                    }
                } catch (e) {
                    console.error('Stock price fetch error:', e);
                    result = fetchStockPrice(id, type === 'IndianStock' ? 'NSE' : 'US');
                }
                break;
            case 'MutualFund':
                // Use stockApi for MF NAV
                try {
                    const { stockApi } = await import('./stockApi.js');
                    const navData = await stockApi.fetchMutualFundNAV(id);
                    if (navData && navData.nav) {
                        result = {
                            price: navData.nav,
                            changePercent: navData.dayChangePercent || 0
                        };
                    }
                } catch (e) {
                    result = { price: 100, changePercent: 0 };
                }
                break;
            case 'Commodity':
                result = fetchCommodityPrice(id);
                break;
            default:
                result = { price: 100, changePercent: 0 };
        }
        setCache(cacheKey, result);
    } catch (e) {
        console.error('Price fetch error:', e);
    }
    return result;
}

export async function fetchPrices(items) {
    const results = {};
    const grouped = {};
    items.forEach(item => {
        if (!grouped[item.type]) grouped[item.type] = [];
        grouped[item.type].push(item);
    });

    if (grouped.Crypto && grouped.Crypto.length > 0) {
        const ids = grouped.Crypto.map(i => i.id).join(',');
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=inr&include_24hr_change=true`);
            const data = await res.json();
            grouped.Crypto.forEach(item => {
                const key = `${item.type}-${item.id}`;
                if (data[item.id]) {
                    results[key] = { price: data[item.id].inr || 0, changePercent: data[item.id].inr_24h_change || 0 };
                    setCache(key, results[key]);
                }
            });
        } catch (e) { }
    }

    const otherTypes = Object.keys(grouped).filter(t => t !== 'Crypto');
    for (const type of otherTypes) {
        for (const item of grouped[type]) {
            results[`${item.type}-${item.id}`] = await fetchPrice(item.type, item.id);
        }
    }
    return results;
}

/**
 * Unified smart search - uses stockApi for stocks (same as Investments tab)
 */
export async function smartSearch(query) {
    if (!query || query.length < 2) return [];

    const results = [];
    const q = query.toUpperCase();

    // 1. Search Crypto (CoinGecko)
    try {
        const cryptoRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
        const cryptoData = await cryptoRes.json();
        (cryptoData.coins || []).slice(0, 5).forEach(c => {
            results.push({ id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, type: 'Crypto', emoji: '₿' });
        });
    } catch (e) { console.error('Crypto search error:', e); }

    // 2. Search Stocks (using stockApi - same as Investments tab)
    try {
        const { stockApi } = await import('./stockApi.js');
        const stockResults = await stockApi.searchStock(query);
        (stockResults || []).slice(0, 10).forEach(stock => {
            const isIndian = stock.exchange === 'NSE' || stock.exchange === 'BSE';
            results.push({
                id: stock.symbol,
                symbol: stock.symbol,
                name: stock.description,
                type: isIndian ? 'IndianStock' : 'USStock',
                emoji: isIndian ? '🇮🇳' : '🇺🇸'
            });
        });
    } catch (e) { console.error('Stock search error:', e); }

    // 3. Forex (local matching)
    const forexPairs = [
        { id: 'USD', symbol: 'USD/INR', name: 'US Dollar' },
        { id: 'EUR', symbol: 'EUR/INR', name: 'Euro' },
        { id: 'GBP', symbol: 'GBP/INR', name: 'British Pound' },
    ];
    forexPairs.forEach(f => {
        if (f.id.includes(q) || f.name.toUpperCase().includes(q)) {
            results.push({ ...f, type: 'Forex', emoji: '💱' });
        }
    });

    // 4. Commodities (local matching)
    const commodities = [
        { id: 'gold', symbol: 'GOLD', name: 'Gold' },
        { id: 'silver', symbol: 'SILVER', name: 'Silver' },
        { id: 'crude-oil', symbol: 'CRUDEOIL', name: 'Crude Oil' },
    ];
    commodities.forEach(c => {
        if (c.symbol.includes(q) || c.name.toUpperCase().includes(q)) {
            results.push({ ...c, type: 'Commodity', emoji: '🛢️' });
        }
    });

    return results.slice(0, 15);
}

export async function searchAssets(type, query) {
    return smartSearch(query);
}

const chartCache = new Map();

export async function fetchChartData(type, id, timeframe = '1D') {
    const cacheKey = `chart-${type}-${id}-${timeframe}`;
    const cached = chartCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60000) return cached.data;

    const days = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365 }[timeframe] || 1;

    try {
        if (type === 'Crypto') {
            const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=inr&days=${days}`);
            const data = await res.json();
            if (data.prices) {
                const chartData = data.prices.map(([time, value]) => ({ time: Math.floor(time / 1000), value }));
                chartCache.set(cacheKey, { data: chartData, timestamp: Date.now() });
                return chartData;
            }
        }
    } catch (e) { }

    const priceData = await fetchPrice(type, id);
    const chartData = generateMockChart(priceData.price || 100, timeframe);
    chartCache.set(cacheKey, { data: chartData, timestamp: Date.now() });
    return chartData;
}

function generateMockChart(basePrice, timeframe) {
    const points = { '1D': 48, '1W': 168, '1M': 30, '3M': 90, '1Y': 365 }[timeframe] || 48;
    const interval = { '1D': 1800, '1W': 3600, '1M': 86400, '3M': 86400, '1Y': 86400 }[timeframe] || 1800;
    const now = Math.floor(Date.now() / 1000);
    let price = basePrice * 0.95;
    const volatility = timeframe === '1D' ? 0.005 : 0.015;
    return Array.from({ length: points }, (_, i) => {
        price = price * (1 + (Math.random() - 0.48) * volatility);
        return { time: now - (points - i - 1) * interval, value: price };
    });
}
