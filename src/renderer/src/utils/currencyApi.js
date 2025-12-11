// Currency Exchange Rate API
// Uses ExchangeRate-API (free, no API key required)
// Rate limit: 1,500 requests/month on free tier

const BASE_URL = 'https://api.exchangerate-api.com/v4/latest';
const CACHE_KEY = 'pocketwall_exchange_rates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached exchange rates if available and not expired
 * @returns {object|null} - Cached rates or null
 */
function getCachedRates() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < CACHE_DURATION) {
            return data;
        }

        // Cache expired
        localStorage.removeItem(CACHE_KEY);
        return null;
    } catch (error) {
        console.error('Error reading cached rates:', error);
        return null;
    }
}

/**
 * Cache exchange rates
 * @param {object} data - Exchange rate data
 */
function cacheRates(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error caching rates:', error);
    }
}

/**
 * Get exchange rate from one currency to another
 * @param {string} from - Source currency code (e.g., 'USD')
 * @param {string} to - Target currency code (e.g., 'INR')
 * @returns {Promise<number>} - Exchange rate
 */
export async function getExchangeRate(from, to) {
    try {
        // Check cache first
        const cached = getCachedRates();
        if (cached && cached.base === from && cached.rates[to]) {
            return cached.rates[to];
        }

        // Fetch fresh data
        const response = await fetch(`${BASE_URL}/${from}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Cache the response
        cacheRates(data);

        return data.rates[to];
    } catch (error) {
        console.error('Error fetching exchange rate:', error);

        // Try to return cached data even if expired
        const cached = getCachedRates();
        if (cached && cached.rates[to]) {
            console.warn('Using expired cache due to API error');
            return cached.rates[to];
        }

        throw new Error('Failed to fetch exchange rate. Please check your internet connection.');
    }
}

/**
 * Get all exchange rates for a base currency
 * @param {string} baseCurrency - Base currency code (default: 'USD')
 * @returns {Promise<object>} - Object with rates and metadata
 */
export async function getAllRates(baseCurrency = 'USD') {
    try {
        // Check cache first
        const cached = getCachedRates();
        if (cached && cached.base === baseCurrency) {
            return cached;
        }

        // Fetch fresh data
        const response = await fetch(`${BASE_URL}/${baseCurrency}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Cache the response
        cacheRates(data);

        return data;
    } catch (error) {
        console.error('Error fetching exchange rates:', error);

        // Try to return cached data even if expired
        const cached = getCachedRates();
        if (cached) {
            console.warn('Using expired cache due to API error');
            return cached;
        }

        throw new Error('Failed to fetch exchange rates. Please check your internet connection.');
    }
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} from - Source currency code
 * @param {string} to - Target currency code
 * @returns {Promise<number>} - Converted amount
 */
export async function convertCurrency(amount, from, to) {
    if (from === to) return amount;

    const rate = await getExchangeRate(from, to);
    return amount * rate;
}

/**
 * Clear cached exchange rates (useful for manual refresh)
 */
export function clearRateCache() {
    localStorage.removeItem(CACHE_KEY);
}

/**
 * Get cache age in milliseconds
 * @returns {number|null} - Age in ms or null if no cache
 */
export function getCacheAge() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const { timestamp } = JSON.parse(cached);
        return Date.now() - timestamp;
    } catch (error) {
        return null;
    }
}

export default {
    getExchangeRate,
    getAllRates,
    convertCurrency,
    clearRateCache,
    getCacheAge
};
