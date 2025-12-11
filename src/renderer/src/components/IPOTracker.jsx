import React, { useState, useEffect } from 'react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import CurrencyConverter from '../utils/CurrencyConverter';

const IPOTracker = ({ isDark, currency, isOpen, onClose }) => {
    const toast = useToast();
    const [pendingInvestments, setPendingInvestments] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('all');

    // Form State
    const [form, setForm] = useState({
        type: 'IPO',
        name: '',
        symbol: '',
        exchange: 'NSE',
        appliedQty: '',
        pricePerUnit: '',
        sourceAccount: '',
        notes: '',
        // Bond-specific
        maturityDate: '',
        interestRate: ''
    });

    // Allotment Modal
    const [showAllotmentModal, setShowAllotmentModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [allotmentForm, setAllotmentForm] = useState({
        allottedQty: '',
        listingPrice: ''
    });

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const panelBg = isDark ? '#252526' : '#f9fafb';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const inputBg = isDark ? '#1e1e1e' : '#ffffff';

    useEffect(() => {
        if (isOpen) loadData();
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pendingData, accountsData] = await Promise.all([
                DataAdapter.getPendingInvestments(),
                DataAdapter.getAccounts()
            ]);
            // Sort by date, newest first
            pendingData.sort((a, b) => new Date(b.appliedDate || b.createdAt) - new Date(a.appliedDate || a.createdAt));
            setPendingInvestments(pendingData);
            setAccounts(accountsData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load pending investments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name || !form.appliedQty || !form.pricePerUnit || !form.sourceAccount) {
            toast.error('Please fill all required fields');
            return;
        }

        const totalAmount = parseFloat(form.appliedQty) * parseFloat(form.pricePerUnit);

        try {
            // 1. Create pending investment record
            const newItem = await DataAdapter.addPendingInvestment({
                ...form,
                appliedQty: parseFloat(form.appliedQty),
                pricePerUnit: parseFloat(form.pricePerUnit),
                totalAmount,
                appliedDate: new Date().toISOString().split('T')[0],
                status: 'pending'
            });

            // 2. Create expense transaction (money blocked)
            await DataAdapter.addTransaction({
                date: new Date().toISOString().split('T')[0],
                payee: `${form.type}: ${form.name}`,
                amount: -totalAmount, // Negative for expense
                type: 'expense',
                category: 'Investment',
                account: form.sourceAccount,
                note: `Applied for ${form.type} - ${form.appliedQty} units @ ₹${form.pricePerUnit}`,
                pendingInvestmentId: newItem.id
            });

            toast.success(`${form.type} application recorded! ₹${totalAmount.toLocaleString()} blocked from ${form.sourceAccount}`);

            // Reset form
            setForm({
                type: 'IPO',
                name: '',
                symbol: '',
                exchange: 'NSE',
                appliedQty: '',
                pricePerUnit: '',
                sourceAccount: '',
                notes: '',
                maturityDate: '',
                interestRate: ''
            });
            setShowForm(false);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save application');
        }
    };

    const handleAllotment = async (item, isAllotted) => {
        setSelectedItem(item);
        if (isAllotted) {
            setAllotmentForm({
                allottedQty: item.appliedQty.toString(),
                listingPrice: item.pricePerUnit.toString()
            });
            setShowAllotmentModal(true);
        } else {
            // Rejected - Full Refund
            try {
                // 1. Update status
                await DataAdapter.updatePendingInvestment({
                    id: item.id,
                    status: 'rejected',
                    refundAmount: item.totalAmount,
                    resultDate: new Date().toISOString().split('T')[0]
                });

                // 2. Create refund transaction
                await DataAdapter.addTransaction({
                    date: new Date().toISOString().split('T')[0],
                    payee: `${item.type} Refund: ${item.name}`,
                    amount: item.totalAmount, // Positive for income
                    type: 'income',
                    category: 'Investment',
                    account: item.sourceAccount,
                    note: `${item.type} not allotted - Full refund`
                });

                toast.success(`${item.type} rejected. ₹${item.totalAmount.toLocaleString()} refunded to ${item.sourceAccount}`);
                loadData();
            } catch (error) {
                console.error(error);
                toast.error('Failed to process rejection');
            }
        }
    };

    const confirmAllotment = async () => {
        if (!selectedItem) return;

        const allottedQty = parseFloat(allotmentForm.allottedQty);
        const listingPrice = parseFloat(allotmentForm.listingPrice) || selectedItem.pricePerUnit;
        const refundQty = selectedItem.appliedQty - allottedQty;
        const refundAmount = refundQty * selectedItem.pricePerUnit;
        const allottedAmount = allottedQty * selectedItem.pricePerUnit;

        try {
            // 1. Update status
            await DataAdapter.updatePendingInvestment({
                id: selectedItem.id,
                status: 'allotted',
                allottedQty,
                allottedAmount,
                refundAmount,
                listingPrice,
                resultDate: new Date().toISOString().split('T')[0]
            });

            // 2. Add to Investments portfolio
            await DataAdapter.addInvestment({
                symbol: selectedItem.symbol || selectedItem.name.substring(0, 10).toUpperCase().replace(/\s/g, ''),
                name: selectedItem.name,
                quantity: allottedQty,
                buyPrice: selectedItem.pricePerUnit,
                date: new Date().toISOString().split('T')[0],
                exchange: selectedItem.exchange,
                type: 'buy',
                assetClass: selectedItem.type === 'NFO' ? 'Mutual Fund' : 'Stock',
                note: `Allotted from ${selectedItem.type}`
            });

            // 3. Create refund transaction if partial
            if (refundAmount > 0) {
                await DataAdapter.addTransaction({
                    date: new Date().toISOString().split('T')[0],
                    payee: `${selectedItem.type} Partial Refund: ${selectedItem.name}`,
                    amount: refundAmount,
                    type: 'income',
                    category: 'Investment',
                    account: selectedItem.sourceAccount,
                    note: `${refundQty} units not allotted`
                });
            }

            toast.success(`${selectedItem.type} allotted! ${allottedQty} units added to portfolio${refundAmount > 0 ? `, ₹${refundAmount.toLocaleString()} refunded` : ''}`);
            setShowAllotmentModal(false);
            setSelectedItem(null);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Failed to process allotment');
        }
    };

    const getFilteredItems = () => {
        if (activeTab === 'all') return pendingInvestments;
        return pendingInvestments.filter(item => item.type === activeTab.toUpperCase());
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: '#fef3c7', color: '#92400e', emoji: '⏳' },
            allotted: { bg: '#d1fae5', color: '#065f46', emoji: '✅' },
            rejected: { bg: '#fee2e2', color: '#991b1b', emoji: '❌' },
            listed: { bg: '#dbeafe', color: '#1e40af', emoji: '📈' }
        };
        const s = styles[status] || styles.pending;
        return (
            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
                {s.emoji} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl shadow-2xl flex flex-col"
                style={{ backgroundColor: bgColor }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between" style={{ borderColor }}>
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: textColor }}>
                            📋 IPO / NFO / Bonds Tracker
                        </h2>
                        <p className="text-xs opacity-60" style={{ color: textColor }}>
                            Track applications, allotments, and auto-manage transactions
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-2xl"
                        style={{ color: textColor }}
                    >
                        ×
                    </button>
                </div>

                {/* Tabs & Add Button */}
                <div className="p-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor }}>
                    <div className="flex gap-2">
                        {['all', 'IPO', 'NFO', 'Bond', 'ETF'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1 rounded-lg text-sm transition-colors ${activeTab === tab ? 'bg-blue-500 text-white' : ''}`}
                                style={activeTab !== tab ? { backgroundColor: panelBg, color: textColor } : {}}
                            >
                                {tab === 'all' ? '📊 All' : tab}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600"
                    >
                        {showForm ? '✕ Cancel' : '+ New Application'}
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                    {/* Add Form */}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
                            <h3 className="font-semibold mb-4" style={{ color: textColor }}>New Application</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Type */}
                                <div>
                                    <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Type *</label>
                                    <select
                                        value={form.type}
                                        onChange={e => setForm({ ...form, type: e.target.value })}
                                        className="w-full p-2 rounded border text-sm"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    >
                                        <option value="IPO">IPO</option>
                                        <option value="NFO">NFO (Mutual Fund)</option>
                                        <option value="Bond">Bond</option>
                                        <option value="ETF">ETF</option>
                                    </select>
                                </div>

                                {/* Name */}
                                <div className="col-span-2">
                                    <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Company/Fund Name *</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g., Swiggy Ltd"
                                        className="w-full p-2 rounded border text-sm"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        required
                                    />
                                </div>

                                {/* Symbol (Optional) */}
                                <div>
                                    <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Symbol (Optional)</label>
                                    <input
                                        type="text"
                                        value={form.symbol}
                                        onChange={e => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                                        placeholder="SWIGGY"
                                        className="w-full p-2 rounded border text-sm"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    />
                                </div>

                                {/* Exchange */}
                                <div>
                                    <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Exchange</label>
                                    <select
                                        value={form.exchange}
                                        onChange={e => setForm({ ...form, exchange: e.target.value })}
                                        className="w-full p-2 rounded border text-sm"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    >
                                        <option value="NSE">NSE</option>
                                        <option value="BSE">BSE</option>
                                        <option value="US">US (NYSE/NASDAQ)</option>
                                    </select>
                                </div>

                                {/* Quantity */}
                                <div>
                                    <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Qty Applied *</label>
                                    <input
                                        type="number"
                                        value={form.appliedQty}
                                        onChange={e => setForm({ ...form, appliedQty: e.target.value })}
                                        placeholder="100"
                                        className="w-full p-2 rounded border text-sm"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        required
                                        min="1"
                                    />
                                </div>

                                {/* Price */}
                                <div>
                                    <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Price/Unit *</label>
                                    <input
                                        type="number"
                                        value={form.pricePerUnit}
                                        onChange={e => setForm({ ...form, pricePerUnit: e.target.value })}
                                        placeholder="500"
                                        className="w-full p-2 rounded border text-sm"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        required
                                        min="0"
                                        step="0.01"
                                    />
                                </div>

                                {/* Source Account */}
                                <div>
                                    <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Source Account *</label>
                                    <select
                                        value={form.sourceAccount}
                                        onChange={e => setForm({ ...form, sourceAccount: e.target.value })}
                                        className="w-full p-2 rounded border text-sm"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                        required
                                    >
                                        <option value="">Select Account</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.name}>{acc.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Bond-specific: Maturity Date */}
                                {form.type === 'Bond' && (
                                    <>
                                        <div>
                                            <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Maturity Date</label>
                                            <input
                                                type="date"
                                                value={form.maturityDate}
                                                onChange={e => setForm({ ...form, maturityDate: e.target.value })}
                                                className="w-full p-2 rounded border text-sm"
                                                style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Interest Rate (%)</label>
                                            <input
                                                type="number"
                                                value={form.interestRate}
                                                onChange={e => setForm({ ...form, interestRate: e.target.value })}
                                                placeholder="7.5"
                                                className="w-full p-2 rounded border text-sm"
                                                style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                                step="0.01"
                                            />
                                        </div>
                                    </>
                                )}

                                {/* Notes */}
                                <div className="col-span-2">
                                    <label className="text-xs opacity-70 block mb-1" style={{ color: textColor }}>Notes</label>
                                    <input
                                        type="text"
                                        value={form.notes}
                                        onChange={e => setForm({ ...form, notes: e.target.value })}
                                        placeholder="Applied via Zerodha, Category: Retail"
                                        className="w-full p-2 rounded border text-sm"
                                        style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    />
                                </div>
                            </div>

                            {/* Total */}
                            {form.appliedQty && form.pricePerUnit && (
                                <div className="mt-3 p-2 rounded bg-blue-500/10 text-blue-600 text-sm font-medium">
                                    💰 Total Amount: ₹{(parseFloat(form.appliedQty) * parseFloat(form.pricePerUnit)).toLocaleString()}
                                </div>
                            )}

                            <div className="mt-4 flex justify-end">
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                                >
                                    ✓ Save Application
                                </button>
                            </div>
                        </form>
                    )}

                    {/* List */}
                    {loading ? (
                        <div className="text-center py-8 opacity-50" style={{ color: textColor }}>Loading...</div>
                    ) : getFilteredItems().length === 0 ? (
                        <div className="text-center py-8 opacity-50" style={{ color: textColor }}>
                            No {activeTab === 'all' ? '' : activeTab} applications yet. Click "+ New Application" to add one.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {getFilteredItems().map(item => (
                                <div
                                    key={item.id}
                                    className="p-4 rounded-xl border flex items-center justify-between gap-4"
                                    style={{ backgroundColor: panelBg, borderColor }}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: isDark ? '#3e3e42' : '#e5e7eb', color: textColor }}>
                                                {item.type}
                                            </span>
                                            {getStatusBadge(item.status)}
                                        </div>
                                        <div className="font-semibold" style={{ color: textColor }}>{item.name}</div>
                                        <div className="text-xs opacity-60" style={{ color: textColor }}>
                                            {item.appliedQty} units @ ₹{item.pricePerUnit} = ₹{item.totalAmount?.toLocaleString()}
                                            <span className="ml-2">| From: {item.sourceAccount}</span>
                                            {item.appliedDate && <span className="ml-2">| Applied: {item.appliedDate}</span>}
                                        </div>
                                        {item.status === 'allotted' && (
                                            <div className="text-xs text-green-600 mt-1">
                                                ✅ Allotted: {item.allottedQty} units
                                                {item.refundAmount > 0 && ` | Refund: ₹${item.refundAmount.toLocaleString()}`}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {item.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAllotment(item, true)}
                                                className="px-3 py-1 rounded bg-green-500 text-white text-sm hover:bg-green-600"
                                            >
                                                ✓ Allotted
                                            </button>
                                            <button
                                                onClick={() => handleAllotment(item, false)}
                                                className="px-3 py-1 rounded bg-red-500 text-white text-sm hover:bg-red-600"
                                            >
                                                ✗ Rejected
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Allotment Modal */}
            {showAllotmentModal && selectedItem && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50" onClick={() => setShowAllotmentModal(false)}>
                    <div
                        className="w-full max-w-md p-6 rounded-xl shadow-xl"
                        style={{ backgroundColor: bgColor }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold mb-4" style={{ color: textColor }}>
                            ✅ Confirm Allotment: {selectedItem.name}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm opacity-70 block mb-1" style={{ color: textColor }}>
                                    Allotted Quantity (max: {selectedItem.appliedQty})
                                </label>
                                <input
                                    type="number"
                                    value={allotmentForm.allottedQty}
                                    onChange={e => setAllotmentForm({ ...allotmentForm, allottedQty: e.target.value })}
                                    max={selectedItem.appliedQty}
                                    min="0"
                                    className="w-full p-2 rounded border"
                                    style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                />
                            </div>

                            <div>
                                <label className="text-sm opacity-70 block mb-1" style={{ color: textColor }}>
                                    Listing/Allotment Price (per unit)
                                </label>
                                <input
                                    type="number"
                                    value={allotmentForm.listingPrice}
                                    onChange={e => setAllotmentForm({ ...allotmentForm, listingPrice: e.target.value })}
                                    placeholder={selectedItem.pricePerUnit}
                                    className="w-full p-2 rounded border"
                                    style={{ backgroundColor: inputBg, color: textColor, borderColor }}
                                    step="0.01"
                                />
                            </div>

                            {/* Preview */}
                            <div className="p-3 rounded text-sm" style={{ backgroundColor: panelBg }}>
                                <div style={{ color: textColor }}>
                                    📊 Allotted: {allotmentForm.allottedQty || 0} units @ ₹{allotmentForm.listingPrice || selectedItem.pricePerUnit}
                                </div>
                                {selectedItem.appliedQty - parseFloat(allotmentForm.allottedQty || 0) > 0 && (
                                    <div className="text-orange-500">
                                        💵 Refund: ₹{((selectedItem.appliedQty - parseFloat(allotmentForm.allottedQty || 0)) * selectedItem.pricePerUnit).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowAllotmentModal(false)}
                                className="px-4 py-2 rounded"
                                style={{ backgroundColor: panelBg, color: textColor }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAllotment}
                                className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
                            >
                                ✓ Confirm Allotment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IPOTracker;
