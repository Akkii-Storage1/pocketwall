// Cryptocurrency Price API
// Robust implementation with 3-tier fallback:
// 1. CoinGecko (Primary - Best Data)
// 2. CoinCap (Secondary - Backup)
// 3. Binance (Tertiary - Reliable Ticker)

const COINCAP_BASE_URL = 'https://api.coincap.io/v2';
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

const CACHE_KEY = 'pocketwall_crypto_prices';
const CACHE_DURATION = 60 * 1000; // 1 minute cache

// Exchange Rate Cache
let usdInrRate = 84.5;
let lastRateFetch = 0;

/**
 * Fetch USD to INR rate
 */
async function fetchExchangeRate() {
    // Refresh rate every hour
    if (Date.now() - lastRateFetch < 3600000) return usdInrRate;

    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (response.ok) {
            const data = await response.json();
            if (data.rates && data.rates.INR) {
                usdInrRate = data.rates.INR;
                lastRateFetch = Date.now();
                console.log('Updated USD/INR Rate:', usdInrRate);
            }
        }
    } catch (e) {
        console.warn('Failed to fetch exchange rate, using default:', usdInrRate);
    }
    return usdInrRate;
}

/**
 * Get cached crypto prices
 * @returns {object|null} - Cached prices or null
 */
function getCachedPrices() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        // Return data regardless of age, let caller decide if it's too old
        // But add metadata about age
        return { data, timestamp, age: Date.now() - timestamp };
    } catch (error) {
        console.error('Error reading cached crypto prices:', error);
        return null;
    }
}

/**
 * Cache crypto prices
 * @param {object} data - Crypto price data
 */
function cachePrices(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error caching crypto prices:', error);
    }
}

// --- API IMPLEMENTATIONS ---

async function fetchCoinGecko(ids) {
    console.log('Trying CoinGecko API...');
    const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?ids=${ids.join(',')}&vs_currencies=inr&include_24hr_change=true`);
    if (!response.ok) throw new Error(`CoinGecko failed: ${response.status}`);

    const data = await response.json();
    const prices = {};

    ids.forEach(id => {
        if (data[id]) {
            prices[id] = {
                price: data[id].inr || 0,
                change: data[id].inr_24h_change || 0,
                source: 'CoinGecko'
            };
        }
    });

    return prices;
}

async function fetchCoinCap(ids) {
    console.log('Trying CoinCap API...');
    await fetchExchangeRate(); // Ensure we have USD rate

    const response = await fetch(`${COINCAP_BASE_URL}/assets?ids=${ids.join(',')}`);
    if (!response.ok) throw new Error(`CoinCap failed: ${response.status}`);

    const json = await response.json();
    const prices = {};

    json.data.forEach(asset => {
        prices[asset.id] = {
            price: parseFloat(asset.priceUsd) * usdInrRate,
            change: parseFloat(asset.changePercent24Hr),
            source: 'CoinCap'
        };
    });

    return prices;
}

async function fetchBinance(ids) {
    console.log('Trying Binance API...');
    await fetchExchangeRate();

    // Binance uses symbols like BTCUSDT, not ids like 'bitcoin'
    // We need a mapping. This is a partial mapping for common coins.
    const idToSymbol = {
        'bitcoin': 'BTCUSDT',
        'ethereum': 'ETHUSDT',
        'binancecoin': 'BNBUSDT',
        'solana': 'SOLUSDT',
        'ripple': 'XRPUSDT',
        'cardano': 'ADAUSDT',
        'dogecoin': 'DOGEUSDT',
        'polkadot': 'DOTUSDT',
        'matic-network': 'MATICUSDT',
        'shiba-inu': 'SHIBUSDT'
    };

    const prices = {};
    const promises = ids.map(async (id) => {
        const symbol = idToSymbol[id];
        if (!symbol) return; // Skip if no mapping

        try {
            const res = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${symbol}`);
            if (!res.ok) return;
            const data = await res.json();

            prices[id] = {
                price: parseFloat(data.lastPrice) * usdInrRate,
                change: parseFloat(data.priceChangePercent),
                source: 'Binance'
            };
        } catch (e) {
            // Ignore individual failures
        }
    });

    await Promise.all(promises);

    if (Object.keys(prices).length === 0) throw new Error("Binance returned no data");
    return prices;
}

