/**
 * Portfolio Utility - Consolidated Holdings Manager
 * 
 * Provides centralized access to all portfolio holdings:
 * - Crypto holdings (from Markets page)
 * - Forex holdings (from Markets page)
 * - Commodities holdings (from Markets page)
 * 
 * Used by Dashboard, Reports, and Portfolio pages for net worth calculation
 */

// Get Markets holdings (unified crypto, forex, commodities)
export const getMarketsHoldings = () => {
    try {
        const saved = localStorage.getItem('pocketwall_markets_holdings');
        return saved ? JSON.parse(saved) : { entries: [] };
    } catch {
        return { entries: [] };
    }
};

// Legacy: Get Crypto holdings value (for backward compatibility)
export const getCryptoHoldings = () => {
    try {
        const saved = localStorage.getItem('pocketwall_crypto_holdings');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
};

// Legacy: Get Forex holdings value
export const getForexHoldings = () => {
    try {
        const saved = localStorage.getItem('pocketwall_forex_holdings');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
};

// Legacy: Get Commodities holdings value
export const getCommoditiesHoldings = () => {
    try {
        const saved = localStorage.getItem('pocketwall_commodities_holdings');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
};

// Calculate total invested from Markets (new unified structure)
const getMarketsInvestedByType = (type) => {
    const holdings = getMarketsHoldings();
    return (holdings.entries || [])
        .filter(e => !type || e.assetType === type)
        .reduce((total, e) => total + (e.invested || 0), 0);
};

// Calculate total invested in Forex
export const getForexTotalInvested = () => {
    // Check new Markets format first
    const marketsTotal = getMarketsInvestedByType('Forex');
    if (marketsTotal > 0) return marketsTotal;

    // Fallback to legacy format
    const holdings = getForexHoldings();
    if (holdings.entries) {
        return holdings.entries.reduce((total, e) => total + (e.invested || 0), 0);
    }
    return Object.values(holdings).reduce((total, data) => {
        if (typeof data === 'object' && data.invested) return total + data.invested;
        return total;
    }, 0);
};

// Calculate total invested in Commodities
export const getCommoditiesTotalInvested = () => {
    // Check new Markets format first
    const marketsTotal = getMarketsInvestedByType('Commodity');
    if (marketsTotal > 0) return marketsTotal;

    // Fallback to legacy format
    const holdings = getCommoditiesHoldings();
    if (holdings.entries) {
        return holdings.entries.reduce((total, e) => total + (e.invested || 0), 0);
    }
    return Object.values(holdings).reduce((total, data) => {
        if (typeof data === 'object' && data.invested) return total + data.invested;
        return total;
    }, 0);
};

// Calculate total invested in Crypto
export const getCryptoTotalInvested = () => {
    // Check new Markets format first
    const marketsTotal = getMarketsInvestedByType('Crypto');
    if (marketsTotal > 0) return marketsTotal;

    // Fallback to legacy format
    const holdings = getCryptoHoldings();
    return Object.values(holdings).reduce((total, data) => {
        if (typeof data === 'number') return total;
        return total + (data.invested || 0);
    }, 0);
};

// Get all portfolio totals
export const getPortfolioTotals = () => {
    return {
        crypto: { invested: getCryptoTotalInvested() },
        forex: { invested: getForexTotalInvested() },
        commodities: { invested: getCommoditiesTotalInvested() },
        totalInvested: getCryptoTotalInvested() + getForexTotalInvested() + getCommoditiesTotalInvested()
    };
};

// Summary for Dashboard
export const getAssetsSummary = () => {
    const markets = getMarketsHoldings();
    const entries = markets.entries || [];

    return {
        cryptoCount: entries.filter(e => e.assetType === 'Crypto').length,
        forexCount: entries.filter(e => e.assetType === 'Forex').length,
        commoditiesCount: entries.filter(e => e.assetType === 'Commodity').length,
        totalAssets: entries.length,
        cryptoInvested: getCryptoTotalInvested(),
        forexInvested: getForexTotalInvested(),
        commoditiesInvested: getCommoditiesTotalInvested()
    };
};

export default {
    getMarketsHoldings,
    getCryptoHoldings,
    getForexHoldings,
    getCommoditiesHoldings,
    getPortfolioTotals,
    getAssetsSummary,
    getCryptoTotalInvested,
    getForexTotalInvested,
    getCommoditiesTotalInvested
};
