import React, { useState, useEffect } from 'react';
import EmptyState from '../components/EmptyState';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';
import Modal from '../components/Modal';
import SmartInput from '../components/SmartInput';

const Payees = ({ isDark }) => {
    const [payees, setPayees] = useState([]);
    const [selectedPayee, setSelectedPayee] = useState(null);
    const [payeeTransactions, setPayeeTransactions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingPayee, setEditingPayee] = useState(null);
    const [formData, setFormData] = useState({ name: '' });

    const [currency, setCurrency] = useState('INR');
    const [payeeSort, setPayeeSort] = useState('name'); // name, count, spent
    const [txSort, setTxSort] = useState('date'); // date, amount

    // Payee Budget State
    const [payeeBudgets, setPayeeBudgets] = useState({});
    const [showBudgetModal, setShowBudgetModal] = useState(false);
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetPeriod, setBudgetPeriod] = useState('monthly');
    const [budgetCount, setBudgetCount] = useState('');

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const panelBg = isDark ? '#252526' : '#f0f0f0';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';

    useEffect(() => {
        loadPayees();
    }, []);

    const loadPayees = async () => {
        const settings = await DataAdapter.getUserSettings();
        setCurrency(settings.defaultCurrency || 'INR');
        const data = await DataAdapter.getPayees();
        setPayees(data);

        const savedBudgets = localStorage.getItem('pocketwall_payee_budgets');
        if (savedBudgets) {
            const parsed = JSON.parse(savedBudgets);
            // Migration: Convert simple numbers to objects
            const migrated = {};
            Object.keys(parsed).forEach(key => {
                if (typeof parsed[key] === 'number') {
                    migrated[key] = { limit: parsed[key], period: 'monthly', count: 0 };
                } else {
                    migrated[key] = parsed[key];
                }
            });
            setPayeeBudgets(migrated);
        }
    };

    const handlePayeeClick = async (payee) => {
        setSelectedPayee(payee);
        const allTransactions = await DataAdapter.getTransactions();
        const filtered = allTransactions.filter(t => t.payee === payee.name).sort((a, b) => new Date(b.date) - new Date(a.date));
        setPayeeTransactions(filtered);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingPayee) {
                await DataAdapter.updatePayee({ ...editingPayee, ...formData });
            } else {
                await DataAdapter.addPayee(formData);
            }
            setShowForm(false);
            setFormData({ name: '' });
            setEditingPayee(null);
            loadPayees();
        } catch (error) {
            console.error('Error saving payee:', error);
        }
    };

    const handleEdit = (payee) => {
        // Only allow editing manually created payees
        const manualPayee = payees.find(p => p.name === payee.name && p.isManual);
        if (!manualPayee) {
            alert('Can only edit manually created payees');
            return;
        }
        setEditingPayee(manualPayee);
        setFormData({ name: manualPayee.name });
        setShowForm(true);
    };

    const handleDelete = async (payee) => {
        const manualPayee = payees.find(p => p.name === payee.name && p.isManual);
        if (!manualPayee) {
            alert('Can only delete manually created payees');
            return;
        }
        if (confirm(`Delete payee "${payee.name}"?`)) {
            await DataAdapter.deletePayee(manualPayee.id);
            loadPayees();
            if (selectedPayee?.name === payee.name) {
                setSelectedPayee(null);
            }
        }
    };

    const handleSaveBudget = () => {
        if (!selectedPayee) return;

        const amount = parseFloat(budgetAmount);
        const count = parseInt(budgetCount);

        if ((isNaN(amount) || amount <= 0) && (isNaN(count) || count <= 0)) {
            // If both are invalid/cleared, remove the limit
            const newBudgets = { ...payeeBudgets };
            delete newBudgets[selectedPayee.name];
            setPayeeBudgets(newBudgets);
            localStorage.setItem('pocketwall_payee_budgets', JSON.stringify(newBudgets));
        } else {
            // Convert from display currency to INR for storage
            const amountINR = !isNaN(amount) ? CurrencyConverter.convert(amount, currency, 'INR') : 0;

            const newBudgets = {
                ...payeeBudgets,
                [selectedPayee.name]: {
                    limit: amountINR,
                    period: budgetPeriod,
                    count: !isNaN(count) ? count : 0
                }
            };
            setPayeeBudgets(newBudgets);
            localStorage.setItem('pocketwall_payee_budgets', JSON.stringify(newBudgets));
        }
        setShowBudgetModal(false);
    };

    const filteredPayees = payees
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (payeeSort === 'name') return a.name.localeCompare(b.name);
            if (payeeSort === 'count') return b.count - a.count;
            if (payeeSort === 'spent') return b.totalSpent - a.totalSpent;
            return 0;
        });

    const sortedTransactions = [...payeeTransactions].sort((a, b) => {
        if (txSort === 'date') return new Date(b.date) - new Date(a.date);
        if (txSort === 'amount') return parseFloat(b.amount) - parseFloat(a.amount);
        return 0;
    });

    const formatMoney = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    // Helper to convert INR to Display
    const toDisplay = (amountINR) => {
        return CurrencyConverter.convert(amountINR, 'INR', currency);
    };

    const getPeriodStart = (period) => {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);

        if (period === 'weekly') {
            const day = start.getDay(); // 0 is Sunday
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            start.setDate(diff);
        } else if (period === 'monthly') {
            start.setDate(1);
        } else if (period === 'yearly') {
            start.setMonth(0, 1);
        }
        return start;
    };

    return (
        <div className="h-full flex" style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Left Sidebar: Payee List */}
            <div className="w-1/3 border-r flex flex-col" style={{ borderColor }}>
                <div className="p-4 border-b" style={{ borderColor }}>
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">Payees</h2>
                        <button
                            onClick={() => { setEditingPayee(null); setFormData({ name: '' }); setShowForm(true); }}
                            className="px-3 py-1 text-xs font-bold text-white rounded"
                            style={{ backgroundColor: isDark ? '#007acc' : '#0078d4' }}
                        >
                            + New Payee
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search payees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded"
                        style={{
                            backgroundColor: isDark ? '#333' : '#fff',
                            color: textColor,
                            borderColor: isDark ? '#555' : '#ccc'
                        }}
                    />

                    <div className="flex gap-2 mt-2 text-xs">
                        <button onClick={() => setPayeeSort('name')} className={`px-2 py-1 rounded border ${payeeSort === 'name' ? 'bg-blue-500 text-white' : ''}`} style={{ borderColor }}>Name</button>
                        <button onClick={() => setPayeeSort('count')} className={`px-2 py-1 rounded border ${payeeSort === 'count' ? 'bg-blue-500 text-white' : ''}`} style={{ borderColor }}>Count</button>
                        <button onClick={() => setPayeeSort('spent')} className={`px-2 py-1 rounded border ${payeeSort === 'spent' ? 'bg-blue-500 text-white' : ''}`} style={{ borderColor }}>Spent</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredPayees.length === 0 ? (
                        <div className="p-4 text-center opacity-50 text-sm">No payees found</div>
                    ) : (
                        filteredPayees.map(payee => (
                            <div
                                key={payee.name}
                                className={`p-4 border-b ${selectedPayee?.name === payee.name ? 'bg-blue-500 bg-opacity-10 border-l-4 border-l-blue-500' : ''}`}
                                style={{ borderColor }}
                            >
                                <div
                                    onClick={() => handlePayeeClick(payee)}
                                    className="cursor-pointer"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">{payee.name}</span>
                                            {payee.isManual && <span className="text-xs px-1 py-0.5 rounded bg-blue-500 text-white">Manual</span>}
                                        </div>
                                        <span className="text-xs opacity-70">{payee.count} txns</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-xs">
                                        <span className="opacity-60">{payee.lastCategory}</span>
                                        <span className="font-semibold text-red-500">{formatMoney(toDisplay(payee.totalSpent))}</span>
                                    </div>
                                </div>
                                {payee.isManual && (
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => handleEdit(payee)}
                                            className="text-xs text-blue-500 hover:underline"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(payee)}
                                            className="text-xs text-red-500 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Content: Payee Details */}
            <div className="flex-1 flex flex-col">
                {selectedPayee ? (
                    <>
                        <div className="p-6 border-b" style={{ borderColor, backgroundColor: panelBg }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-3xl font-bold mb-1">{selectedPayee.name}</h1>
                                    <p className="opacity-70 text-sm">Default Category: {selectedPayee.lastCategory}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm opacity-70">Total Spent</div>
                                    <div className="text-2xl font-bold text-red-500">{formatMoney(toDisplay(selectedPayee.totalSpent))}</div>
                                </div>
                            </div>
                        </div>

                        {/* Budget Section */}
                        <div className="px-6 py-4 border-b" style={{ borderColor, backgroundColor: isDark ? '#2d2d30' : '#f9f9f9' }}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-sm">Budget & Limits</h3>
                                <button
                                    onClick={() => {
                                        const budget = payeeBudgets[selectedPayee.name];
                                        if (budget) {
                                            setBudgetAmount(budget.limit ? toDisplay(budget.limit).toFixed(2) : '');
                                            setBudgetPeriod(budget.period || 'monthly');
                                            setBudgetCount(budget.count || '');
                                        } else {
                                            setBudgetAmount('');
                                            setBudgetPeriod('monthly');
                                            setBudgetCount('');
                                        }
                                        setShowBudgetModal(true);
                                    }}
                                    className="text-xs text-blue-500 hover:underline"
                                >
                                    {payeeBudgets[selectedPayee.name] ? 'Edit Rules' : 'Set Rules'}
                                </button>
                            </div>

                            {payeeBudgets[selectedPayee.name] ? (
                                <div className="space-y-3">
                                    {(() => {
                                        const budget = payeeBudgets[selectedPayee.name];
                                        const limitINR = budget.limit || 0;
                                        const countLimit = budget.count || 0;
                                        const period = budget.period || 'monthly';

                                        const startDate = getPeriodStart(period);
                                        const currentPeriodTx = sortedTransactions.filter(t => {
                                            const d = new Date(t.date);
                                            return d >= startDate && t.type === 'expense';
                                        });

                                        const periodSpent = currentPeriodTx.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
                                        const periodCount = currentPeriodTx.length;

                                        return (
                                            <>
                                                {/* Amount Limit Progress */}
                                                {limitINR > 0 && (
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span>{formatMoney(toDisplay(periodSpent))} spent this {period.replace('ly', '')}</span>
                                                            <span className={(limitINR - periodSpent) < 0 ? 'text-red-500 font-bold' : 'opacity-70'}>
                                                                {(limitINR - periodSpent) < 0 ? `Over by ${formatMoney(toDisplay(Math.abs(limitINR - periodSpent)))}` : `${formatMoney(toDisplay(limitINR - periodSpent))} left`}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${(periodSpent / limitINR) > 1 ? 'bg-red-500' : (periodSpent / limitINR) > 0.8 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                                style={{ width: `${Math.min((periodSpent / limitINR) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                        <div className="text-right text-[10px] opacity-60 mt-1">
                                                            Limit: {formatMoney(toDisplay(limitINR))} / {period.replace('ly', '')}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Count Limit Progress */}
                                                {countLimit > 0 && (
                                                    <div>
                                                        <div className="flex justify-between text-xs mb-1">
                                                            <span>{periodCount} transactions this {period.replace('ly', '')}</span>
                                                            <span className={(countLimit - periodCount) < 0 ? 'text-red-500 font-bold' : 'opacity-70'}>
                                                                {(countLimit - periodCount) < 0 ? `Over by ${Math.abs(countLimit - periodCount)}` : `${countLimit - periodCount} left`}
                                                            </span>
                                                        </div>
                                                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${(periodCount / countLimit) > 1 ? 'bg-red-500' : (periodCount / countLimit) > 0.8 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                                                style={{ width: `${Math.min((periodCount / countLimit) * 100, 100)}%` }}
                                                            />
                                                        </div>
                                                        <div className="text-right text-[10px] opacity-60 mt-1">
                                                            Max: {countLimit} txns / {period.replace('ly', '')}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="text-xs opacity-60 italic">No budget rules set for this payee.</div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold opacity-80">Transaction History</h3>
                                <div className="flex gap-2 text-xs">
                                    <span className="opacity-60 self-center">Sort by:</span>
                                    <button onClick={() => setTxSort('date')} className={`px-2 py-1 rounded border ${txSort === 'date' ? 'bg-blue-500 text-white' : ''}`} style={{ borderColor }}>Date</button>
                                    <button onClick={() => setTxSort('amount')} className={`px-2 py-1 rounded border ${txSort === 'amount' ? 'bg-blue-500 text-white' : ''}`} style={{ borderColor }}>Amount</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {sortedTransactions.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 border rounded shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                                        <div className="flex items-center gap-4">
                                            <div className="text-xs opacity-70 w-24">{new Date(t.date).toLocaleDateString()}</div>
                                            <div>
                                                <div className="font-semibold text-sm">{t.description || 'No description'}</div>
                                                <div className="text-xs opacity-60">{t.category}</div>
                                            </div>
                                        </div>
                                        <div className={`font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.type === 'income' ? '+' : '-'}{formatMoney(toDisplay(parseFloat(t.amount)))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <EmptyState
                        title="Select a Payee"
                        message="Click on a payee from the list to view detailed statistics and history."
                        isDark={isDark}
                    />
                )}
            </div>

            {/* Payee Form Modal */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-96 border shadow-2xl p-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="font-bold mb-4">{editingPayee ? 'Edit Payee' : 'New Payee'}</h3>
                        <form onSubmit={handleSave} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold mb-1">Payee Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                    placeholder="e.g. Amazon, Starbucks"
                                    disabled={!!editingPayee}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setEditingPayee(null); }}
                                    className="px-3 py-1 text-xs border"
                                    style={{ borderColor }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1 text-xs text-white font-bold"
                                    style={{ backgroundColor: '#0078d4' }}
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Budget Modal */}
            <Modal
                isOpen={showBudgetModal}
                onClose={() => setShowBudgetModal(false)}
                title={`Budget Rules: ${selectedPayee?.name}`}
                isDark={isDark}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Period</label>
                        <select
                            value={budgetPeriod}
                            onChange={(e) => setBudgetPeriod(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                        >
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Spending Limit ({currency})</label>
                        <SmartInput
                            value={budgetAmount}
                            onChange={(e) => setBudgetAmount(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            placeholder="0.00"
                        />
                        <p className="text-xs opacity-60 mt-1">Leave empty for no amount limit.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Max Transactions</label>
                        <input
                            type="number"
                            value={budgetCount}
                            onChange={(e) => setBudgetCount(e.target.value)}
                            className="w-full px-3 py-2 border rounded"
                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            placeholder="e.g. 5"
                        />
                        <p className="text-xs opacity-60 mt-1">Leave empty for no count limit.</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t" style={{ borderColor }}>
                        <button
                            onClick={() => setShowBudgetModal(false)}
                            className="px-4 py-2 text-sm border rounded hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: textColor, borderColor }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveBudget}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                        >
                            Save Rules
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Payees;