// --- MAIN EXPORTED FUNCTION ---

/**
 * Get multiple crypto prices with robust fallback
 * @param {Array<string>} coinIds - Array of coin IDs
 * @param {string} currency - Target currency (default: 'inr')
 * @returns {Promise<object>} - Object with coinId: { price, change }
 */
export async function getMultipleCryptoPrices(coinIds, currency = 'inr') {
    // 1. Check Cache Validity
    const cached = getCachedPrices();
    if (cached && cached.age < CACHE_DURATION) {
        console.log('Using fresh cache');
        return cached.data;
    }

    let newPrices = null;

    // 2. Try APIs in order
    try {
        newPrices = await fetchCoinGecko(coinIds);
    } catch (e1) {
        console.warn(e1.message);
        try {
            newPrices = await fetchCoinCap(coinIds);
        } catch (e2) {
            console.warn(e2.message);
            try {
                newPrices = await fetchBinance(coinIds);
            } catch (e3) {
                console.error("All APIs failed:", e3.message);
            }
        }
    }

    // 3. Process Result
    if (newPrices && Object.keys(newPrices).length > 0) {
        // Merge with existing cache to preserve data for coins that might have failed in this specific call
        const merged = { ...(cached?.data || {}), ...newPrices };
        cachePrices(merged);
        return merged;
    }

    // 4. Fallback to Stale Cache
    if (cached && cached.data) {
        console.warn('Returning stale cache due to API failures');
        return cached.data;
    }

    // 5. Last Resort: Hardcoded Fallbacks
    console.warn('Using hardcoded fallbacks');
    const fallbackData = {};
    coinIds.forEach(id => {
        if (FALLBACK_PRICES[id]) {
            fallbackData[id] = { ...FALLBACK_PRICES[id], source: 'Estimated' };
        } else {
            // Even if not in fallback list, return 0 instead of crashing
            fallbackData[id] = { price: 0, change: 0, source: 'Unknown' };
        }
    });

    return fallbackData;
}

/**
 * Search for a cryptocurrency
 */
export async function searchCrypto(query) {
    try {
        const response = await fetch(`${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return (data.coins || []).slice(0, 10).map(coin => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol.toUpperCase(),
            thumb: coin.thumb,
            marketCapRank: coin.market_cap_rank
        }));
    } catch (error) {
        console.error('Error searching crypto:', error);
        throw error;
    }
}

// Common cryptocurrency IDs
// Hardcoded fallback prices (approximate) to ensure app NEVER shows empty/0
const FALLBACK_PRICES = {
    'bitcoin': { price: 8200000, change: 0 },
    'ethereum': { price: 320000, change: 0 },
    'binancecoin': { price: 55000, change: 0 },
    'solana': { price: 12000, change: 0 },
    'ripple': { price: 50, change: 0 },
    'cardano': { price: 40, change: 0 },
    'dogecoin': { price: 12, change: 0 },
    'polkadot': { price: 600, change: 0 },
    'matic-network': { price: 60, change: 0 },
    'shiba-inu': { price: 0.002, change: 0 },
    'chainlink': { price: 1200, change: 0 },
    'uniswap': { price: 800, change: 0 },
    'litecoin': { price: 7000, change: 0 },
    'avalanche-2': { price: 3000, change: 0 }
};

export const POPULAR_CRYPTO_IDS = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'binancecoin',
    ADA: 'cardano',
    SOL: 'solana',
    DOT: 'polkadot',
    MATIC: 'matic-network',
    AVAX: 'avalanche-2',
    UNI: 'uniswap',
    LINK: 'chainlink'
};

export default {
    getMultipleCryptoPrices,
    searchCrypto,
    POPULAR_CRYPTO_IDS
};
