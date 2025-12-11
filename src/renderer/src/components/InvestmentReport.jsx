import React, { useState, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';

const InvestmentReport = ({ isDark, onBack }) => {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState('INR');
    const textColor = isDark ? '#e0e0e0' : '#333333';
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const settings = await DataAdapter.getUserSettings();
        const userCurrency = settings.defaultCurrency || 'INR';
        setCurrency(userCurrency);

        const inv = await DataAdapter.getInvestments();
        console.log('Regular Investments:', inv);

        // Fetch Crypto Holdings
        const cryptoHoldings = JSON.parse(localStorage.getItem('pocketwall_crypto_holdings') || '{}');

        // Check if we need to update prices
        let cryptoPrices = JSON.parse(localStorage.getItem('pocketwall_crypto_prices') || '{}')?.data || {};

        // Check for stale data (older than 5 minutes)
        const lastUpdate = JSON.parse(localStorage.getItem('pocketwall_crypto_prices') || '{}')?.timestamp || 0;
        const isStale = (Date.now() - lastUpdate) > (5 * 60 * 1000);

        if (isStale && Object.keys(cryptoHoldings).length > 0) {
            console.log('Crypto prices are stale, fetching update...');
            try {
                // Import dynamically to avoid circular dependencies if any
                const { getMultipleCryptoPrices } = await import('../utils/cryptoApi');
                const coinIds = Object.keys(cryptoHoldings);
                if (coinIds.length > 0) {
                    const newPrices = await getMultipleCryptoPrices(coinIds, 'inr');
                    cryptoPrices = newPrices;
                    console.log('Updated stale crypto prices:', newPrices);
                }
            } catch (e) {
                console.warn('Failed to auto-update crypto prices:', e);
            }
        }

        const cryptoItems = Object.entries(cryptoHoldings).map(([coinId, data]) => {
            const quantity = typeof data === 'number' ? data : (data.quantity || 0);
            const invested = typeof data === 'number' ? 0 : (data.invested || 0);
            const currentPrice = cryptoPrices[coinId]?.price || 0;

            return {
                id: `crypto-${coinId}`,
                name: coinId.toUpperCase(),
                amount: invested, // Invested Amount in INR
                currentValue: quantity * currentPrice,
                type: 'Crypto',
                assetClass: 'Crypto'
            };
        });

        // Fetch Fixed Assets
        let assetItems = [];
        try {
            const assets = await DataAdapter.getAssets();
            assetItems = assets.map(asset => ({
                id: `asset-${asset.id}`,
                name: asset.description || asset.name,
                symbol: asset.name,
                amount: parseFloat(asset.purchaseValue) || 0,
                currentValue: parseFloat(asset.currentValue) || 0,
                type: 'Fixed Asset',
                assetClass: 'Fixed Asset',
                quantity: 1,
                buyPrice: parseFloat(asset.purchaseValue) || 0
            }));
        } catch (e) {
            console.error('Failed to load assets', e);
        }

        // Process Mutual Funds and fetch latest NAVs
        const { stockApi } = await import('../utils/stockApi');

        // Helper to check if it's a US stock
        const isUSStock = (exchange) => ['US', 'NASDAQ', 'NYSE'].includes(exchange);
        const USD_TO_INR = 89.36; // Current approximate rate for valuation

        // Name to Symbol Mapping for common stocks
        const NAME_TO_SYMBOL = {
            'APPLE INC': 'AAPL',
            'TESLA INC': 'TSLA',
            'NHPC LTD': 'NHPC',
            'BAJAJ HOUSING FINANCE LTD': 'BAJAJHFL',
            'PI-NETWORK': 'PI'
        };

        const updatedInvestments = await Promise.all(inv.map(async (item) => {
            // Sanitize base fields
            let quantity = parseFloat(item.quantity) || 0;
            let buyPrice = parseFloat(item.buyPrice) || 0;
            // Use stored amount if available (it's already in INR from Investments.jsx), else calculate
            let amount = parseFloat(item.amount);

            // Auto-calculate amount if missing (fallback for old data)
            if (isNaN(amount) || amount === 0) {
                amount = quantity * buyPrice;
            }

            // Resolve Symbol
            let symbol = item.symbol;
            if (!symbol || symbol === item.name) {
                symbol = NAME_TO_SYMBOL[item.name.toUpperCase()] || item.symbol;
            }

            // Fix for US Stocks with unconverted amount
            // If exchange is US/NASDAQ/NYSE and amount is roughly equal to qty*price (USD), convert it
            if (['US', 'NASDAQ', 'NYSE'].includes(item.exchange)) {
                const rawUSD = quantity * buyPrice;
                // If amount is missing or within 1% of raw USD value, it means it wasn't converted
                if (!item.amount || Math.abs(amount - rawUSD) < (rawUSD * 0.01)) {
                    const rate = parseFloat(item.exchangeRate) || USD_TO_INR;
                    amount = rawUSD * rate;
                }
            }

            // Base item with sanitized fields
            const sanitizedItem = {
                ...item,
                symbol, // Update symbol
                quantity,
                buyPrice,
                amount: amount || 0, // Ensure never NaN
                currentValue: amount || 0, // Default current value
                originalCurrencyValue: null // For display
            };

            // Handle Mutual Funds
            if (item.assetClass === 'Mutual Fund' || item.exchange === 'MF') {
                try {
                    if (item.symbol && !isNaN(item.symbol)) {
                        const navData = await stockApi.fetchMutualFundNAV(item.symbol);
                        if (navData && navData.nav) {
                            const currentNav = navData.nav;
                            return {
                                ...sanitizedItem,
                                currentValue: quantity * currentNav,
                                currentPrice: currentNav
                            };
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to fetch NAV for ${item.name}`, e);
                }
                return sanitizedItem;
            }

            // Handle Stocks
            if (item.assetClass === 'Stock' || ['US', 'NSE', 'BSE', 'NASDAQ', 'NYSE'].includes(item.exchange)) {
                try {
                    // Determine exchange if missing but mapped
                    let exchange = item.exchange;
                    if (['AAPL', 'TSLA'].includes(symbol)) exchange = 'US';
                    if (['NHPC', 'BAJAJHFL'].includes(symbol)) exchange = 'NSE';

                    const priceData = await stockApi.fetchStockPrice(symbol, exchange);
                    if (priceData && priceData.currentPrice) {
                        let price = priceData.currentPrice;
                        let originalPrice = price;
                        let isUSD = isUSStock(exchange) || exchange === 'US';

                        // Convert USD to INR for Current Value (using current rate)
                        if (isUSD) {
                            price = price * USD_TO_INR;
                        }

                        return {
                            ...sanitizedItem,
                            currentValue: quantity * price,
                            currentPrice: price,
                            originalCurrencyValue: isUSD ? (quantity * originalPrice) : null,
                            currencySymbol: isUSD ? '$' : '₹'
                        };
                    }
                } catch (e) {
                    console.warn(`Failed to fetch price for ${item.name}`, e);
                }
                return sanitizedItem;
            }

            return sanitizedItem;
        }));

        const allInvestments = [...updatedInvestments, ...cryptoItems, ...assetItems];
        console.log('All Investments:', allInvestments);
        setInvestments(allInvestments);
        setLoading(false);
    };

    const parseValue = (val) => {
        if (typeof val === 'number') {
            return isNaN(val) ? 0 : val;
        }
        if (!val) return 0;
        const parsed = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(parsed) ? 0 : parsed;
    };

    const calculateStats = () => {
        console.log('Calculating stats for:', investments);
        const totalInvested = investments.reduce((sum, i) => {
            const amount = parseValue(i.amount);
            return sum + amount;
        }, 0);
        const currentValue = investments.reduce((sum, i) => {
            const val = i.currentValue !== undefined ? i.currentValue : i.amount;
            const value = parseValue(val);
            return sum + value;
        }, 0);
        const profit = currentValue - totalInvested;
        const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

        return { totalInvested, currentValue, profit, roi };
    };

    const formatMoney = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    // Helper to convert INR to display currency
    const toDisplay = (amountINR) => {
        return CurrencyConverter.convert(amountINR, 'INR', currency);
    };

    const { totalInvested, currentValue, profit, roi } = calculateStats();

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="text-blue-500 hover:underline">← Back to Reports</button>
                <h1 className="text-2xl font-bold" style={{ color: textColor }}>Investment Performance</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                    <h3 className="text-sm opacity-70" style={{ color: textColor }}>Total Invested</h3>
                    <p className="text-2xl font-bold" style={{ color: textColor }}>{formatMoney(toDisplay(totalInvested))}</p>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                    <h3 className="text-sm opacity-70" style={{ color: textColor }}>Current Value</h3>
                    <p className="text-2xl font-bold" style={{ color: textColor }}>{formatMoney(toDisplay(currentValue))}</p>
                </div>
                <div className="p-4 rounded-lg border" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                    <h3 className="text-sm opacity-70" style={{ color: textColor }}>Total Profit/Loss</h3>
                    <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {profit >= 0 ? '+' : ''}{formatMoney(toDisplay(profit))} ({roi.toFixed(2)}%)
                    </p>
                </div>
            </div>

            <div className="p-6 rounded-lg border shadow-sm" style={{ backgroundColor: bgColor, borderColor: isDark ? '#444' : '#ddd' }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: textColor }}>Asset Allocation</h2>
                <div className="space-y-2">
                    {investments.length === 0 ? (
                        <p className="opacity-50" style={{ color: textColor }}>No investments found.</p>
                    ) : (
                        investments.map(inv => (
                            <div key={inv.id} className="flex justify-between items-center border-b py-2" style={{ borderColor: isDark ? '#333' : '#eee' }}>
                                <div>
                                    <div style={{ color: textColor }}>{inv.name || inv.symbol}</div>
                                    <div className="text-xs opacity-60" style={{ color: textColor }}>
                                        Invested: {formatMoney(toDisplay(parseFloat(inv.amount) || 0))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div style={{ color: textColor, fontWeight: 'bold' }}>
                                        {formatMoney(toDisplay(parseFloat(inv.currentValue) || 0))}
                                    </div>
                                    {inv.originalCurrencyValue && (
                                        <div className="text-xs opacity-60" style={{ color: textColor }}>
                                            {inv.currencySymbol}{(parseFloat(inv.originalCurrencyValue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvestmentReport;
