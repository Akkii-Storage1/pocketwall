/**
 * CurrencyConverter with Live Exchange Rates
 * - Fetches rates on app startup (background, no notification)
 * - Caches for 10 minutes
 * - Fallback to hardcoded rates if API fails
 */

// Fallback/Default rates (1 INR = X target currency)
const DEFAULT_EXCHANGE_RATES = {
    INR: 1,
    USD: 0.0119,    // 1 INR = ~0.0119 USD (₹84/$)
    EUR: 0.0110,    // 1 INR = ~0.0110 EUR
    GBP: 0.0095,    // 1 INR = ~0.0095 GBP
    JPY: 1.78,      // 1 INR = ~1.78 JPY
    AUD: 0.0180,    // 1 INR = ~0.018 AUD
    CAD: 0.0162,    // 1 INR = ~0.0162 CAD
    MYR: 0.053,     // 1 INR = ~0.053 MYR
    SGD: 0.016,     // 1 INR = ~0.016 SGD
    THB: 0.41,      // 1 INR = ~0.41 THB
    AED: 0.0437     // 1 INR = ~0.0437 AED
};

// Live rates storage
let liveRates = { ...DEFAULT_EXCHANGE_RATES };
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
let isFetching = false;

export const CURRENCY_LOCALES = {
    INR: 'en-IN',
    USD: 'en-US',
    EUR: 'de-DE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    AUD: 'en-AU',
    CAD: 'en-CA',
    MYR: 'ms-MY',
    SGD: 'en-SG',
    THB: 'th-TH',
    AED: 'ar-AE'
};

// Fetch live rates from API (silent, background)
async function fetchLiveRates() {
    if (isFetching) return;

    const now = Date.now();
    if (now - lastFetchTime < CACHE_DURATION) {
        return; // Use cached rates
    }

    isFetching = true;

    try {
        // Using exchangerate-api.com free tier (1500 requests/month)
        // Alternative: Open Exchange Rates, Fixer.io
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();

            // Update live rates
            if (data.rates) {
                liveRates = {
                    INR: 1,
                    USD: data.rates.USD || DEFAULT_EXCHANGE_RATES.USD,
                    EUR: data.rates.EUR || DEFAULT_EXCHANGE_RATES.EUR,
                    GBP: data.rates.GBP || DEFAULT_EXCHANGE_RATES.GBP,
                    JPY: data.rates.JPY || DEFAULT_EXCHANGE_RATES.JPY,
                    AUD: data.rates.AUD || DEFAULT_EXCHANGE_RATES.AUD,
                    CAD: data.rates.CAD || DEFAULT_EXCHANGE_RATES.CAD,
                    MYR: data.rates.MYR || DEFAULT_EXCHANGE_RATES.MYR,
                    SGD: data.rates.SGD || DEFAULT_EXCHANGE_RATES.SGD,
                    THB: data.rates.THB || DEFAULT_EXCHANGE_RATES.THB,
                    AED: data.rates.AED || DEFAULT_EXCHANGE_RATES.AED
                };
                lastFetchTime = now;
                console.log('[CurrencyConverter] Live rates updated:', new Date().toLocaleTimeString());
            }
        }
    } catch (error) {
        // Silently fail - use default rates
        console.warn('[CurrencyConverter] Failed to fetch live rates, using defaults');
    } finally {
        isFetching = false;
    }
}

// Initialize on module load
fetchLiveRates();

// Export current rates (for debugging)
export const EXCHANGE_RATES = liveRates;

export const CurrencyConverter = {
    // Force refresh rates (can be called manually)
    async refreshRates() {
        lastFetchTime = 0; // Reset cache
        await fetchLiveRates();
    },

    // Get current rates
    getRates() {
        return { ...liveRates };
    },

    // Get last update time
    getLastUpdateTime() {
        return lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : 'Not fetched';
    },

    convert(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return amount;
        if (!amount || isNaN(amount)) return 0;

        const fromRate = liveRates[fromCurrency] || DEFAULT_EXCHANGE_RATES[fromCurrency] || 1;
        const toRate = liveRates[toCurrency] || DEFAULT_EXCHANGE_RATES[toCurrency] || 1;

        // Formula: (Amount / Rate_From) * Rate_To
        // Rates are "1 INR = X target", so INR is base (1)
        return (amount / fromRate) * toRate;
    },

    format(amount, currency, compact = false) {
        const code = currency || 'INR';
        const locale = CURRENCY_LOCALES[code] || 'en-US';

        if (compact && Math.abs(amount) >= 100000) {
            // Compact format for large numbers
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: code,
                notation: 'compact',
                maximumFractionDigits: 1
            }).format(amount);
        }

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: code,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }
};

export default CurrencyConverter;
