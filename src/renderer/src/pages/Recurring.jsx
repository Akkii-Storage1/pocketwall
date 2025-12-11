import React, { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants';
import EmptyState from '../components/EmptyState';
import DataAdapter from '../utils/dataAdapter';
import { useFeature } from '../context/FeatureContext';
import CurrencyConverter from '../utils/CurrencyConverter';
import { formatDate } from '../utils/DateFormatter';
import SmartInput from '../components/SmartInput';
import { detectRecurringBills } from '../utils/insights';

const Recurring = ({ isDark, currency }) => {
    const toast = useToast();
    const { checkLimit } = useFeature();
    const [recurringItems, setRecurringItems] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [dueItems, setDueItems] = useState([]);
    const [suggestedRecurring, setSuggestedRecurring] = useState([]);
    // Currency is now passed as prop
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        type: 'expense',
        category: 'Rent',
        frequency: 'Monthly',
        startDate: new Date().toISOString().split('T')[0],
        nextDueDate: new Date().toISOString().split('T')[0]
    });
    const [sortConfig, setSortConfig] = useState({ key: 'nextDueDate', direction: 'asc' });

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const headerBg = isDark ? '#3e3e42' : '#e0e0e0';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Settings loaded in App.jsx now

        const items = await DataAdapter.getRecurringRules();
        setRecurringItems(items);
        checkDueItems(items);

        // Load suggested recurring from transaction patterns
        try {
            const transactions = await DataAdapter.getTransactions();
            const detected = detectRecurringBills(transactions, items);
            // Filter out already-added recurring items and explicit ones
            const suggestions = detected.filter(d => !d.isExplicit && d.confidence === 'high');
            setSuggestedRecurring(suggestions.slice(0, 5)); // Show top 5
        } catch (err) {
            console.warn('Could not detect recurring:', err);
        }
    };

    const checkDueItems = (items) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const due = items.filter(item => {
            const dueDate = new Date(item.nextDueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate <= today;
        });
        setDueItems(due);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedItems = [...recurringItems].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const handleSave = async (e) => {
        e.preventDefault();

        // Convert input amount (Display Currency) to Base Currency (INR) for storage
        const amountInINR = CurrencyConverter.convert(parseFloat(formData.amount), currency, 'INR');

        const newItem = {
            ...formData,
            amount: amountInINR,
            active: true
        };

        if (editingId) {
            await DataAdapter.updateRecurringRule({ ...newItem, id: editingId });
            toast.success('Recurring rule updated');
        } else {
            await DataAdapter.addRecurringRule(newItem);
            toast.success('Recurring transaction added');
        }

        await loadData();
        setShowForm(false);
        setEditingId(null);
        setFormData({
            name: '',
            amount: '',
            type: 'expense',
            category: 'Rent',
            frequency: 'Monthly',
            startDate: new Date().toISOString().split('T')[0],
            nextDueDate: new Date().toISOString().split('T')[0]
        });
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        // Convert stored amount (INR) to Display Currency for editing
        const displayAmount = CurrencyConverter.convert(parseFloat(item.amount), 'INR', currency);

        setFormData({
            name: item.name,
            amount: displayAmount,
            type: item.type,
            category: item.category,
            frequency: item.frequency,
            startDate: item.startDate || new Date().toISOString().split('T')[0],
            nextDueDate: item.nextDueDate
        });
        setShowForm(true);
    };

    const restoreRecurringRule = async (item) => {
        await DataAdapter.addRecurringRule(item);
        await loadData();
        toast.success('Restored recurring rule');
    };

    const handleDelete = async (id) => {
        const itemToDelete = recurringItems.find(i => i.id === id);
        if (!itemToDelete) return;

        if (confirm('Stop this recurring transaction?')) {
            await DataAdapter.deleteRecurringRule(id);
            await loadData();
            toast.success('Recurring transaction removed', {
                action: {
                    label: 'Undo',
                    onClick: () => restoreRecurringRule(itemToDelete)
                }
            });
        }
    };

    const handlePostTransaction = async (item) => {
        try {
            // 1. Create the transaction
            // item.amount is in INR (Base). DataAdapter.addTransaction expects amount in INR?
            // Usually transactions store amount in INR (Base) and originalAmount/currency.
            // Let's assume addTransaction handles it or we pass it as is (since it's already INR).
            // If addTransaction expects Display Currency, we'd need to convert.
            // But looking at Transactions.jsx, we see it reads amount directly.
            // So we should pass the INR amount.

            await DataAdapter.addTransaction({
                amount: item.amount,
                type: item.type,
                category: item.category,
                description: `Recurring: ${item.name}`,
                date: new Date().toISOString().split('T')[0] // Post as today
            });

            // 2. Update next due date
            const nextDate = new Date(item.nextDueDate);
            if (item.frequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
            if (item.frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
            if (item.frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

            const updatedItem = { ...item, nextDueDate: nextDate.toISOString().split('T')[0] };
            await DataAdapter.updateRecurringRule(updatedItem);

            await loadData();
            toast.success(`Posted: ${item.name}`);
        } catch (error) {
            toast.error('Failed to post transaction');
        }
    };

    const handleSkip = async (item) => {
        // Just update the date without posting
        const nextDate = new Date(item.nextDueDate);
        if (item.frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
        if (item.frequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        if (item.frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

        const updatedItem = { ...item, nextDueDate: nextDate.toISOString().split('T')[0] };
        await DataAdapter.updateRecurringRule(updatedItem);
        await loadData();

        toast.info(`Skipped: ${item.name}`);
    };

    const getNextDueDates = (item, count = 3) => {
        const dates = [];
        let current = new Date(item.nextDueDate);

        for (let i = 0; i < count; i++) {
            dates.push(new Date(current));
            if (item.frequency === 'Monthly') {
                current.setMonth(current.getMonth() + 1);
            } else if (item.frequency === 'Weekly') {
                current.setDate(current.getDate() + 7);
            } else if (item.frequency === 'Yearly') {
                current.setFullYear(current.getFullYear() + 1);
            }
        }
        return dates;
    };

    const formatMoney = (amountINR) => {
        const val = CurrencyConverter.convert(amountINR, 'INR', currency);
        return CurrencyConverter.format(val, currency);
    };

    return (
        <div className="h-full p-3 flex gap-3" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' }} >
            {/* Left Panel: List of Recurring Items */}
            < div className="w-1/2 border flex flex-col" style={{ borderColor, backgroundColor: panelBg }}>
                <div className="px-3 py-2 border-b flex justify-between items-center" style={{ backgroundColor: headerBg, borderColor, color: textColor }}>
                    <span className="font-semibold text-sm">Recurring Rules</span>
                    <button
                        onClick={() => {
                            if (checkLimit('maxRecurring', recurringItems.length)) {
                                setEditingId(null);
                                setFormData({
                                    name: '',
                                    amount: '',
                                    type: 'expense',
                                    category: 'Rent',
                                    frequency: 'Monthly',
                                    startDate: new Date().toISOString().split('T')[0],
                                    nextDueDate: new Date().toISOString().split('T')[0]
                                });
                                setShowForm(true);
                            } else {
                                toast.error('Recurring transaction limit reached. Upgrade to Pro.');
                            }
                        }}
                        className="px-3 py-1 text-xs border font-semibold"
                        style={{
                            backgroundColor: isDark ? '#0e639c' : '#0078d4',
                            color: '#ffffff',
                            borderColor: isDark ? '#1177bb' : '#005a9e'
                        }}
                    >
                        Add New
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr style={{ backgroundColor: isDark ? '#333' : '#eee' }}>
                                <th className="p-2 text-left cursor-pointer hover:bg-black/5" style={{ color: textColor }} onClick={() => handleSort('name')}>
                                    Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="p-2 text-left cursor-pointer hover:bg-black/5" style={{ color: textColor }} onClick={() => handleSort('frequency')}>
                                    Freq {sortConfig.key === 'frequency' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="p-2 text-right cursor-pointer hover:bg-black/5" style={{ color: textColor }} onClick={() => handleSort('amount')}>
                                    Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                </th>
                                <th className="p-2 text-center" style={{ color: textColor }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedItems.map((item, idx) => (
                                <tr key={item.id} className="border-b" style={{ borderColor: isDark ? '#444' : '#eee' }}>
                                    <td className="p-2" style={{ color: textColor }}>
                                        <div className="font-semibold">{item.name}</div>
                                        <div className="text-[10px] opacity-70">{item.category}</div>
                                    </td>
                                    <td className="p-2" style={{ color: textColor }}>{item.frequency}</td>
                                    <td className="p-2 text-right font-semibold" style={{ color: item.type === 'income' ? 'green' : 'red' }}>
                                        {formatMoney(item.amount)}
                                    </td>
                                    <td className="p-2 text-center flex justify-center gap-2">
                                        <button onClick={() => handleEdit(item)} className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-1 rounded">
                                            <Edit2 size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:underline text-xs">Stop</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold border-t" style={{ backgroundColor: isDark ? '#333' : '#eee' }}>
                                <td className="p-2" colSpan={2} style={{ color: textColor }}>Est. Monthly Total</td>
                                <td className="p-2 text-right" style={{ color: textColor }}>
                                    {formatMoney(recurringItems.reduce((sum, item) => {
                                        let monthly = parseFloat(item.amount);
                                        if (item.frequency === 'Weekly') monthly *= 4.33;
                                        if (item.frequency === 'Yearly') monthly /= 12;
                                        return sum + (item.type === 'expense' ? monthly : -monthly);
                                    }, 0))}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div >

            {/* Right Panel: Bill Calendar / Upcoming */}
            < div className="w-1/2 flex flex-col gap-3" >
                {/* Action Required Section */}
                {
                    dueItems.length > 0 && (
                        <div className="border p-3 shadow-lg animate-pulse" style={{ borderColor: '#ff0000', backgroundColor: isDark ? '#3a1111' : '#fff0f0' }}>
                            <div className="font-bold text-sm mb-2" style={{ color: isDark ? '#ff9999' : '#cc0000' }}>⚠️ Action Required: {dueItems.length} Bill(s) Due</div>
                            <div className="space-y-2">
                                {dueItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-xs">
                                        <span style={{ color: textColor }}>{item.name} ({formatDate(item.nextDueDate, currency)})</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSkip(item)}
                                                className="px-2 py-1 border hover:bg-opacity-80"
                                                style={{ backgroundColor: isDark ? '#333' : '#eee', color: textColor }}
                                            >
                                                Skip
                                            </button>
                                            <button
                                                onClick={() => handlePostTransaction(item)}
                                                className="px-2 py-1 border font-bold text-white"
                                                style={{ backgroundColor: '#008000' }}
                                            >
                                                Pay Now
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Suggested Recurring Section */}
                {suggestedRecurring.length > 0 && (
                    <div className="border p-3" style={{ borderColor: '#fbbf24', backgroundColor: isDark ? '#3a2f11' : '#fffbeb' }}>
                        <div className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: isDark ? '#fcd34d' : '#92400e' }}>
                            💡 Suggested Recurring (Auto-Detected)
                        </div>
                        <div className="text-xs mb-2 opacity-70" style={{ color: textColor }}>
                            Based on your transaction patterns
                        </div>
                        <div className="space-y-2">
                            {suggestedRecurring.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs border-b pb-2" style={{ borderColor: isDark ? '#555' : '#ddd' }}>
                                    <div>
                                        <span className="font-semibold" style={{ color: textColor }}>{item.payee}</span>
                                        <span className="ml-2 opacity-60">~{formatMoney(item.avgAmount)}/{item.frequency}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            // Pre-fill form with suggested data
                                            setFormData({
                                                name: item.payee,
                                                amount: CurrencyConverter.convert(item.avgAmount, 'INR', currency),
                                                type: 'expense',
                                                category: 'Subscriptions',
                                                frequency: item.frequency,
                                                startDate: new Date().toISOString().split('T')[0],
                                                nextDueDate: item.nextDate || new Date().toISOString().split('T')[0]
                                            });
                                            setShowForm(true);
                                        }}
                                        className="px-2 py-1 text-xs font-semibold rounded"
                                        style={{ backgroundColor: '#fbbf24', color: '#78350f' }}
                                    >
                                        + Add as Recurring
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border flex flex-col flex-1" style={{ borderColor, backgroundColor: panelBg }}>
                    <div className="px-3 py-2 border-b" style={{ backgroundColor: headerBg, borderColor, color: textColor }}>
                        <span className="font-semibold text-sm">Upcoming Bills (Next 30 Days)</span>
                    </div>

                    <div className="flex-1 overflow-auto p-3 space-y-2">
                        {recurringItems.flatMap(item => {
                            const dates = getNextDueDates(item, 5); // Get next 5 occurrences
                            return dates.map(date => ({ ...item, date }));
                        })
                            .sort((a, b) => a.date - b.date)
                            .filter(item => {
                                const diffTime = item.date - new Date();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays >= 0 && diffDays <= 30;
                            })
                            .map((item, idx) => (
                                <div
                                    key={`${item.id}-${idx}`}
                                    className="border p-2 flex justify-between items-center shadow-sm"
                                    style={{
                                        backgroundColor: isDark ? '#333' : '#fff',
                                        borderColor: isDark ? '#555' : '#ddd',
                                        borderLeft: `4px solid ${item.type === 'income' ? 'green' : 'red'}`
                                    }}
                                >
                                    <div>
                                        <div className="font-semibold text-sm" style={{ color: textColor }}>{item.name}</div>
                                        <div className="text-xs" style={{ color: isDark ? '#aaa' : '#666' }}>
                                            Due: {formatDate(item.date, currency)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold" style={{ color: textColor }}>{formatMoney(item.amount)}</div>
                                        {/* Only show Pay Now if it's the very next one and close to date, otherwise it's just forecast */}
                                    </div>
                                </div>
                            ))}

                        {recurringItems.length === 0 && (
                            <div className="mt-10">
                                <EmptyState
                                    title="No Upcoming Bills"
                                    message="Add a recurring transaction to see your bill forecast here."
                                    isDark={isDark}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Modal Form */}
            {
                showForm && (
                    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setShowForm(false);
                            if (e.key === 'Enter') handleSave(e);
                        }}
                    >
                        <div className="border-2 shadow-2xl p-4 space-y-3" style={{ backgroundColor: bgColor, borderColor: isDark ? '#007acc' : '#0078d4', width: '400px' }}>
                            <h3 className="font-semibold text-sm mb-2" style={{ color: textColor }}>{editingId ? 'Edit Recurring Rule' : 'Add Recurring Rule'}</h3>

                            <input
                                autoFocus
                                placeholder="Name (e.g., Rent, Netflix)"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full border p-1 text-sm"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor }}
                            />

                            <div className="flex gap-2">
                                <SmartInput
                                    placeholder="Amount"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-1/2 border p-1 text-sm"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor }}
                                />
                                <select
                                    value={formData.frequency}
                                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                    className="w-1/2 border p-1 text-sm"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor }}
                                >
                                    <option>Weekly</option>
                                    <option>Monthly</option>
                                    <option>Yearly</option>
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value, category: e.target.value === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] })}
                                    className="w-1/2 border p-1 text-sm"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor }}
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                </select>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-1/2 border p-1 text-sm"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor }}
                                >
                                    {(formData.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                                        <option key={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs block mb-1" style={{ color: textColor }}>Next Due Date</label>
                                <input
                                    type="date"
                                    value={formData.nextDueDate}
                                    onChange={e => setFormData({ ...formData, nextDueDate: e.target.value })}
                                    className="w-full border p-1 text-sm"
                                    style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor }}
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setShowForm(false)} className="px-3 py-1 border text-xs" style={{ color: textColor }}>Cancel</button>
                                <button onClick={handleSave} className="px-3 py-1 border text-xs bg-blue-600 text-white">{editingId ? 'Update Rule' : 'Save Rule'}</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Recurring;
