// Stock Market API Integration using Finnhub
// Free tier: 60 API calls/minute

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// User's Finnhub API key for real-time data  
let FINNHUB_API_KEY = 'd4grlq1r01qgvvc4s590d4grlq1r01qgvvc4s59g';

// Price cache to minimize API calls (5-minute cache)
const priceCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
let apiCallCount = 0;
let resetTime = Date.now() + 60000;

export const stockApi = {
    setApiKey(key) {
        FINNHUB_API_KEY = key;
    },

    hasApiKey() {
        return FINNHUB_API_KEY && FINNHUB_API_KEY !== 'demo';
    },

    async fetchStockPrice(symbol, exchange) {
        // Handle Mutual Funds
        if (exchange === 'MF' || exchange === 'Mutual Fund') {
            return this.fetchMutualFundNAV(symbol);
        }

        let fullSymbol;
        // Determine full symbol for API/Cache key
        if (exchange === 'US' || exchange === 'NASDAQ' || exchange === 'NYSE') {
            fullSymbol = symbol;
        } else {
            const suffix = exchange === 'NSE' ? 'NS' : 'BO';
            fullSymbol = `${symbol}.${suffix}`;
        }

        // Check cache first
        const cached = priceCache.get(fullSymbol);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`📊 Using cached price for ${fullSymbol}`);
            return cached.data;
        }

        // Rate limiting check (only for direct API calls, not IPC)
        if (!window.api && Date.now() > resetTime) {
            apiCallCount = 0;
            resetTime = Date.now() + 60000;
        }

        if (!window.api && apiCallCount >= 55) {
            console.warn('⚠️ API rate limit approaching');
            return cached?.data || null;
        }

        console.log(`🔄 Fetching real-time price for ${fullSymbol}...`);

        try {
            let result;

            // PREFERRED: Use Main Process (Electron) if available
            // This bypasses CORS and uses Yahoo Finance for better Indian stock support
            if (window.api && window.api.fetchStockPrice) {
                try {
                    const data = await window.api.fetchStockPrice(symbol, exchange);
                    if (data && data.price) {
                        result = {
                            symbol: fullSymbol,
                            baseSymbol: symbol,
                            exchange: exchange,
                            currentPrice: data.price,
                            previousClose: data.price - data.change,
                            dayChange: data.change,
                            dayChangePercent: data.changePercent,
                            timestamp: Date.now()
                        };
                    }
                } catch (ipcError) {
                    console.error('IPC fetch failed, falling back to Finnhub:', ipcError);
                    // Fallback to Finnhub below
                }
            }

            // FALLBACK: Use Finnhub (Web Mode or IPC failure)
            if (!result) {
                const url = `${FINNHUB_BASE_URL}/quote?symbol=${fullSymbol}&token=${FINNHUB_API_KEY}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                apiCallCount++;

                if (data.c && data.c > 0) {
                    result = {
                        symbol: fullSymbol,
                        baseSymbol: symbol,
                        exchange: exchange,
                        currentPrice: data.c,
                        previousClose: data.pc,
                        dayHigh: data.h,
                        dayLow: data.l,
                        dayOpen: data.o,
                        dayChange: data.c - data.pc,
                        dayChangePercent: ((data.c - data.pc) / data.pc) * 100,
                        timestamp: Date.now()
                    };
                }
            }

            if (result) {
                priceCache.set(fullSymbol, {
                    data: result,
                    timestamp: Date.now()
                });

                console.log(`✅ Price fetched: ${fullSymbol} = ${result.currentPrice}`);
                return result;
            } else {
                // Fallback to demo data if API fails or returns 0
                console.warn(`⚠️ Invalid price data for ${fullSymbol}, falling back to demo/mock`);
                return this.getDemoPrice(symbol);
            }

        } catch (error) {
            console.error(`❌ Error fetching price for ${fullSymbol}:`, error.message);

            // Try to return cached data even if expired
            const cached = priceCache.get(fullSymbol);
            if (cached) {
                console.log(`📊 Returning expired cache`);
                return { ...cached.data, isStale: true };
            }

            return this.getDemoPrice(symbol);
        }
    },

    async fetchMultiplePrices(stocks) {
        const promises = stocks.map(stock =>
            this.fetchStockPrice(stock.symbol, stock.exchange)
        );
        const results = await Promise.allSettled(promises);
        return results.map((result, index) => ({
            ...stocks[index],
            priceData: result.status === 'fulfilled' ? result.value : null
        }));
    },

    async searchStock(query) {
        if (!query || query.length < 2) return [];
        try {
            const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            return (data.result || []).map(stock => {
                let exchange = 'US';
                let symbol = stock.symbol;

                if (stock.symbol.endsWith('.NS')) {
                    exchange = 'NSE';
                    symbol = stock.symbol.replace('.NS', '');
                } else if (stock.symbol.endsWith('.BO')) {
                    exchange = 'BSE';
                    symbol = stock.symbol.replace('.BO', '');
                }

                return {
                    symbol: symbol,
                    fullSymbol: stock.symbol,
                    description: stock.description,
                    exchange: exchange
                };
            });
        } catch (error) {
            console.error('Error searching stocks:', error);
            return [];
        }
    },

    // Cache for MF List
    mfListCache: null,

    async searchMutualFund(query) {
        if (!query || query.length < 2) return [];
        try {
            // Fetch list if not cached in memory
            if (!this.mfListCache) {
                console.log('Fetching MF Master List...');
                const response = await fetch('https://api.mfapi.in/mf');
                if (!response.ok) throw new Error('Failed to fetch MF list');
                this.mfListCache = await response.json();
                console.log(`Loaded ${this.mfListCache.length} mutual funds`);
            }

            const lowerQuery = query.toLowerCase();
            const terms = lowerQuery.split(' ').filter(t => t.length > 0);

            // Filter locally (limit to 50 results for performance)
            // Prioritize matches that start with the query
            return this.mfListCache
                .filter(mf => {
                    const name = mf.schemeName.toLowerCase();
                    return terms.every(term => name.includes(term));
                })
                .slice(0, 50)
                .map(mf => ({
                    code: mf.schemeCode.toString(),
                    name: mf.schemeName,
                    exchange: 'MF'
                }));
        } catch (error) {
            console.error('Error searching mutual funds:', error);
            return [];
        }
    },

    // Added for Mutual Funds support
    async fetchMutualFundNAV(schemeCode) {
        try {
            // Use mfapi.in for Indian Mutual Funds (Public API)
            const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
            if (!response.ok) throw new Error('Failed to fetch NAV');

            const data = await response.json();
            if (data && data.data && data.data.length > 0) {
                const currentNav = parseFloat(data.data[0].nav);
                const previousNav = data.data.length > 1 ? parseFloat(data.data[1].nav) : currentNav;
                const change = currentNav - previousNav;
                const changePercent = previousNav > 0 ? (change / previousNav) * 100 : 0;

                return {
                    nav: currentNav,
                    currentPrice: currentNav, // Alias for unified API
                    date: data.data[0].date,
                    schemeName: data.meta.scheme_name,
                    previousClose: previousNav,
                    dayChange: change,
                    dayChangePercent: changePercent,
                    timestamp: Date.now()
                };
            }
            throw new Error('Invalid data format');
        } catch (error) {
            console.error('Error fetching MF NAV:', error);
            return null;
        }
    },

    clearCache() {
        priceCache.clear();
        console.log('🗑️ Cache cleared');
    },

    getCacheStats() {
        return {
            size: priceCache.size,
            items: Array.from(priceCache.keys()),
            apiCallsThisMinute: apiCallCount
        };
    },

    getDemoPrice(symbol) {
        const demoData = {
            'RELIANCE': { price: 2450.50, change: 25.30 },
            'TCS': { price: 3650.75, change: -15.50 },
            'AAPL': { price: 189.97, change: 2.34 },
            'GOOGL': { price: 141.80, change: -1.23 },
            'VOO': { price: 450.20, change: 1.50 },
            'SPY': { price: 510.10, change: 2.10 }
        };

        const demo = demoData[symbol.toUpperCase()];
        if (demo) {
            return {
                symbol: symbol,
                currentPrice: demo.price,
                previousClose: demo.price - demo.change,
                dayChange: demo.change,
                dayChangePercent: (demo.change / (demo.price - demo.change)) * 100,
                dayHigh: demo.price + Math.abs(demo.change) * 0.5,
                dayLow: demo.price - Math.abs(demo.change) * 0.5,
                dayOpen: demo.price - demo.change * 0.3,
                timestamp: Date.now(),
                isDemo: true
            };
        }

        // Return null for unknown symbols instead of random data
        console.warn(`⚠️ No demo data for ${symbol}, and API failed.`);
        return null;
    }
};

export default stockApi;
