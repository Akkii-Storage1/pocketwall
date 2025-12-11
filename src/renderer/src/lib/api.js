// API Helper for Stock Data
// We will use Finnhub Free Tier or Alpha Vantage

const API_KEY = 'YOUR_FINNHUB_API_KEY'; // We will need to ask user for this or provide a default free one
const BASE_URL = 'https://finnhub.io/api/v1';

export async function getStockQuote(symbol) {
    // For now, return mock data to avoid hitting limits during dev
    console.log(`Fetching quote for ${symbol}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        c: 150.25 + Math.random() * 5, // Current price
        d: 2.5, // Change
        dp: 1.6, // Percent change
        h: 152.00,
        l: 149.00,
        o: 149.50,
        pc: 147.75
    };
}

export async function searchSymbols(query) {
    // Mock search
    return [
        { description: 'APPLE INC', displaySymbol: 'AAPL', symbol: 'AAPL' },
        { description: 'MICROSOFT CORP', displaySymbol: 'MSFT', symbol: 'MSFT' },
        { description: 'TESLA INC', displaySymbol: 'TSLA', symbol: 'TSLA' },
    ];
}
