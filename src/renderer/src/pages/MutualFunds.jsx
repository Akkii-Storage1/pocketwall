import React, { useState, useEffect } from 'react';
import { useFeature } from '../context/FeatureContext';
import stockApi from '../utils/stockApi';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/DateFormatter';

const MutualFunds = ({ isDark, currency }) => {
    const { hasFeature } = useFeature();
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [watchlist, setWatchlist] = useState(() => {
        const saved = localStorage.getItem('mf_watchlist');
        return saved ? JSON.parse(saved) : [];
    });
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    // Holdings state (legacy support, but we primarily use DataAdapter now)
    const [holdings, setHoldings] = useState(() => {
        const saved = localStorage.getItem('pocketwall_mf_holdings');
        return saved ? JSON.parse(saved) : {};
    });

    // Transaction Form State
    const [editingId, setEditingId] = useState(null);
    const [addForm, setAddForm] = useState({
        type: 'buy', // Changed from Lumpsum/SIP to buy (SIP is now in SIP Manager)
        date: new Date().toISOString().slice(0, 10),
        nav: '',
        amount: '',
        units: '',
        fundName: '',
        fundCode: '',
        shortName: ''
    });

    // Version to trigger list refresh
    const [transactionListVersion, setTransactionListVersion] = useState(0);

    useEffect(() => {
        localStorage.setItem('mf_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    useEffect(() => {
        localStorage.setItem('pocketwall_mf_holdings', JSON.stringify(holdings));
    }, [holdings]);

    // SIP Monitor State
    const [sipRules, setSipRules] = useState([]);
    useEffect(() => {
        const loadSips = async () => {
            const rules = await DataAdapter.getRecurringRules();
            const investments = rules.filter(r => r.category === 'Investment' || r.category === 'Mutual Fund' || r.name.toLowerCase().includes('sip'));
            setSipRules(investments);
        };
        loadSips();
    }, []);

    // Ref for search container to handle click outside
    const searchContainerRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setSearchResults([]);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            const results = await stockApi.searchMutualFund(searchTerm);
            setSearchResults(results);
        } catch (error) {
            console.error(error);
            toast.error('Failed to search funds');
        } finally {
            setLoading(false);
        }
    };

    const generateShortName = (name) => {
        return name
            .replace(/Mutual Fund/i, '')
            .replace(/Scheme/i, '')
            .replace(/Direct Plan/i, '')
            .replace(/Regular Plan/i, '')
            .replace(/Growth/i, '')
            .replace(/Option/i, '')
            .replace(/Fund/i, '')
            .replace(/-/g, '')
            .trim()
            .substring(0, 20); // Limit length
    };

    const handleAddClick = async (fund) => {
        setLoading(true);
        try {
            // Clear search results immediately
            setSearchResults([]);

            // Set basic info first
            setAddForm(prev => ({
                ...prev,
                fundName: fund.name,
                fundCode: fund.code,
                shortName: generateShortName(fund.name),
                nav: 'Fetching...'
            }));

            // Fetch latest NAV
            const navData = await stockApi.fetchMutualFundNAV(fund.code);

            if (navData && navData.nav) {
                setAddForm(prev => ({
                    ...prev,
                    nav: navData.nav.toString(),
                    date: navData.date || new Date().toISOString().slice(0, 10)
                }));
            } else {
                toast.error('Could not fetch NAV. Please enter manually.');
                setAddForm(prev => ({ ...prev, nav: '' }));
            }

        } catch (error) {
            console.error('Error fetching NAV:', error);
            toast.error('Failed to fetch NAV');
            setAddForm(prev => ({ ...prev, nav: '' }));
        } finally {
            setLoading(false);
        }
    };

    const calculateValues = (field, value) => {
        const nav = parseFloat(addForm.nav) || 0;
        const parsedValue = parseFloat(value);

        if (isNaN(parsedValue) || parsedValue < 0) {
            setAddForm(prev => ({ ...prev, [field]: value, amount: '', units: '' }));
            return;
        }

        if (!nav) {
            setAddForm(prev => ({ ...prev, [field]: value }));
            return;
        }

        if (field === 'amount') {
            const units = parsedValue / nav;
            setAddForm(prev => ({ ...prev, amount: value, units: units.toFixed(4) }));
        } else if (field === 'units') {
            const amount = parsedValue * nav;
            setAddForm(prev => ({ ...prev, units: value, amount: amount.toFixed(2) }));
        } else if (field === 'nav') {
            const newNav = parsedValue;
            if (addForm.amount) {
                const units = parseFloat(addForm.amount) / newNav;
                setAddForm(prev => ({ ...prev, nav: value, units: units.toFixed(4) }));
            } else if (addForm.units) {
                const amount = parseFloat(addForm.units) * newNav;
                setAddForm(prev => ({ ...prev, nav: value, amount: amount.toFixed(2) }));
            } else {
                setAddForm(prev => ({ ...prev, nav: value }));
            }
        }
    };

    const confirmAddToPortfolio = async (e) => {
        e.preventDefault();
        if (!addForm.fundCode || !addForm.amount || !addForm.units || !addForm.nav) {
            toast.error('Please select a fund and fill all fields');
            return;
        }

        const investment = {
            symbol: addForm.fundCode,
            name: addForm.fundName,
            shortName: addForm.shortName || addForm.fundName,
            exchange: 'MF',
            assetClass: 'Mutual Fund',
            type: addForm.type,
            quantity: parseFloat(addForm.units),
            buyPrice: parseFloat(addForm.nav),
            amount: parseFloat(addForm.amount),
            date: addForm.date,
            currency: 'INR'
        };

        try {
            if (editingId) {
                await DataAdapter.updateInvestment({ ...investment, id: editingId });
                toast.success('Transaction updated');
                setEditingId(null);
            } else {
                await DataAdapter.addInvestment(investment);
                toast.success('Added to Portfolio');
            }

            // Reset form
            setAddForm({
                type: 'buy',
                date: new Date().toISOString().slice(0, 10),
                nav: '',
                amount: '',
                units: '',
                fundName: '',
                fundCode: '',
                shortName: ''
            });
            setSearchTerm('');
            setTransactionListVersion(v => v + 1);

        } catch (error) {
            console.error(error);
            toast.error('Failed to save investment');
        }
    };

    const handleEditTransaction = (txn) => {
        setEditingId(txn.id);
        setAddForm({
            type: txn.type || 'Lumpsum',
            date: txn.date,
            nav: txn.buyPrice,
            amount: txn.amount || (txn.quantity * txn.buyPrice).toFixed(2),
            units: txn.quantity,
            fundName: txn.name,
            fundCode: txn.symbol,
            shortName: txn.shortName || txn.name
        });
        setSearchTerm(txn.name);
    };

    const bgColor = isDark ? '#1e1e1e' : '#f8f9fa';
    const cardBg = isDark ? '#2d2d30' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#e9ecef';

    if (!hasFeature('investments')) {
        return (
            <div className="h-full flex items-center justify-center flex-col p-8 text-center" style={{ backgroundColor: bgColor, color: textColor }}>
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
                <p className="opacity-70 mb-6 max-w-md">
                    Mutual Fund tracking is available on the Pro and Elite plans.
                </p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-6" style={{ backgroundColor: bgColor, color: textColor }}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-green-500">📈</span> Mutual Funds (India)
                    </h1>
                    <p className="text-sm opacity-60">Track NAVs and Add Transactions</p>
                </div>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('openSIPManager'))}
                    className="px-4 py-2 text-sm font-medium rounded border flex items-center gap-2"
                    style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                >
                    🔄 SIP Manager
                </button>
            </div>

            {/* SIP Monitor */}
            {sipRules.length > 0 && (
                <div className="mb-6 p-4 rounded border shadow-sm" style={{ backgroundColor: cardBg, borderColor }}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: textColor }}>
                        <span>🔄 SIP Monitor</span>
                        <span className="text-xs opacity-50 font-normal">(Linked to Recurring Rules)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 rounded bg-opacity-10 bg-blue-500 border border-blue-200 dark:border-blue-800">
                            <div className="text-xs opacity-70 mb-1" style={{ color: textColor }}>Monthly Commitment</div>
                            <div className="text-xl font-bold text-blue-600">
                                ₹{sipRules.reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}
                            </div>
                            <div className="text-xs mt-1 opacity-60" style={{ color: textColor }}>{sipRules.length} Active SIPs</div>
                        </div>
                        <div className="p-3 rounded bg-opacity-10 bg-green-500 border border-green-200 dark:border-green-800">
                            <div className="text-xs opacity-70 mb-1" style={{ color: textColor }}>Paid this Month</div>
                            <div className="text-xl font-bold text-green-600">
                                ₹{sipRules.filter(r => new Date(r.nextDueDate) > new Date()).reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}
                            </div>
                            <div className="text-xs mt-1 opacity-60" style={{ color: textColor }}>Estimated based on due date</div>
                        </div>
                        <div className="p-3 rounded bg-opacity-10 bg-orange-500 border border-orange-200 dark:border-orange-800">
                            <div className="text-xs opacity-70 mb-1" style={{ color: textColor }}>Upcoming (Due)</div>
                            <div className="text-xl font-bold text-orange-600">
                                ₹{sipRules.filter(r => new Date(r.nextDueDate) <= new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)).reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}
                            </div>
                            <div className="text-xs mt-1 opacity-60" style={{ color: textColor }}>Next 30 Days</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Add Transaction Form */}
                <div className="md:col-span-1">
                    <div className="p-4 rounded border shadow-sm sticky top-4" style={{ backgroundColor: cardBg, borderColor }}>
                        <h3 className="font-semibold mb-4" style={{ color: textColor }}>
                            {editingId ? 'Edit Transaction' : 'Add New Transaction'}
                        </h3>
                        <form onSubmit={confirmAddToPortfolio} className="space-y-3">
                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Fund Name / Code</label>
                                <div className="relative" ref={searchContainerRef}>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            if (!editingId) handleSearch(e);
                                        }}
                                        onFocus={(e) => {
                                            if (!editingId && searchTerm) handleSearch(e);
                                        }}
                                        placeholder="Search Fund..."
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                        disabled={!!editingId}
                                    />
                                    {loading && <span className="absolute right-2 top-2 text-xs opacity-50">...</span>}

                                    {searchResults.length > 0 && !editingId && (
                                        <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border rounded shadow-lg" style={{ backgroundColor: cardBg, borderColor }}>
                                            {searchResults.map(fund => (
                                                <div
                                                    key={fund.code}
                                                    className="p-2 text-xs cursor-pointer hover:bg-blue-500 hover:text-white border-b last:border-0"
                                                    style={{ borderColor }}
                                                    onClick={() => handleAddClick(fund)}
                                                >
                                                    <div className="font-bold">{fund.name}</div>
                                                    <div className="opacity-70">{fund.code}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {addForm.fundName && (
                                    <div className="mt-2 space-y-2">
                                        <div className="text-xs text-green-500 font-bold">
                                            Selected: {addForm.fundName}
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1" style={{ color: textColor }}>Short Name (Display Name)</label>
                                            <input
                                                type="text"
                                                value={addForm.shortName}
                                                onChange={(e) => setAddForm({ ...addForm, shortName: e.target.value })}
                                                className="w-full px-2 py-1.5 text-sm border rounded"
                                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Removed Lumpsum/SIP toggle - SIP is now in SIP Manager */}

                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Date</label>
                                <input
                                    type="date"
                                    value={addForm.date}
                                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                                    className="w-full px-2 py-1.5 text-sm border rounded"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>NAV</label>
                                    <input
                                        type="number"
                                        value={addForm.nav}
                                        onChange={(e) => calculateValues('nav', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                        step="any"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1" style={{ color: textColor }}>Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={addForm.amount}
                                        onChange={(e) => calculateValues('amount', e.target.value)}
                                        placeholder="0"
                                        className="w-full px-2 py-1.5 text-sm border rounded"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                        step="any"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs mb-1" style={{ color: textColor }}>Units</label>
                                <input
                                    type="number"
                                    value={addForm.units}
                                    onChange={(e) => calculateValues('units', e.target.value)}
                                    placeholder="0.0000"
                                    className="w-full px-2 py-1.5 text-sm border rounded"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                    step="any"
                                />
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
                                        onClick={() => {
                                            setEditingId(null);
                                            setAddForm({
                                                type: 'Lumpsum',
                                                date: new Date().toISOString().slice(0, 10),
                                                nav: '',
                                                amount: '',
                                                units: '',
                                                fundName: '',
                                                fundCode: '',
                                                shortName: ''
                                            });
                                            setSearchTerm('');
                                        }}
                                        className="px-4 py-2 text-sm border rounded"
                                        style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column: Transaction List */}
                <div className="md:col-span-2">
                    <div className="p-4 rounded border shadow-sm h-full overflow-hidden flex flex-col" style={{ backgroundColor: cardBg, borderColor }}>
                        <h3 className="font-semibold mb-4" style={{ color: textColor }}>Recent Transactions</h3>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm text-left">
                                <thead className="border-b" style={{ borderColor }}>
                                    <tr style={{ color: textColor, opacity: 0.7 }}>
                                        <th className="p-2">Date</th>
                                        <th className="p-2">Fund</th>
                                        <th className="p-2 text-right">NAV</th>
                                        <th className="p-2 text-right">Units</th>
                                        <th className="p-2 text-right">Amount</th>
                                        <th className="p-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <TransactionList
                                    key={transactionListVersion}
                                    isDark={isDark}
                                    textColor={textColor}
                                    borderColor={borderColor}
                                    onEdit={handleEditTransaction}
                                    currency={currency}
                                />
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TransactionList = ({ isDark, textColor, borderColor, onEdit, currency }) => {
    const [transactions, setTransactions] = useState([]);
    const toast = useToast();

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            const allInvestments = await DataAdapter.getInvestments();
            const mfTransactions = allInvestments.filter(inv => inv.assetClass === 'Mutual Fund' || inv.exchange === 'MF');
            setTransactions(mfTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)));
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await DataAdapter.deleteInvestment(id);
            toast.success('Transaction deleted');
            loadTransactions();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    if (transactions.length === 0) {
        return (
            <tbody>
                <tr>
                    <td colSpan="6" className="p-8 text-center opacity-50" style={{ color: textColor }}>
                        No mutual fund transactions found.
                    </td>
                </tr>
            </tbody>
        );
    }

    return (
        <tbody>
            {transactions.map((txn) => (
                <tr key={txn.id} className="border-b hover:bg-opacity-5 hover:bg-gray-500" style={{ borderColor }}>
                    <td className="p-2" style={{ color: textColor }}>{formatDate(txn.date, currency)}</td>
                    <td className="p-2 font-medium" style={{ color: textColor }}>
                        <div className="font-bold">{txn.shortName || txn.name}</div>
                        <div className="text-xs opacity-50 line-clamp-1" title={txn.name}>{txn.name}</div>
                        <div className="text-xs opacity-50">{txn.symbol} • {txn.type || 'Lumpsum'}</div>
                    </td>
                    <td className="p-2 text-right" style={{ color: textColor }}>₹{parseFloat(txn.buyPrice).toFixed(2)}</td>
                    <td className="p-2 text-right" style={{ color: textColor }}>{parseFloat(txn.quantity).toFixed(4)}</td>
                    <td className="p-2 text-right font-bold" style={{ color: textColor }}>₹{parseFloat(txn.amount || (txn.quantity * txn.buyPrice)).toLocaleString()}</td>
                    <td className="p-2 text-center">
                        <div className="flex justify-center gap-2">
                            <button
                                onClick={() => onEdit(txn)}
                                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(txn.id)}
                                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                            >
                                Delete
                            </button>
                        </div>
                    </td>
                </tr>
            ))}

            <tr className="border-t-2 font-bold" style={{ borderColor, backgroundColor: isDark ? '#2d2d30' : '#f9f9f9' }}>
                <td colSpan="4" className="p-2 text-right" style={{ color: textColor }}>Total Invested</td>
                <td className="p-2 text-right" style={{ color: textColor }}>
                    ₹{transactions.reduce((sum, t) => sum + parseFloat(t.amount || (t.quantity * t.buyPrice)), 0).toLocaleString()}
                </td>
                <td></td>
            </tr>
        </tbody>
    );
};

export default MutualFunds;
