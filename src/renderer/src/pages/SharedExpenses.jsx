import React, { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { useToast } from '../components/Toast';
import DataAdapter from '../utils/dataAdapter';
import EmptyState from '../components/EmptyState';
import CurrencyConverter from '../utils/CurrencyConverter';

const SharedExpenses = ({ isDark }) => {
    const toast = useToast();
    const [friends, setFriends] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [showAddFriend, setShowAddFriend] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);

    const [activeTab, setActiveTab] = useState('expenses'); // expenses, friends
    const [currency, setCurrency] = useState('INR');

    // Form States
    const [friendName, setFriendName] = useState('');
    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: '',
        paidBy: 'me', // 'me' or friendId
        splitWith: [], // array of friendIds
        date: new Date().toISOString().split('T')[0]
    });

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const settings = await DataAdapter.getUserSettings();
        setCurrency(settings.defaultCurrency || 'INR');
        const f = await DataAdapter.getFriends();
        const e = await DataAdapter.getSharedExpenses();
        setFriends(f);
        setExpenses(e);
    };

    const handleAddFriend = async (e) => {
        e.preventDefault();
        if (!friendName.trim()) return;

        try {
            await DataAdapter.addFriend({ name: friendName, balance: 0, createdAt: new Date().toISOString() });
            setFriendName('');
            setShowAddFriend(false);
            loadData();
            toast.success('Friend added');
        } catch (error) {
            toast.error('Failed to add friend');
        }
    };

    // Delete Friend - Soft delete: preserve friend name in expenses
    const handleDeleteFriend = async (friend) => {
        if (!confirm(`Remove ${friend.name}? Past expenses will keep their details.`)) return;

        try {
            // Update all expenses to store friend name before deletion
            const allExpenses = await DataAdapter.getSharedExpenses();
            for (const expense of allExpenses) {
                let updated = false;
                let newExpense = { ...expense };

                // If this friend paid, store their name
                if (expense.paidBy === friend.id) {
                    newExpense.paidByName = friend.name;
                    newExpense.paidBy = `deleted_${friend.id}`;
                    updated = true;
                }

                // If this friend was in splitWith, store their name
                if (expense.splitWith?.includes(friend.id)) {
                    newExpense.splitWithNames = newExpense.splitWithNames || {};
                    newExpense.splitWithNames[friend.id] = friend.name;
                    updated = true;
                }

                if (updated) {
                    await DataAdapter.updateSharedExpense(newExpense);
                }
            }

            await DataAdapter.deleteFriend(friend.id);
            loadData();
            toast.success(`${friend.name} removed`);
        } catch (error) {
            console.error(error);
            toast.error('Failed to remove friend');
        }
    };

    const [editingId, setEditingId] = useState(null);

    const handleEditExpense = (expense) => {
        setEditingId(expense.id);
        setExpenseForm({
            description: expense.description,

            amount: CurrencyConverter.convert(expense.totalAmount, 'INR', currency), // Convert to display for editing
            paidBy: expense.paidBy,

            splitWith: expense.splitWith,
            date: expense.date
        });
        setShowAddExpense(true);
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        try {
            const expense = expenses.find(e => e.id === expenseId);
            if (expense) {
                const amount = parseFloat(expense.totalAmount);
                const totalPeople = expense.splitWith.length + 1;
                const myShare = amount / totalPeople;

                // Revert Balances - same logic as editing revert
                const currentFriends = await DataAdapter.getFriends();
                for (const friend of currentFriends) {
                    let revertChange = 0;
                    const wasInSplit = expense.splitWith.includes(friend.id);

                    if (expense.paidBy === 'me') {
                        // I had paid, friend owed me → revert by subtracting
                        if (wasInSplit) {
                            revertChange = -myShare;
                        }
                    } else if (expense.paidBy === friend.id) {
                        // Friend had paid, I owed them → revert by adding
                        revertChange = myShare;
                    }

                    if (revertChange !== 0) {
                        await DataAdapter.updateFriend({
                            ...friend,
                            balance: (friend.balance || 0) + revertChange
                        });
                    }
                }
            }

            await DataAdapter.deleteSharedExpense(expenseId);
            loadData();
            toast.success('Expense deleted');
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete expense');
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.description || !expenseForm.amount || expenseForm.splitWith.length === 0) {
            toast.error('Please fill all fields');
            return;
        }

        // Convert Input (Display) to Base (INR)
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const amountInINR = parseFloat(expenseForm.amount) / rate;

        const amount = amountInINR;
        const splitCount = expenseForm.splitWith.length + 1; // +1 for me
        const splitAmount = amount / splitCount;

        try {
            // If Editing, Revert Old Balances first
            if (editingId) {
                const oldExpense = expenses.find(e => e.id === editingId);
                if (oldExpense) {
                    const oldAmount = parseFloat(oldExpense.totalAmount);
                    const oldTotalPeople = oldExpense.splitWith.length + 1;
                    const oldMyShare = oldAmount / oldTotalPeople;

                    for (const friend of friends) {
                        let revertChange = 0;
                        const wasInSplit = oldExpense.splitWith.includes(friend.id);

                        if (oldExpense.paidBy === 'me') {
                            // I had paid, friend owed me → revert by subtracting
                            if (wasInSplit) {
                                revertChange = -oldMyShare;
                            }
                        } else if (oldExpense.paidBy === friend.id) {
                            // Friend had paid, I owed them → revert by adding
                            revertChange = oldMyShare;
                        }

                        if (revertChange !== 0) {
                            await DataAdapter.updateFriend({
                                ...friend,
                                balance: (friend.balance || 0) + revertChange
                            });
                        }
                    }
                }
            }

            // Save Expense (Update or Add)
            if (editingId) {
                await DataAdapter.updateSharedExpense({
                    id: editingId,
                    ...expenseForm,
                    totalAmount: amount,
                    splitAmount: splitAmount
                });
            } else {
                await DataAdapter.addSharedExpense({
                    ...expenseForm,
                    totalAmount: amount,
                    splitAmount: splitAmount
                });
            }

            // Update Balances - CORRECTED LOGIC
            // Balance convention: 
            //   positive = friend owes ME
            //   negative = I owe friend
            // We only track debts between ME and each friend (not friend-to-friend)

            const currentFriends = await DataAdapter.getFriends();

            // Calculate MY share (I'm always part of the split implicitly)
            // Total people splitting = friends in splitWith + ME
            const totalPeople = expenseForm.splitWith.length + 1;
            const myShare = amount / totalPeople;

            for (const friend of currentFriends) {
                let balanceChange = 0;
                const friendInSplit = expenseForm.splitWith.includes(friend.id);

                if (expenseForm.paidBy === 'me') {
                    // I paid the full amount
                    // Each friend in splitWith owes me their share
                    if (friendInSplit) {
                        balanceChange = myShare; // Friend owes me (positive)
                    }
                } else if (expenseForm.paidBy === friend.id) {
                    // This friend paid the full amount
                    // I owe them MY share (negative balance)
                    balanceChange = -myShare;
                }
                // Note: We don't track friend-to-friend debts

                if (balanceChange !== 0) {
                    await DataAdapter.updateFriend({
                        ...friend,
                        balance: (friend.balance || 0) + balanceChange
                    });
                }
            }

            setExpenseForm({
                description: '',
                amount: '',
                paidBy: 'me',
                splitWith: [],
                date: new Date().toISOString().split('T')[0]
            });
            setEditingId(null);
            setShowAddExpense(false);
            loadData();
            toast.success(editingId ? 'Expense updated' : 'Expense added');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save expense');
        }
    };

    const handleSettleUp = async (friend) => {
        if (friend.balance === 0) return;

        const amount = Math.abs(friend.balance);
        const displayAmount = CurrencyConverter.convert(amount, 'INR', currency);
        const isReceiving = friend.balance > 0;

        if (!confirm(`Settle up ${isReceiving ? 'receiving' : 'paying'} ${CurrencyConverter.format(displayAmount, currency)} with ${friend.name}?`)) return;

        try {
            // Record a settlement expense
            await DataAdapter.addSharedExpense({
                description: 'Settlement',
                totalAmount: amount,
                paidBy: isReceiving ? friend.id : 'me', // If I receive, friend paid.
                splitWith: isReceiving ? [] : [friend.id], // Special case
                isSettlement: true,
                date: new Date().toISOString().split('T')[0]
            });

            // Reset Balance
            await DataAdapter.updateFriend({
                ...friend,
                balance: 0
            });

            loadData();
            toast.success('Settled up!');
        } catch (error) {
            toast.error('Failed to settle');
        }
    };

    const toggleSplitFriend = (id) => {
        const current = expenseForm.splitWith;
        if (current.includes(id)) {
            setExpenseForm({ ...expenseForm, splitWith: current.filter(i => i !== id) });
        } else {
            setExpenseForm({ ...expenseForm, splitWith: [...current, id] });
        }
    };

    return (
        <div className="h-full flex flex-col p-4" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI' }}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold" style={{ color: textColor }}>Shared Expenses</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddFriend(true)}
                        className="px-4 py-2 text-sm border font-semibold rounded"
                        style={{ backgroundColor: panelBg, color: textColor, borderColor }}
                    >
                        + Add Friend
                    </button>
                    <button
                        onClick={() => setShowAddExpense(true)}
                        className="px-4 py-2 text-sm border font-semibold rounded text-white"
                        style={{ backgroundColor: '#0078d4', borderColor: '#005a9e' }}
                    >
                        + Add Expense
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-4" style={{ borderColor }}>
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'expenses' ? 'border-blue-500 text-blue-500' : 'border-transparent opacity-60'}`}
                    style={{ color: activeTab === 'expenses' ? '#0078d4' : textColor }}
                    onClick={() => setActiveTab('expenses')}
                >
                    Expenses
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'friends' ? 'border-blue-500 text-blue-500' : 'border-transparent opacity-60'}`}
                    style={{ color: activeTab === 'friends' ? '#0078d4' : textColor }}
                    onClick={() => setActiveTab('friends')}
                >
                    Friends & Balances
                </button>
            </div>

            <div className="flex-1 overflow-auto">
                {activeTab === 'friends' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {friends.length === 0 ? (
                            <div className="col-span-full">
                                <EmptyState title="No Friends Added" message="Add friends to start sharing expenses." isDark={isDark} />
                            </div>
                        ) : (
                            friends.map(friend => {
                                // Check if friend has any expenses
                                const hasExpenses = expenses.some(e =>
                                    e.paidBy === friend.id || e.splitWith?.includes(friend.id)
                                );
                                const isNewFriend = !hasExpenses && friend.balance === 0;

                                return (
                                    <div key={friend.id} className="border p-4 rounded shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-semibold text-lg" style={{ color: textColor }}>{friend.name}</div>
                                            <div className="flex items-center gap-2">
                                                <div className={`text-sm font-bold ${friend.balance > 0 ? 'text-green-500' :
                                                    friend.balance < 0 ? 'text-red-500' :
                                                        'text-gray-400'
                                                    }`}>
                                                    {isNewFriend
                                                        ? '🆕 New'
                                                        : friend.balance === 0
                                                            ? '✅ All settled'
                                                            : friend.balance > 0
                                                                ? `Owes you ${CurrencyConverter.format(CurrencyConverter.convert(friend.balance, 'INR', currency), currency)}`
                                                                : `You owe ${CurrencyConverter.format(CurrencyConverter.convert(Math.abs(friend.balance), 'INR', currency), currency)}`
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            {friend.balance !== 0 && (
                                                <button
                                                    onClick={() => handleSettleUp(friend)}
                                                    className="flex-1 py-1 text-xs border rounded hover:bg-opacity-80"
                                                    style={{ backgroundColor: '#22c55e', color: '#fff', borderColor: '#16a34a' }}
                                                >
                                                    💰 Settle Up
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteFriend(friend)}
                                                className="py-1 px-2 text-xs border rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                                                style={{ color: '#ef4444', borderColor }}
                                                title="Remove friend"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="space-y-2">
                        {expenses.length === 0 ? (
                            <EmptyState title="No Shared Expenses" message="Add an expense to track bills." isDark={isDark} />
                        ) : (
                            expenses.slice().reverse().map(expense => (
                                <div key={expense.id} className="border p-3 rounded flex justify-between items-center" style={{ backgroundColor: panelBg, borderColor }}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                                            {expense.isSettlement ? '🤝' : '🧾'}
                                        </div>
                                        <div>
                                            <div className="font-medium" style={{ color: textColor }}>{expense.description}</div>
                                            <div className="text-xs opacity-60" style={{ color: textColor }}>
                                                {expense.isSettlement
                                                    ? `Settled between ${expense.paidBy === 'me' ? 'You' : friends.find(f => f.id === expense.paidBy)?.name}`
                                                    : `Paid by ${expense.paidBy === 'me' ? 'You' : friends.find(f => f.id === expense.paidBy)?.name} • Split with ${expense.splitWith.length} people`
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="font-bold" style={{ color: textColor }}>
                                            {CurrencyConverter.format(CurrencyConverter.convert(expense.totalAmount, 'INR', currency), currency)}
                                        </div>
                                        {!expense.isSettlement && (
                                            <>
                                                <button onClick={() => handleEditExpense(expense)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                                    <Edit2 size={14} style={{ color: textColor }} />
                                                </button>
                                                <button onClick={() => handleDeleteExpense(expense.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Add Friend Modal */}
            {showAddFriend && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="p-6 rounded-lg w-80 shadow-xl" style={{ backgroundColor: panelBg }}>
                        <h3 className="font-bold mb-4" style={{ color: textColor }}>Add Friend</h3>
                        <input
                            type="text"
                            placeholder="Friend's Name"
                            value={friendName}
                            onChange={e => setFriendName(e.target.value)}
                            className="w-full border p-2 mb-4 rounded"
                            style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowAddFriend(false)} className="px-3 py-1 text-sm opacity-70" style={{ color: textColor }}>Cancel</button>
                            <button onClick={handleAddFriend} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Expense Modal */}
            {showAddExpense && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="p-6 rounded-lg w-96 shadow-xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: panelBg }}>
                        <h3 className="font-bold mb-4" style={{ color: textColor }}>{editingId ? 'Edit Expense' : 'Add Shared Expense'}</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs block mb-1" style={{ color: textColor }}>Description</label>
                                <input
                                    type="text"
                                    value={expenseForm.description}
                                    onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    className="w-full border p-2 rounded text-sm"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                />
                            </div>
                            <div>
                                <label className="text-xs block mb-1" style={{ color: textColor }}>Amount</label>
                                <input
                                    type="number"
                                    value={expenseForm.amount}
                                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (['e', 'E', '+', '-'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    className="w-full border p-2 rounded text-sm"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                />
                            </div>
                            <div>
                                <label className="text-xs block mb-1" style={{ color: textColor }}>
                                    💳 Who Paid? <span className="opacity-60">(Person who spent the money)</span>
                                </label>
                                <select
                                    value={expenseForm.paidBy}
                                    onChange={e => setExpenseForm({ ...expenseForm, paidBy: e.target.value })}
                                    className="w-full border p-2 rounded text-sm"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                >
                                    <option value="me">🙋 Me (I paid)</option>
                                    {friends.map(f => <option key={f.id} value={f.id}>👤 {f.name} (They paid)</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs block mb-1" style={{ color: textColor }}>
                                    👥 Split With <span className="opacity-60">(Who shares this expense?)</span>
                                </label>
                                <div className="text-xs mb-1 p-2 rounded" style={{ backgroundColor: isDark ? '#3a3a3a' : '#f0f8ff', color: textColor }}>
                                    💡 Tip: If <strong>{expenseForm.paidBy === 'me' ? 'you' : friends.find(f => f.id === expenseForm.paidBy)?.name || 'someone'}</strong> paid, select everyone who should pay their share (including the payer if they're splitting too)
                                </div>
                                <div className="border p-2 rounded max-h-32 overflow-y-auto" style={{ borderColor }}>
                                    {friends.length === 0 ? (
                                        <div className="text-xs opacity-60 py-2" style={{ color: textColor }}>Add friends first to split expenses</div>
                                    ) : (
                                        friends.map(f => (
                                            <label key={f.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-1 rounded" style={{ color: textColor }}>
                                                <input
                                                    type="checkbox"
                                                    checked={expenseForm.splitWith.includes(f.id)}
                                                    onChange={() => toggleSplitFriend(f.id)}
                                                />
                                                {f.name}
                                                {expenseForm.paidBy !== 'me' && expenseForm.paidBy === f.id && (
                                                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1 rounded">Payer</span>
                                                )}
                                            </label>
                                        ))
                                    )}
                                </div>
                                {expenseForm.splitWith.length > 0 && expenseForm.amount && (
                                    <div className="mt-2 text-xs p-2 rounded" style={{ backgroundColor: isDark ? '#2a3a2a' : '#d4edda', color: isDark ? '#8ccd8c' : '#155724' }}>
                                        📊 Split: {CurrencyConverter.format(parseFloat(expenseForm.amount) / (expenseForm.splitWith.length + 1), currency)} per person ({expenseForm.splitWith.length + 1} people)
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowAddExpense(false)} className="px-3 py-1 text-sm opacity-70" style={{ color: textColor }}>Cancel</button>
                            <button onClick={handleAddExpense} className="px-3 py-1 text-sm bg-blue-600 text-white rounded">{editingId ? 'Update' : 'Save Expense'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SharedExpenses;
