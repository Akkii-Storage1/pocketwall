import React, { useState, useEffect, useMemo } from 'react';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, RadialBarChart, RadialBar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Award, AlertTriangle, Target, Zap, Shield, Layers } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f43f5e'];

const InvestmentReport = ({ isDark, onBack }) => {
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState('INR');

    const textColor = isDark ? '#e0e0e0' : '#333333';
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const cardBg = isDark ? '#252526' : '#f8f9fa';
    const borderColor = isDark ? '#3e3e42' : '#e0e0e0';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const settings = await DataAdapter.getUserSettings();
        const userCurrency = settings.defaultCurrency || 'INR';
        setCurrency(userCurrency);

        const inv = await DataAdapter.getInvestments();
        console.log('Raw Investments:', inv);

        // Fetch Crypto Holdings
        const cryptoHoldings = JSON.parse(localStorage.getItem('pocketwall_crypto_holdings') || '{}');
        let cryptoPrices = JSON.parse(localStorage.getItem('pocketwall_crypto_prices') || '{}')?.data || {};

        // Check for stale crypto data
        const lastUpdate = JSON.parse(localStorage.getItem('pocketwall_crypto_prices') || '{}')?.timestamp || 0;
        const isStale = (Date.now() - lastUpdate) > (5 * 60 * 1000);
        if (isStale && Object.keys(cryptoHoldings).length > 0) {
            try {
                const { getMultipleCryptoPrices } = await import('../utils/cryptoApi');
                const coinIds = Object.keys(cryptoHoldings);
                if (coinIds.length > 0) {
                    const newPrices = await getMultipleCryptoPrices(coinIds, 'inr');
                    cryptoPrices = newPrices;
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
                shortName: coinId.toUpperCase(),
                amount: invested,
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
                shortName: asset.name,
                amount: parseFloat(asset.purchaseValue) || 0,
                currentValue: parseFloat(asset.currentValue) || 0,
                type: 'Fixed Asset',
                assetClass: 'Fixed Asset'
            }));
        } catch (e) { console.error('Failed to load assets', e); }

        // Import stockApi for live prices
        const { stockApi } = await import('../utils/stockApi');
        const USD_TO_INR = 83.5;
        const isUSStock = (exchange) => ['US', 'NASDAQ', 'NYSE'].includes(exchange);

        // Process investments with live prices
        const updatedInvestments = await Promise.all(inv.map(async (item) => {
            let quantity = parseFloat(item.quantity) || 0;
            let buyPrice = parseFloat(item.buyPrice) || 0;
            let amount = parseFloat(item.amount) || 0;

            // Calculate amount if missing
            if (!amount || amount === 0) {
                amount = quantity * buyPrice;
            }

            // Fix US Stocks amount conversion
            if (['US', 'NASDAQ', 'NYSE'].includes(item.exchange)) {
                const rawUSD = quantity * buyPrice;
                if (!item.amount || Math.abs(amount - rawUSD) < (rawUSD * 0.01)) {
                    const rate = parseFloat(item.exchangeRate) || USD_TO_INR;
                    amount = rawUSD * rate;
                }
            }

            // Base item
            const baseItem = {
                ...item,
                quantity,
                buyPrice,
                amount: amount || 0,
                currentValue: amount || 0 // Default fallback
            };

            // Fetch live price for Mutual Funds
            if (item.assetClass === 'Mutual Fund' || item.exchange === 'MF') {
                try {
                    if (item.symbol && !isNaN(item.symbol)) {
                        const navData = await stockApi.fetchMutualFundNAV(item.symbol);
                        if (navData && navData.nav) {
                            return {
                                ...baseItem,
                                currentValue: quantity * navData.nav,
                                currentPrice: navData.nav
                            };
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to fetch NAV for ${item.name}`, e);
                }
                return baseItem;
            }

            // Fetch live price for Stocks
            if (item.assetClass === 'Stock' || ['US', 'NSE', 'BSE', 'NASDAQ', 'NYSE'].includes(item.exchange)) {
                try {
                    const symbol = item.symbol;
                    const priceData = await stockApi.fetchStockPrice(symbol, item.exchange);
                    if (priceData && priceData.currentPrice) {
                        let price = priceData.currentPrice;
                        const isUSD = isUSStock(item.exchange);

                        // Convert USD to INR
                        if (isUSD) {
                            price = price * USD_TO_INR;
                        }

                        return {
                            ...baseItem,
                            currentValue: quantity * price,
                            currentPrice: price
                        };
                    }
                } catch (e) {
                    console.warn(`Failed to fetch price for ${item.name}`, e);
                }
                return baseItem;
            }

            return baseItem;
        }));

        // Consolidate investments by symbol (group transactions into holdings)
        // Handle BUY vs SELL: buy adds, sell subtracts quantity and amount
        const consolidatedMap = {};
        [...updatedInvestments, ...cryptoItems, ...assetItems].forEach(inv => {
            const key = inv.symbol || inv.name || inv.id;

            // Determine if this is a sell transaction
            const isSell = inv.type === 'sell' || inv.transactionType === 'sell';

            // Get values (quantity might already be negative for sells)
            const rawQty = parseFloat(inv.quantity) || 0;
            const rawAmt = parseFloat(inv.amount) || 0;
            const qty = Math.abs(rawQty);
            const amt = Math.abs(rawAmt);
            const currPrice = parseFloat(inv.currentPrice) || 0;

            console.log(`Processing: ${inv.name || inv.symbol}, type=${inv.type}, rawQty=${rawQty}, isSell=${isSell}`);

            if (consolidatedMap[key]) {
                // Aggregate existing holding
                if (isSell || rawQty < 0) {
                    // SELL: subtract quantity and amount
                    consolidatedMap[key].quantity -= qty;
                    consolidatedMap[key].amount -= amt;
                } else {
                    // BUY: add quantity and amount
                    consolidatedMap[key].quantity += qty;
                    consolidatedMap[key].amount += amt;
                }
                // Update current price if we have one
                if (currPrice > 0) {
                    consolidatedMap[key].currentPrice = currPrice;
                }
            } else {
                // New holding
                const effectiveQty = (isSell || rawQty < 0) ? -qty : qty;
                const effectiveAmt = (isSell || rawAmt < 0) ? -amt : amt;
                consolidatedMap[key] = {
                    ...inv,
                    id: key,
                    quantity: effectiveQty,
                    amount: effectiveAmt,
                    currentPrice: currPrice
                };
            }
        });

        // Calculate currentValue and filter out sold holdings (qty <= 0)
        const allInvestments = Object.values(consolidatedMap)
            .filter(h => h.quantity > 0) // Remove fully sold holdings
            .map(h => {
                // Ensure positive values
                h.amount = Math.max(0, h.amount);

                // Calculate currentValue
                if (h.currentPrice > 0) {
                    h.currentValue = h.quantity * h.currentPrice;
                } else {
                    // Fallback: use invested amount as current value
                    h.currentValue = h.amount;
                }

                console.log(`Holding: ${h.shortName || h.name}: Qty=${h.quantity.toFixed(2)}, Invested=${h.amount.toFixed(0)}, Current=${h.currentValue.toFixed(0)}, P&L=${(h.currentValue - h.amount).toFixed(0)}`);
                return h;
            });

        console.log('Consolidated Holdings (after filtering sold):', allInvestments);
        setInvestments(allInvestments);
        setLoading(false);
    };

    const parseValue = (val) => {
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        if (!val) return 0;
        const parsed = parseFloat(String(val).replace(/,/g, ''));
        return isNaN(parsed) ? 0 : parsed;
    };

    const formatMoney = (amount) => CurrencyConverter.format(amount, currency);
    const toDisplay = (amountINR) => CurrencyConverter.convert(amountINR, 'INR', currency);

    // Calculate comprehensive stats
    const stats = useMemo(() => {
        const totalInvested = investments.reduce((sum, i) => sum + parseValue(i.amount), 0);
        const currentValue = investments.reduce((sum, i) => sum + parseValue(i.currentValue || i.amount), 0);
        const profit = currentValue - totalInvested;
        const roi = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

        // Winners and Losers
        const withPnL = investments.map(i => {
            const inv = parseValue(i.amount);
            const curr = parseValue(i.currentValue || i.amount);
            const pnl = curr - inv;
            const pnlPct = inv > 0 ? (pnl / inv) * 100 : 0;
            return { ...i, pnl, pnlPct, invested: inv, current: curr };
        });

        const winners = withPnL.filter(i => i.pnl > 0).sort((a, b) => b.pnlPct - a.pnlPct);
        const losers = withPnL.filter(i => i.pnl < 0).sort((a, b) => a.pnl - b.pnl);

        return { totalInvested, currentValue, profit, roi, winners, losers, withPnL };
    }, [investments]);

    // Asset allocation data
    const allocationData = useMemo(() => {
        const data = {};
        investments.forEach(i => {
            const type = i.assetClass || 'Other';
            data[type] = (data[type] || 0) + parseValue(i.currentValue || i.amount);
        });
        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [investments]);

    // Performance score calculation
    const performanceScore = useMemo(() => {
        let score = 50; // Base
        if (stats.roi > 0) score += Math.min(stats.roi, 30);
        if (stats.roi < 0) score -= Math.min(Math.abs(stats.roi), 30);
        if (allocationData.length >= 3) score += 10; // Diversification
        if (stats.winners.length > stats.losers.length) score += 10;
        return Math.round(Math.min(Math.max(score, 0), 100)); // Round to integer
    }, [stats, allocationData]);

    // Growth projection data
    const projectionData = useMemo(() => {
        const monthlyRate = stats.roi > 0 ? Math.min(stats.roi / 12, 2) : 0.5;
        const data = [];
        let value = stats.currentValue;
        for (let i = 0; i <= 12; i++) {
            data.push({ month: `M${i}`, value: Math.round(value) });
            value *= (1 + monthlyRate / 100);
        }
        return data;
    }, [stats]);

    if (loading) {
        return (
            <div className="p-6 h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <div style={{ color: textColor }}>Loading Investment Data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto" style={{ backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-blue-500 hover:underline text-sm">← Back</button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: textColor }}>
                            📈 Investment Performance
                        </h1>
                        <p className="text-sm opacity-60" style={{ color: textColor }}>
                            Comprehensive portfolio analysis & insights
                        </p>
                    </div>
                </div>
            </div>

            {/* Hero Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Total Invested */}
                <div className="p-5 rounded-xl border relative overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-6 -mt-6" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="text-blue-500" size={18} />
                            <span className="text-xs font-medium uppercase opacity-60" style={{ color: textColor }}>Total Invested</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-500">{formatMoney(toDisplay(stats.totalInvested))}</div>
                        <div className="text-xs opacity-50 mt-1" style={{ color: textColor }}>{investments.length} assets</div>
                    </div>
                </div>

                {/* Current Value */}
                <div className="p-5 rounded-xl border relative overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-6 -mt-6" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="text-purple-500" size={18} />
                            <span className="text-xs font-medium uppercase opacity-60" style={{ color: textColor }}>Current Value</span>
                        </div>
                        <div className="text-2xl font-bold text-purple-500">{formatMoney(toDisplay(stats.currentValue))}</div>
                        <div className="text-xs opacity-50 mt-1" style={{ color: textColor }}>Live valuation</div>
                    </div>
                </div>

                {/* Total Returns */}
                <div className="p-5 rounded-xl border relative overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
                    <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -mr-6 -mt-6 ${stats.profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`} />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            {stats.profit >= 0 ? <TrendingUp className="text-green-500" size={18} /> : <TrendingDown className="text-red-500" size={18} />}
                            <span className="text-xs font-medium uppercase opacity-60" style={{ color: textColor }}>Total Returns</span>
                        </div>
                        <div className={`text-2xl font-bold ${stats.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.profit >= 0 ? '+' : ''}{formatMoney(toDisplay(stats.profit))}
                        </div>
                        <div className={`text-xs font-semibold mt-1 ${stats.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}% ROI
                        </div>
                    </div>
                </div>

                {/* Performance Score */}
                <div className="p-5 rounded-xl border relative overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full -mr-6 -mt-6" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="text-amber-500" size={18} />
                            <span className="text-xs font-medium uppercase opacity-60" style={{ color: textColor }}>Performance</span>
                        </div>
                        <div className="text-2xl font-bold text-amber-500">{performanceScore}/100</div>
                        <div className="text-xs opacity-50 mt-1" style={{ color: textColor }}>
                            {performanceScore >= 70 ? 'Excellent' : performanceScore >= 50 ? 'Good' : 'Needs Improvement'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Left Column - Allocation Chart */}
                <div className="lg:col-span-1">
                    <div className="p-5 rounded-xl border h-full" style={{ backgroundColor: cardBg, borderColor }}>
                        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: textColor }}>
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Asset Allocation
                        </h3>
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={allocationData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {allocationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => formatMoney(toDisplay(value))}
                                        contentStyle={{ backgroundColor: bgColor, borderColor, borderRadius: '8px' }}
                                        labelStyle={{ color: textColor }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="space-y-2 mt-4">
                            {allocationData.slice(0, 4).map((item, i) => (
                                <div key={item.name} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i] }}></div>
                                        <span className="text-sm" style={{ color: textColor }}>{item.name}</span>
                                    </div>
                                    <span className="text-sm font-medium" style={{ color: textColor }}>
                                        {((item.value / stats.currentValue) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Projection Chart */}
                <div className="lg:col-span-2">
                    <div className="p-5 rounded-xl border h-full" style={{ backgroundColor: cardBg, borderColor }}>
                        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: textColor }}>
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            12-Month Growth Projection
                            <span className="text-xs font-normal opacity-50 ml-2">(Based on current performance)</span>
                        </h3>
                        <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData}>
                                    <defs>
                                        <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" stroke={textColor} fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke={textColor} fontSize={11} tickFormatter={(val) => `${(val / 100000).toFixed(1)}L`} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        formatter={(value) => formatMoney(toDisplay(value))}
                                        contentStyle={{ backgroundColor: bgColor, borderColor, borderRadius: '8px' }}
                                        labelStyle={{ color: textColor }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#colorProjection)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Winners & Losers Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Top Performers */}
                <div className="p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-green-500">
                        <TrendingUp size={18} /> Top Performers
                    </h3>
                    <div className="space-y-3">
                        {stats.winners.slice(0, 5).map((item, i) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: isDark ? '#1e1e1e' : '#f0f0f0' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm" style={{ color: textColor }}>{item.shortName || item.name || item.symbol}</div>
                                        <div className="text-xs opacity-50" style={{ color: textColor }}>{item.assetClass}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-500">+{item.pnlPct.toFixed(1)}%</div>
                                    <div className="text-xs text-green-500">+{formatMoney(toDisplay(item.pnl))}</div>
                                </div>
                            </div>
                        ))}
                        {stats.winners.length === 0 && (
                            <div className="text-center py-4 opacity-50" style={{ color: textColor }}>No winners yet</div>
                        )}
                    </div>
                </div>

                {/* Underperformers */}
                <div className="p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-red-500">
                        <TrendingDown size={18} /> Underperformers
                    </h3>
                    <div className="space-y-3">
                        {stats.losers.slice(0, 5).map((item, i) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: isDark ? '#1e1e1e' : '#f0f0f0' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-500">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm" style={{ color: textColor }}>{item.shortName || item.name || item.symbol}</div>
                                        <div className="text-xs opacity-50" style={{ color: textColor }}>{item.assetClass}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-red-500">{item.pnlPct.toFixed(1)}%</div>
                                    <div className="text-xs text-red-500">{formatMoney(toDisplay(item.pnl))}</div>
                                </div>
                            </div>
                        ))}
                        {stats.losers.length === 0 && (
                            <div className="text-center py-4 opacity-50" style={{ color: textColor }}>No losers - great job! 🎉</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Insights Section */}
            <div className="p-5 rounded-xl border mb-6" style={{ backgroundColor: cardBg, borderColor }}>
                <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: textColor }}>
                    <Zap className="text-amber-500" size={18} /> Key Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Diversification Insight */}
                    <div className="p-4 rounded-lg border" style={{ borderColor }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className={allocationData.length >= 3 ? 'text-green-500' : 'text-amber-500'} size={16} />
                            <span className="text-sm font-medium" style={{ color: textColor }}>Diversification</span>
                        </div>
                        <div className={`text-lg font-bold ${allocationData.length >= 3 ? 'text-green-500' : 'text-amber-500'}`}>
                            {allocationData.length} Asset Classes
                        </div>
                        <p className="text-xs opacity-60 mt-1" style={{ color: textColor }}>
                            {allocationData.length >= 3 ? 'Well diversified portfolio!' : 'Consider diversifying more'}
                        </p>
                    </div>

                    {/* Win Rate */}
                    <div className="p-4 rounded-lg border" style={{ borderColor }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Award className="text-blue-500" size={16} />
                            <span className="text-sm font-medium" style={{ color: textColor }}>Win Rate</span>
                        </div>
                        <div className="text-lg font-bold text-blue-500">
                            {investments.length > 0 ? ((stats.winners.length / investments.length) * 100).toFixed(0) : 0}%
                        </div>
                        <p className="text-xs opacity-60 mt-1" style={{ color: textColor }}>
                            {stats.winners.length} of {investments.length} assets in profit
                        </p>
                    </div>

                    {/* Largest Position */}
                    <div className="p-4 rounded-lg border" style={{ borderColor }}>
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className={allocationData[0]?.value / stats.currentValue > 0.5 ? 'text-amber-500' : 'text-green-500'} size={16} />
                            <span className="text-sm font-medium" style={{ color: textColor }}>Concentration</span>
                        </div>
                        <div className={`text-lg font-bold ${allocationData[0]?.value / stats.currentValue > 0.5 ? 'text-amber-500' : 'text-green-500'}`}>
                            {allocationData[0]?.name || 'N/A'}
                        </div>
                        <p className="text-xs opacity-60 mt-1" style={{ color: textColor }}>
                            {allocationData[0] ? ((allocationData[0].value / stats.currentValue) * 100).toFixed(0) : 0}% of portfolio
                        </p>
                    </div>
                </div>
            </div>

            {/* Complete Holdings Table */}
            <div className="p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                <h3 className="font-bold mb-4" style={{ color: textColor }}>📋 Complete Holdings</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b" style={{ borderColor }}>
                                <th className="text-left p-2 font-medium opacity-70" style={{ color: textColor }}>Asset</th>
                                <th className="text-right p-2 font-medium opacity-70" style={{ color: textColor }}>Invested</th>
                                <th className="text-right p-2 font-medium opacity-70" style={{ color: textColor }}>Current</th>
                                <th className="text-right p-2 font-medium opacity-70" style={{ color: textColor }}>P&L</th>
                                <th className="text-right p-2 font-medium opacity-70" style={{ color: textColor }}>Return</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.withPnL.sort((a, b) => b.current - a.current).map(item => (
                                <tr key={item.id} className="border-b hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor }}>
                                    <td className="p-2">
                                        <div className="font-medium" style={{ color: textColor }}>{item.shortName || item.name || item.symbol}</div>
                                        <div className="text-xs opacity-50" style={{ color: textColor }}>{item.assetClass}</div>
                                    </td>
                                    <td className="p-2 text-right" style={{ color: textColor }}>{formatMoney(toDisplay(item.invested))}</td>
                                    <td className="p-2 text-right font-medium" style={{ color: textColor }}>{formatMoney(toDisplay(item.current))}</td>
                                    <td className={`p-2 text-right font-medium ${item.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {item.pnl >= 0 ? '+' : ''}{formatMoney(toDisplay(item.pnl))}
                                    </td>
                                    <td className={`p-2 text-right font-bold ${item.pnlPct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvestmentReport;
