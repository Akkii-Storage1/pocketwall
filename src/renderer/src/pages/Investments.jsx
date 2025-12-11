import React, { useState, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import stockApi from '../utils/stockApi';
import FeatureGate from '../components/FeatureGate';
import { formatDate } from '../utils/DateFormatter';
import ExportManager from '../utils/ExportManager';
import IPOTracker from '../components/IPOTracker';

const Investments = ({ isDark, isPrivacyMode, currency }) => {
    const toast = useToast();
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        symbol: '',
        name: '',
        quantity: '',
        buyPrice: '',
        exchangeRate: '89.36', // Default exchange rate
        date: new Date().toISOString().slice(0, 10),
        exchange: 'NSE',
        type: 'buy',
        assetClass: 'Stock'
    });
    const [editingId, setEditingId] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // Dividend Modal State
    const [showDividendModal, setShowDividendModal] = useState(false);
    const [selectedHolding, setSelectedHolding] = useState(null);
    const [dividendForm, setDividendForm] = useState({
        quantity: '',
        ratePerShare: '',
        date: new Date().toISOString().slice(0, 10)
    });

    // Dividend Report State
    const [showDividendReport, setShowDividendReport] = useState(false);
    const [expandedStock, setExpandedStock] = useState(null);

    // IPO Tracker State
    const [showIPOTracker, setShowIPOTracker] = useState(false);


    // Get all dividend transactions
    const getDividendTransactions = () => {
        return investments.filter(inv => inv.type === 'dividend');
    };

    // Group dividends by stock
    const getDividendsByStock = () => {
        const dividends = getDividendTransactions();
        const grouped = {};

        dividends.forEach(div => {
            if (!grouped[div.symbol]) {
                grouped[div.symbol] = {
                    symbol: div.symbol,
                    name: div.name,
                    total: 0,
                    count: 0,
                    history: []
                };
            }
            grouped[div.symbol].total += parseFloat(div.amount || 0);
            grouped[div.symbol].count += 1;
            grouped[div.symbol].history.push(div);
        });

        return Object.values(grouped).sort((a, b) => b.total - a.total);
    };

    // Group dividends by Financial Year (India: Apr-Mar)
    const getDividendsByFY = () => {
        const dividends = getDividendTransactions();
        const fyGroups = {};

        dividends.forEach(div => {
            const date = new Date(div.date);
            const month = date.getMonth(); // 0-11
            const year = date.getFullYear();

            // FY starts in April (month 3)
            const fyYear = month >= 3 ? year : year - 1;
            const fyLabel = `FY ${fyYear}-${(fyYear + 1).toString().slice(-2)}`;

            if (!fyGroups[fyLabel]) {
                fyGroups[fyLabel] = { label: fyLabel, total: 0, count: 0, stocks: {} };
            }
            fyGroups[fyLabel].total += parseFloat(div.amount || 0);
            fyGroups[fyLabel].count += 1;

            if (!fyGroups[fyLabel].stocks[div.symbol]) {
                fyGroups[fyLabel].stocks[div.symbol] = 0;
            }
            fyGroups[fyLabel].stocks[div.symbol] += parseFloat(div.amount || 0);
        });

        return Object.values(fyGroups).sort((a, b) => b.label.localeCompare(a.label));
    };

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const inputBg = isDark ? '#1e1e1e' : '#ffffff';

    useEffect(() => {
        loadInvestments();
    }, []);

    const loadInvestments = async () => {
        setLoading(true);
        try {
            const data = await DataAdapter.getInvestments();
            // Load ALL investments (filter will be applied in render)
            // Sort by date descending
            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setInvestments(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load investments');
        } finally {
            setLoading(false);
        }
    };

    // Get asset type for an investment
    const getAssetType = (inv) => {
        if (inv.type === 'dividend') return 'dividend';
        if (inv.exchange === 'US' || inv.exchange === 'NYSE' || inv.exchange === 'NASDAQ') return 'US_Stock';
        if (inv.assetClass === 'Mutual Fund' || inv.exchange === 'MF') return 'Mutual Fund';
        if (inv.assetClass === 'ETF') return 'ETF';
        if (inv.assetClass === 'Bond') return 'Bond';
        if (inv.assetClass === 'Crypto') return 'Crypto';
        if (inv.assetClass === 'Gold' || inv.assetClass === 'Commodity') return 'Gold';
        if (inv.assetClass === 'Fixed' || inv.assetClass === 'Real Estate') return 'Fixed';
        return 'Stock'; // Default to Indian Stock
    };

    // Filter investments based on selected asset types
    const getFilteredInvestments = () => {
        if (assetFilters.length === 0) return [];
        return investments.filter(inv => assetFilters.includes(getAssetType(inv)));
    };

    // Live search with debounce
    let searchTimeout = null;
    const handleSymbolChange = async (value) => {
        setFormData(prev => ({ ...prev, symbol: value }));

        // Clear previous timeout
        if (searchTimeout) clearTimeout(searchTimeout);

        if (!value || value.length < 2) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        // Debounce search
        searchTimeout = setTimeout(async () => {
            setSearching(true);
            try {
                const results = await stockApi.searchStock(value);

                // Filter by selected exchange
                let filtered = results || [];
                if (formData.exchange === 'NSE' || formData.exchange === 'BSE') {
                    // Indian exchange - show only NSE/BSE stocks
                    filtered = filtered.filter(s => s.exchange === 'NSE' || s.exchange === 'BSE');
                } else if (formData.exchange === 'US' || formData.exchange === 'NASDAQ' || formData.exchange === 'NYSE') {
                    // US exchange - show only US stocks
                    filtered = filtered.filter(s => s.exchange === 'US' || s.exchange === 'NASDAQ' || s.exchange === 'NYSE');
                }

                setSearchResults(filtered);
                setShowSearchDropdown(filtered.length > 0);
            } catch (err) {
                console.warn('Search failed:', err);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    };

    // Select from dropdown
    const handleSelectStock = async (stock) => {
        setFormData(prev => ({
            ...prev,
            symbol: stock.symbol,
            name: stock.description || '',
            exchange: stock.exchange
        }));
        setSearchResults([]);
        setShowSearchDropdown(false);

        // Fetch price
        try {
            const priceData = await stockApi.fetchStockPrice(stock.symbol, stock.exchange);
            if (priceData && priceData.currentPrice) {
                setFormData(prev => ({
                    ...prev,
                    buyPrice: priceData.currentPrice
                }));
                toast.success(`${stock.description || stock.symbol} - ${stock.exchange}`);
            }
        } catch (err) {
            console.warn('Price fetch failed');
        }
    };

    const handleSymbolBlur = async () => {
        if (!formData.symbol || formData.symbol.length < 2) return;
        if (editingId) return;

        setSearching(true);
        try {
            let symbol = formData.symbol.toUpperCase();
            let exchange = formData.exchange;
            let name = '';

            try {
                const searchResults = await stockApi.searchStock(symbol);
                if (searchResults && searchResults.length > 0) {
                    // First try exact symbol match
                    let match = searchResults.find(s => s.symbol === symbol && s.exchange === 'NSE');
                    if (!match) match = searchResults.find(s => s.symbol === symbol && s.exchange === 'BSE');
                    if (!match) match = searchResults.find(s => s.symbol === symbol && s.exchange === 'US');

                    // If no exact match, try description match (for ETFs like "S&P 500" -> VOO)
                    if (!match) {
                        const searchLower = symbol.toLowerCase();
                        match = searchResults.find(s =>
                            s.description && s.description.toLowerCase().includes(searchLower)
                        );
                    }

                    // Fallback to first result
                    if (!match) match = searchResults[0];

                    if (match) {
                        symbol = match.symbol;
                        exchange = match.exchange;
                        name = match.description;
                    }
                }
            } catch (err) {
                console.warn('Search failed', err);
            }

            const priceData = await stockApi.fetchStockPrice(symbol, exchange);

            setFormData(prev => ({
                ...prev,
                symbol: symbol,
                exchange: exchange,
                name: name || prev.name,
                buyPrice: priceData ? priceData.currentPrice : prev.buyPrice
            }));

            if (name) toast.success(`Found: ${name} (${exchange})`);
            else if (priceData) toast.success(`Price fetched for ${symbol}`);

        } catch (error) {
            console.warn('Could not fetch stock details');
        } finally {
            setSearching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const transactionType = formData.type || 'buy';
            const isUS = formData.exchange === 'US' || formData.exchange === 'NASDAQ' || formData.exchange === 'NYSE';
            const exRate = parseFloat(formData.exchangeRate) || 1;

            // Validation based on transaction type
            if (!formData.symbol) {
                toast.error('Please enter a stock symbol');
                return;
            }

            // Different handling based on transaction type
            let investment = null;

            switch (transactionType) {
                case 'buy':
                case 'sell': {
                    // Standard buy/sell - requires quantity and price
                    if (!formData.quantity || !formData.buyPrice) {
                        toast.error('Please enter quantity and price');
                        return;
                    }
                    const qty = parseFloat(formData.quantity);
                    const price = parseFloat(formData.buyPrice);
                    const totalInvestedINR = isUS ? (qty * price * exRate) : (qty * price);

                    investment = {
                        ...formData,
                        symbol: formData.symbol.toUpperCase(),
                        quantity: transactionType === 'sell' ? -qty : qty, // Negative for sell
                        buyPrice: price,
                        exchangeRate: isUS ? exRate : 1,
                        pricePerShare: price,
                        amount: transactionType === 'sell' ? -totalInvestedINR : totalInvestedINR,
                        totalInvested: transactionType === 'sell' ? 0 : totalInvestedINR
                    };
                    break;
                }

                case 'dividend': {
                    // Dividend = Cash income, NO new shares added
                    // Amount field = total dividend received (e.g., ₹2 per share × 945 shares = ₹1890)
                    const dividendAmount = parseFloat(formData.buyPrice) || 0; // Using price field for dividend amount
                    if (dividendAmount <= 0) {
                        toast.error('Please enter the dividend amount received');
                        return;
                    }
                    const amountINR = isUS ? (dividendAmount * exRate) : dividendAmount;

                    investment = {
                        ...formData,
                        symbol: formData.symbol.toUpperCase(),
                        quantity: 0, // NO shares added
                        buyPrice: 0,
                        exchangeRate: isUS ? exRate : 1,
                        pricePerShare: 0,
                        amount: amountINR, // Dividend income
                        totalInvested: 0, // No cost basis
                        dividendAmount: amountINR,
                        note: `Dividend received: ${dividendAmount}`
                    };
                    toast.info(`💰 Recording dividend of ₹${amountINR.toLocaleString()} (no shares added)`);
                    break;
                }

                case 'bonus': {
                    // Bonus shares = FREE shares, no cost
                    if (!formData.quantity) {
                        toast.error('Please enter the number of bonus shares received');
                        return;
                    }
                    const bonusQty = parseFloat(formData.quantity);

                    investment = {
                        ...formData,
                        symbol: formData.symbol.toUpperCase(),
                        quantity: bonusQty, // Free shares added
                        buyPrice: 0, // Zero cost
                        exchangeRate: 1,
                        pricePerShare: 0,
                        amount: 0, // No money spent
                        totalInvested: 0,
                        note: `Bonus shares: ${bonusQty} shares at ₹0`
                    };
                    toast.info(`🎁 Adding ${bonusQty} bonus shares at zero cost`);
                    break;
                }

                case 'rights': {
                    // Rights issue = Buy shares at discounted price
                    if (!formData.quantity || !formData.buyPrice) {
                        toast.error('Please enter quantity and rights issue price');
                        return;
                    }
                    const rightsQty = parseFloat(formData.quantity);
                    const rightsPrice = parseFloat(formData.buyPrice);
                    const rightsAmountINR = isUS ? (rightsQty * rightsPrice * exRate) : (rightsQty * rightsPrice);

                    investment = {
                        ...formData,
                        symbol: formData.symbol.toUpperCase(),
                        quantity: rightsQty,
                        buyPrice: rightsPrice,
                        exchangeRate: isUS ? exRate : 1,
                        pricePerShare: rightsPrice,
                        amount: rightsAmountINR,
                        totalInvested: rightsAmountINR,
                        note: `Rights issue: ${rightsQty} shares at ₹${rightsPrice}`
                    };
                    toast.info(`📜 Rights issue: ${rightsQty} shares at ₹${rightsPrice}`);
                    break;
                }

                case 'split': {
                    // Stock split = Adjusts quantity ratio (e.g., 2:1 split doubles shares)
                    // Price should be the split ratio (e.g., 2 for 2:1 split)
                    const splitRatio = parseFloat(formData.buyPrice) || 2;
                    if (splitRatio <= 0) {
                        toast.error('Please enter the split ratio (e.g., 2 for 2:1 split)');
                        return;
                    }

                    investment = {
                        ...formData,
                        symbol: formData.symbol.toUpperCase(),
                        quantity: 0, // Split doesn't add, it multiplies existing
                        buyPrice: 0,
                        exchangeRate: 1,
                        pricePerShare: 0,
                        amount: 0,
                        totalInvested: 0,
                        splitRatio: splitRatio,
                        note: `Stock split ${splitRatio}:1 - existing holdings should be adjusted by portfolio`
                    };
                    toast.info(`✂️ Recording ${splitRatio}:1 stock split`);
                    break;
                }

                default:
                    toast.error('Unknown transaction type');
                    return;
            }

            if (editingId) {
                await DataAdapter.updateInvestment({ ...investment, id: editingId });
                toast.success('Transaction updated');
                setEditingId(null);
            } else {
                await DataAdapter.addInvestment(investment);
                toast.success('Transaction recorded');
            }

            setFormData({
                symbol: '',
                name: '',
                quantity: '',
                buyPrice: '',
                exchangeRate: '89.36',
                date: new Date().toISOString().slice(0, 10),
                exchange: 'NSE',
                type: 'buy',
                assetClass: 'Stock'
            });

            loadInvestments();
        } catch (error) {
            console.error('Investment Error:', error);
            toast.error(error.message || 'Failed to save transaction');
        }
    };

    const handleEdit = (inv) => {
        setFormData({
            symbol: inv.symbol,
            name: inv.name || '',
            quantity: inv.quantity,
            buyPrice: inv.buyPrice || inv.pricePerShare,
            exchangeRate: inv.exchangeRate || '89.36',
            date: inv.date,
            exchange: inv.exchange || 'NSE',
            type: inv.type || 'buy',
            assetClass: inv.assetClass || 'Stock'
        });
        setEditingId(inv.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setFormData({
            symbol: '',
            name: '',
            quantity: '',
            buyPrice: '',
            exchangeRate: '89.36',
            date: new Date().toISOString().slice(0, 10),
            exchange: 'NSE',
            type: 'buy',
            assetClass: 'Stock'
        });
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await DataAdapter.deleteInvestment(id);
            toast.success('Transaction deleted');
            loadInvestments();
        } catch (error) {
            toast.error('Failed to delete transaction');
        }
    };

    // Open Dividend Modal with pre-filled data from holding
    const openDividendModal = (holdingSymbol, holdingData) => {
        // Calculate net quantity from all transactions
        const netQty = holdingData.reduce((sum, inv) => {
            if (inv.type === 'buy' || inv.type === 'bonus' || inv.type === 'rights') {
                return sum + (parseFloat(inv.quantity) || 0);
            } else if (inv.type === 'sell') {
                return sum - (parseFloat(inv.quantity) || 0);
            }
            return sum;
        }, 0);

        setSelectedHolding({
            symbol: holdingSymbol,
            name: holdingData[0]?.name || holdingSymbol,
            quantity: netQty,
            exchange: holdingData[0]?.exchange || 'NSE'
        });

        setDividendForm({
            quantity: netQty.toString(),
            ratePerShare: '',
            date: new Date().toISOString().slice(0, 10)
        });

        setShowDividendModal(true);
    };

    // Submit Dividend - Add to bank as income
    const handleSubmitDividend = async (e) => {
        e.preventDefault();

        const qty = parseFloat(dividendForm.quantity) || 0;
        const rate = parseFloat(dividendForm.ratePerShare) || 0;

        if (qty <= 0 || rate <= 0) {
            toast.error('Please enter valid quantity and rate');
            return;
        }

        const totalDividend = qty * rate;
        const isUS = selectedHolding.exchange === 'US' || selectedHolding.exchange === 'NASDAQ';
        const exchangeRate = isUS ? 84 : 1; // Approximate USD/INR rate
        const amountINR = totalDividend * exchangeRate;

        try {
            // 1. Add as income transaction to bank
            await DataAdapter.addTransaction({
                date: dividendForm.date,
                type: 'income',
                category: 'Dividend',
                amount: amountINR,
                description: `Dividend from ${selectedHolding.symbol} (${qty} shares × ₹${rate})`,
                payee: selectedHolding.name || selectedHolding.symbol,
                tags: 'dividend, investment income'
            });

            // 2. Also record in investments for tracking
            await DataAdapter.addInvestment({
                symbol: selectedHolding.symbol,
                name: selectedHolding.name,
                exchange: selectedHolding.exchange,
                type: 'dividend',
                quantity: 0, // No shares added for dividend
                buyPrice: totalDividend, // Total dividend amount
                amount: amountINR,
                date: dividendForm.date,
                assetClass: 'Stock',
                note: `Dividend: ${qty} shares × ₹${rate} = ₹${totalDividend.toLocaleString()}`
            });

            toast.success(`💰 ₹${amountINR.toLocaleString()} dividend added to Income!`);

            setShowDividendModal(false);
            setSelectedHolding(null);
            setDividendForm({ quantity: '', ratePerShare: '', date: new Date().toISOString().slice(0, 10) });

            loadInvestments();
        } catch (error) {
            console.error('Dividend error:', error);
            toast.error('Failed to record dividend');
        }
    };


    const isUSExchange = formData.exchange === 'US' || formData.exchange === 'NASDAQ' || formData.exchange === 'NYSE';

    return (
        <FeatureGate feature="investments">
            <div className="h-full p-4 overflow-auto" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI' }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold" style={{ color: textColor }}>Stock & ETF Investments</h2>
                    <div className="flex items-center gap-2">
                        {/* Dividend Report Button */}
                        <button
                            onClick={() => setShowDividendReport(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded border transition-colors hover:bg-opacity-90"
                            style={{
                                backgroundColor: '#fbbf24',
                                color: '#78350f',
                                borderColor: '#f59e0b'
                            }}
                        >
                            💰 Dividend Report
                        </button>
                        {/* IPO Tracker Button */}
                        <button
                            onClick={() => setShowIPOTracker(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded border transition-colors hover:bg-opacity-90"
                            style={{
                                backgroundColor: '#8b5cf6',
                                color: '#ffffff',
                                borderColor: '#7c3aed'
                            }}
                        >
                            📋 IPO/NFO Tracker
                        </button>
                        <button
                            onClick={() => {
                                if (investments.length === 0) {
                                    toast.error('No investments to export');
                                    return;
                                }
                                ExportManager.exportInvestmentsToPDF(investments);
                                toast.success('PDF exported successfully');
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded border transition-colors hover:bg-opacity-90"
                            style={{
                                backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                color: textColor,
                                borderColor
                            }}
                        >
                            📄 Export PDF
                        </button>
                    </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Add/Edit Investment Form */}
                    <div className="md:col-span-1">
                        <div className="p-4 rounded border shadow-sm sticky top-4" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="font-semibold mb-4" style={{ color: textColor }}>
                                {editingId ? 'Edit Transaction' : 'Add New Transaction'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Symbol</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.assetClass}
                                            onChange={(e) => setFormData({ ...formData, assetClass: e.target.value })}
                                            className="px-2 py-1.5 text-sm border rounded w-24"
                                            style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        >
                                            <option value="Stock">Stock</option>
                                            <option value="ETF">ETF</option>
                                            <option value="Bond">Bond</option>
                                            <option value="REIT">REIT</option>
                                        </select>
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                value={formData.symbol}
                                                onChange={(e) => handleSymbolChange(e.target.value)}
                                                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                                                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                                                placeholder={formData.exchange === 'US' ? 'Search VOO, AAPL, S&P...' : 'Search RELIANCE, TCS...'}
                                                className="w-full px-2 py-1.5 text-sm border rounded"
                                                style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                            />
                                            {searching && (
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-60">🔍</span>
                                            )}
                                            {/* Search Results Dropdown */}
                                            {showSearchDropdown && searchResults.length > 0 && (
                                                <div
                                                    className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto"
                                                    style={{ backgroundColor: panelBg, borderColor }}
                                                >
                                                    {searchResults.slice(0, 8).map((stock, idx) => (
                                                        <div
                                                            key={`${stock.symbol}-${idx}`}
                                                            onClick={() => handleSelectStock(stock)}
                                                            className="px-3 py-2 cursor-pointer hover:bg-blue-500/20 flex justify-between items-center"
                                                            style={{ color: textColor }}
                                                        >
                                                            <div>
                                                                <span className="font-semibold">{stock.symbol}</span>
                                                                <span className="text-xs opacity-70 ml-2">{stock.description?.slice(0, 35)}{stock.description?.length > 35 ? '...' : ''}</span>
                                                            </div>
                                                            <span className={`text-xs px-1.5 py-0.5 rounded ${stock.exchange === 'US' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                {stock.exchange}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <select
                                            value={formData.exchange}
                                            onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                                            className="px-2 py-1.5 text-sm border rounded w-20"
                                            style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        >
                                            <option value="NSE">NSE</option>
                                            <option value="BSE">BSE</option>
                                            <option value="US">US</option>
                                        </select>
                                    </div>
                                    {searching && <span className="text-xs opacity-50" style={{ color: textColor }}>Checking symbol...</span>}
                                </div>

                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Company Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Reliance Industries"
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Date</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Transaction Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    >
                                        <option value="buy">🟢 Buy</option>
                                        <option value="sell">🔴 Sell</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: textColor }}>Quantity</label>
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                            placeholder="0"
                                            className="w-full px-2 py-1.5 text-sm border rounded"
                                            style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                            step="any"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: textColor }}>
                                            Price {isUSExchange ? '(USD)' : '(INR)'}
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.buyPrice}
                                            onChange={(e) => setFormData({ ...formData, buyPrice: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full px-2 py-1.5 text-sm border rounded"
                                            style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                            step="any"
                                        />
                                    </div>
                                </div>

                                {isUSExchange && (
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: textColor }}>Exchange Rate (INR/USD)</label>
                                        <input
                                            type="number"
                                            value={formData.exchangeRate}
                                            onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                                            placeholder="89.36"
                                            className="w-full px-2 py-1.5 text-sm border rounded"
                                            style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                            step="any"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Total Invested (INR)</label>
                                    <div className="px-2 py-1.5 text-sm border rounded bg-opacity-10 bg-gray-500" style={{ color: textColor, borderColor }}>
                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                                            ₹{(() => {
                                                const qty = parseFloat(formData.quantity || 0);
                                                const price = parseFloat(formData.buyPrice || 0);
                                                const rate = isUSExchange ? (parseFloat(formData.exchangeRate) || 1) : 1;
                                                return (qty * price * rate).toFixed(2);
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 text-sm font-semibold text-white rounded"
                                        style={{ backgroundColor: editingId ? '#0078d4' : '#107c10' }}
                                    >
                                        {editingId ? 'Update' : '+ Add'}
                                    </button>
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="px-4 py-2 text-sm border rounded"
                                            style={{ backgroundColor: panelBg, color: textColor, borderColor }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="md:col-span-2">
                        <div className="p-4 rounded border shadow-sm h-full overflow-hidden flex flex-col" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="font-semibold mb-4" style={{ color: textColor }}>Recent Transactions</h3>

                            <div className="overflow-auto flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="border-b" style={{ borderColor }}>
                                        <tr style={{ color: textColor, opacity: 0.7 }}>
                                            <th className="p-2">Date</th>
                                            <th className="p-2">Stock</th>
                                            <th className="p-2 text-center">Type</th>
                                            <th className="p-2 text-right">Qty</th>
                                            <th className="p-2 text-right">Price</th>
                                            <th className="p-2 text-right">Total (INR)</th>
                                            <th className="p-2 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {investments.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center opacity-50" style={{ color: textColor }}>
                                                    No transactions found. Add one to get started!
                                                </td>
                                            </tr>
                                        ) : (
                                            investments.map((inv) => (
                                                <tr key={inv.id} className="border-b hover:bg-opacity-5 hover:bg-gray-500" style={{ borderColor }}>
                                                    <td className="p-2" style={{ color: textColor }}>{formatDate(inv.date, currency)}</td>
                                                    <td className="p-2">
                                                        <div className="font-medium" style={{ color: textColor }}>{inv.symbol}</div>
                                                        <div className="text-xs opacity-50" style={{ color: textColor }}>
                                                            {inv.name ? inv.name : inv.exchange} • <span className="font-semibold">{inv.assetClass || 'Stock'}</span>
                                                        </div>
                                                    </td>
                                                    {/* Type Column with Icons */}
                                                    <td className="p-2 text-center">
                                                        {inv.type === 'dividend' ? (
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: '#fbbf24', color: '#78350f' }}>
                                                                💰 Dividend
                                                            </span>
                                                        ) : inv.type === 'buy' ? (
                                                            <span className="text-green-500 font-semibold text-xs">🟢 Buy</span>
                                                        ) : inv.type === 'sell' ? (
                                                            <span className="text-red-500 font-semibold text-xs">🔴 Sell</span>
                                                        ) : inv.type === 'bonus' ? (
                                                            <span className="text-purple-500 font-semibold text-xs">🎁 Bonus</span>
                                                        ) : inv.type === 'rights' ? (
                                                            <span className="text-blue-500 font-semibold text-xs">📜 Rights</span>
                                                        ) : inv.type === 'split' ? (
                                                            <span className="text-orange-500 font-semibold text-xs">✂️ Split</span>
                                                        ) : (
                                                            <span className="text-gray-500 text-xs">{inv.type || '-'}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-right" style={{ color: textColor }}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>{inv.quantity}</span>
                                                    </td>
                                                    <td className="p-2 text-right" style={{ color: textColor }}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                                                            {['US', 'NASDAQ', 'NYSE'].includes(inv.exchange) ? '$' : '₹'}
                                                            {parseFloat(inv.buyPrice || inv.pricePerShare).toFixed(2)}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-right font-medium" style={{ color: textColor }}>
                                                        <span className={isPrivacyMode ? 'privacy-blur' : ''}>
                                                            ₹{(() => {
                                                                const isUS = ['US', 'NASDAQ', 'NYSE'].includes(inv.exchange);
                                                                // Use stored amount if available, otherwise calculate
                                                                let amount = parseFloat(inv.amount || inv.totalInvested);

                                                                // If amount is missing or looks like USD (e.g. < 10000 for a large qty*price), recalculate
                                                                // But safer to just recalculate if it's US and we have rate
                                                                if (isUS) {
                                                                    const qty = parseFloat(inv.quantity);
                                                                    const price = parseFloat(inv.buyPrice || inv.pricePerShare);
                                                                    const rate = parseFloat(inv.exchangeRate) || 89.36;
                                                                    // If stored amount is roughly equal to qty*price (within 1%), it's likely unconverted USD
                                                                    const rawUSD = qty * price;
                                                                    if (!amount || Math.abs(amount - rawUSD) < (rawUSD * 0.01)) {
                                                                        amount = rawUSD * rate;
                                                                    }
                                                                }
                                                                return (amount || 0).toFixed(2);
                                                            })()}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            {/* Record Dividend - only for buy type transactions */}
                                                            {(inv.type === 'buy' || inv.type === 'bonus' || inv.type === 'rights') && (
                                                                <button
                                                                    onClick={() => {
                                                                        // Group all transactions for this symbol
                                                                        const symbolInvs = investments.filter(i => i.symbol === inv.symbol);
                                                                        openDividendModal(inv.symbol, symbolInvs);
                                                                    }}
                                                                    className="text-xs px-2 py-1 border rounded hover:bg-opacity-10 hover:bg-green-500"
                                                                    style={{ color: '#10b981', borderColor: '#10b981' }}
                                                                    title="Record Dividend"
                                                                >
                                                                    💰
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleEdit(inv)}
                                                                className="text-xs px-2 py-1 border rounded hover:bg-opacity-10 hover:bg-blue-500"
                                                                style={{ color: '#0078d4', borderColor: '#0078d4' }}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(inv.id)}
                                                                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-bold border-t" style={{ backgroundColor: isDark ? '#333' : '#eee' }}>
                                            <td colSpan={5} className="p-2 text-right" style={{ color: textColor }}>Total Invested</td>
                                            <td className="p-2 text-right" style={{ color: textColor }}>
                                                ₹{investments.reduce((sum, inv) => sum + (parseFloat(inv.amount || inv.totalInvested || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dividend Modal */}
            {showDividendModal && selectedHolding && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="p-6 rounded-lg shadow-xl max-w-md w-full mx-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: textColor }}>
                            💰 Record Dividend - {selectedHolding.symbol}
                        </h3>

                        <form onSubmit={handleSubmitDividend} className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1" style={{ color: textColor }}>Stock</label>
                                <div className="px-3 py-2 border rounded text-sm" style={{ backgroundColor: inputBg, color: textColor, borderColor }}>
                                    {selectedHolding.name || selectedHolding.symbol} ({selectedHolding.exchange})
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm mb-1" style={{ color: textColor }}>Quantity (shares held) *</label>
                                <input
                                    type="number"
                                    value={dividendForm.quantity}
                                    onChange={(e) => setDividendForm(prev => ({ ...prev, quantity: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded text-sm"
                                    style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    placeholder="Pre-filled from holdings"
                                    required
                                />
                                <p className="text-xs mt-1 opacity-60" style={{ color: textColor }}>
                                    You can adjust if dividend is for different qty
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm mb-1" style={{ color: textColor }}>Dividend per Share (₹) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={dividendForm.ratePerShare}
                                    onChange={(e) => setDividendForm(prev => ({ ...prev, ratePerShare: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded text-sm"
                                    style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    placeholder="e.g. 5.50"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm mb-1" style={{ color: textColor }}>Dividend Date</label>
                                <input
                                    type="date"
                                    value={dividendForm.date}
                                    onChange={(e) => setDividendForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded text-sm"
                                    style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                />
                            </div>

                            {/* Total Calculation */}
                            {dividendForm.quantity && dividendForm.ratePerShare && (
                                <div className="p-3 rounded border" style={{ backgroundColor: isDark ? '#1e3a2f' : '#dcfce7', borderColor: isDark ? '#166534' : '#86efac' }}>
                                    <div className="text-sm font-bold" style={{ color: isDark ? '#86efac' : '#166534' }}>
                                        💵 Total Dividend: ₹{(parseFloat(dividendForm.quantity) * parseFloat(dividendForm.ratePerShare)).toLocaleString()}
                                    </div>
                                    <div className="text-xs mt-1 opacity-70" style={{ color: textColor }}>
                                        {dividendForm.quantity} shares × ₹{dividendForm.ratePerShare} per share
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="submit"
                                    className="flex-1 py-2 text-sm font-semibold text-white rounded bg-green-600 hover:bg-green-700"
                                >
                                    ✓ Add to Income
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowDividendModal(false); setSelectedHolding(null); }}
                                    className="px-4 py-2 text-sm border rounded"
                                    style={{ backgroundColor: panelBg, color: textColor, borderColor }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Dividend Report Modal */}
            {showDividendReport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="p-6 rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: textColor }}>
                                💰 Dividend Report
                            </h3>
                            <button
                                onClick={() => setShowDividendReport(false)}
                                className="text-2xl opacity-60 hover:opacity-100"
                                style={{ color: textColor }}
                            >
                                ×
                            </button>
                        </div>

                        {getDividendTransactions().length === 0 ? (
                            <div className="text-center py-8 opacity-60" style={{ color: textColor }}>
                                <div className="text-4xl mb-2">💰</div>
                                <div>No dividends recorded yet.</div>
                                <div className="text-sm mt-1">Click 💰 on any stock to record dividend.</div>
                            </div>
                        ) : (
                            <>
                                {/* Summary Card */}
                                <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#fef3c7', borderColor: '#fbbf24' }}>
                                    <div className="text-lg font-bold" style={{ color: '#78350f' }}>
                                        Total Dividends: ₹{getDividendTransactions().reduce((sum, d) => sum + parseFloat(d.amount || 0), 0).toLocaleString()}
                                    </div>
                                    <div className="text-sm" style={{ color: '#92400e' }}>
                                        From {getDividendsByStock().length} stocks • {getDividendTransactions().length} dividend entries
                                    </div>
                                </div>

                                {/* Stock-wise Section */}
                                <div className="mb-6">
                                    <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: textColor }}>
                                        📊 Stock-wise Dividend History
                                    </h4>
                                    <div className="space-y-2">
                                        {getDividendsByStock().map(stock => (
                                            <div key={stock.symbol} className="border rounded" style={{ borderColor }}>
                                                <button
                                                    onClick={() => setExpandedStock(expandedStock === stock.symbol ? null : stock.symbol)}
                                                    className="w-full p-3 flex items-center justify-between text-left hover:bg-opacity-5 hover:bg-gray-500"
                                                    style={{ color: textColor }}
                                                >
                                                    <div>
                                                        <span className="font-semibold">{stock.symbol}</span>
                                                        <span className="text-sm opacity-60 ml-2">{stock.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-bold text-green-500">₹{stock.total.toLocaleString()}</span>
                                                        <span className="text-xs opacity-60">{stock.count} entries</span>
                                                        <span>{expandedStock === stock.symbol ? '▼' : '▶'}</span>
                                                    </div>
                                                </button>

                                                {expandedStock === stock.symbol && (
                                                    <div className="border-t px-3 py-2" style={{ borderColor, backgroundColor: isDark ? '#1e1e1e' : '#f9fafb' }}>
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="opacity-60">
                                                                    <th className="text-left py-1">Date</th>
                                                                    <th className="text-right py-1">Amount</th>
                                                                    <th className="text-left py-1 pl-2">Note</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {stock.history.map(h => (
                                                                    <tr key={h.id} className="border-t" style={{ borderColor }}>
                                                                        <td className="py-1" style={{ color: textColor }}>{formatDate(h.date, currency)}</td>
                                                                        <td className="py-1 text-right text-green-500 font-medium">₹{parseFloat(h.amount || 0).toLocaleString()}</td>
                                                                        <td className="py-1 text-xs opacity-60 pl-2" style={{ color: textColor }}>{h.note || '-'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* FY-wise Section */}
                                <div>
                                    <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: textColor }}>
                                        📅 Financial Year Summary (for Tax)
                                    </h4>
                                    <div className="space-y-2">
                                        {getDividendsByFY().map(fy => (
                                            <div key={fy.label} className="p-3 border rounded" style={{ borderColor }}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold" style={{ color: textColor }}>{fy.label}</span>
                                                    <span className="font-bold text-green-500">₹{fy.total.toLocaleString()}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(fy.stocks).map(([symbol, amount]) => (
                                                        <span key={symbol} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: isDark ? '#3e3e42' : '#e5e7eb', color: textColor }}>
                                                            {symbol}: ₹{amount.toLocaleString()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowDividendReport(false)}
                                className="px-4 py-2 text-sm rounded"
                                style={{ backgroundColor: isDark ? '#3e3e42' : '#e5e7eb', color: textColor }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* IPO/NFO Tracker Modal */}
            <IPOTracker
                isDark={isDark}
                currency={currency}
                isOpen={showIPOTracker}
                onClose={() => setShowIPOTracker(false)}
            />
        </FeatureGate>
    );
};

export default Investments;
