import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { useFeature } from '../context/FeatureContext';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';
import Modal from '../components/Modal';
import SmartInput from '../components/SmartInput';

const Accounts = ({ isDark }) => {
    const toast = useToast();
    const { checkLimit } = useFeature();
    const [accounts, setAccounts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Bank',
        initialBalance: ''
    });
    const [currency, setCurrency] = useState('INR');

    // Reconciliation State
    const [showReconcile, setShowReconcile] = useState(false);
    const [reconcileData, setReconcileData] = useState({
        id: null,
        name: '',
        currentBalance: 0,
        newBalance: '',
        method: 'transaction' // 'transaction' or 'direct'
    });

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const panelBg = isDark ? '#252526' : '#f0f0f0';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        if (window.api) {
            const settings = await DataAdapter.getUserSettings();
            setCurrency(settings.defaultCurrency || 'INR');
            const data = await window.api.getAccounts();
            setAccounts(data);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (window.api) {
                if (editingId) {
                    await window.api.updateAccount({ ...formData, id: editingId });
                    toast.success('Account updated');
                } else {
                    await window.api.addAccount(formData);
                    toast.success('Account created');
                }
                await loadAccounts();
                setShowForm(false);
                resetForm();
            }
        } catch (error) {
            toast.error('Failed to save account');
        }
    };

    const handleReconcile = async () => {
        if (!reconcileData.newBalance) return;

        const newBal = parseFloat(reconcileData.newBalance);
        const diff = newBal - reconcileData.currentBalance;

        if (diff === 0) {
            toast.info('Balances match. No adjustment needed.');
            setShowReconcile(false);
            return;
        }

        try {
            if (reconcileData.method === 'transaction') {
                // Create adjustment transaction
                const transaction = {
                    accountId: reconcileData.id,
                    amount: Math.abs(diff), // Amount is always positive
                    type: diff > 0 ? 'income' : 'expense',
                    category: 'Adjustment',
                    description: `Balance Reconciliation for ${reconcileData.name}`,
                    date: new Date().toISOString().split('T')[0],
                    currency: currency // Assuming base currency for now, or we need to handle conversion if account has specific currency
                };

                // We need to use DataAdapter or window.api to add transaction
                // Since Accounts.jsx uses window.api for accounts, let's check if we have addTransaction there
                // Usually transactions are handled via DataAdapter in other files.
                // Let's use DataAdapter if available or assume window.api has it.
                // Checking imports... DataAdapter is imported.

                await DataAdapter.addTransaction(transaction);
                toast.success('Adjustment transaction created');
            } else {
                // Direct Update
                // We need to update the account's initial balance or current balance logic
                // Since current balance is calculated from initial + transactions, 
                // updating "current balance" directly implies changing initial balance 
                // such that (New Initial) + Transactions = New Balance.
                // New Initial = New Balance - Transactions
                // Transactions = Current Balance - Old Initial
                // So: New Initial = New Balance - (Current Balance - Old Initial)
                //                 = New Balance - Current Balance + Old Initial
                //                 = Old Initial + Diff

                const account = accounts.find(a => a.id === reconcileData.id);
                if (account) {
                    const oldInitial = parseFloat(account.initialBalance || 0);
                    const newInitial = oldInitial + diff;

                    await window.api.updateAccount({
                        ...account,
                        initialBalance: newInitial
                    });
                    toast.success('Account balance updated directly');
                }
            }

            await loadAccounts();
            setShowReconcile(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to reconcile account');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? Transactions linked to this account might be affected.')) return;
        try {
            if (window.api) {
                await window.api.deleteAccount(id);
                await loadAccounts();
                toast.success('Account deleted');
            }
        } catch (error) {
            toast.error('Failed to delete account');
        }
    };

    const resetForm = () => {
        setFormData({ name: '', type: 'Bank', initialBalance: '' });
        setEditingId(null);
    };

    const handleEdit = (acc) => {
        setFormData({
            name: acc.name,
            type: acc.type,
            initialBalance: acc.initialBalance
        });
        setEditingId(acc.id);
        setShowForm(true);
    };

    const formatMoney = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    // Helper to convert INR to Display
    const toDisplay = (amountINR) => {
        return CurrencyConverter.convert(amountINR, 'INR', currency);
    };

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor }}>
                <div>
                    <h2 className="text-xl font-bold">Accounts</h2>
                    <p className="text-xs opacity-70">Manage your bank accounts, wallets, and cards</p>
                </div>
                <button
                    onClick={() => {
                        if (checkLimit('maxAccounts', accounts.length)) {
                            resetForm();
                            setShowForm(true);
                        } else {
                            toast.error('Account limit reached. Upgrade to Pro for unlimited accounts.');
                        }
                    }}
                    className="px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all"
                    style={{ backgroundColor: isDark ? '#007acc' : '#0078d4' }}
                >
                    + New Account
                </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                {accounts.length === 0 ? (
                    <EmptyState
                        title="No Accounts"
                        message="Create an account to start tracking your money."
                        isDark={isDark}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {accounts.map(acc => (
                            <div key={acc.id} className="border p-4 rounded shadow-sm flex flex-col justify-between" style={{ backgroundColor: panelBg, borderColor }}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg">{acc.name}</h3>
                                        <span className="text-xs px-2 py-0.5 rounded border opacity-70" style={{ borderColor }}>{acc.type}</span>
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-xs opacity-70">Current Balance</p>
                                        <p className={`text-2xl font-bold ${acc.currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {formatMoney(toDisplay(acc.currentBalance))}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 mt-4 pt-2 border-t" style={{ borderColor: isDark ? '#444' : '#e0e0e0' }}>
                                    <button onClick={() => {
                                        setReconcileData({
                                            id: acc.id,
                                            name: acc.name,
                                            currentBalance: acc.currentBalance,
                                            newBalance: '',
                                            method: 'transaction'
                                        });
                                        setShowReconcile(true);
                                    }} className="text-xs text-green-600 hover:underline font-medium">Reconcile</button>
                                    <button onClick={() => handleEdit(acc)} className="text-xs text-blue-500 hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(acc.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-80 border shadow-2xl p-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="font-bold mb-4">{editingId ? 'Edit Account' : 'New Account'}</h3>
                        <form onSubmit={handleSave} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold mb-1">Account Name</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                    placeholder="e.g. HDFC Bank"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                >
                                    <option>Bank</option>
                                    <option>Cash</option>
                                    <option>Credit Card</option>
                                    <option>Wallet</option>
                                    <option>Investment</option>
                                </select>
                            </div>
                            {!editingId && (
                                <div>
                                    <label className="block text-xs font-bold mb-1">Initial Balance</label>
                                    <input
                                        type="number"
                                        value={formData.initialBalance}
                                        onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
                                        className="w-full px-2 py-1 text-sm border"
                                        style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                        placeholder="0.00"
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); resetForm(); }}
                                    className="px-3 py-1 text-xs border hover:bg-gray-100 dark:hover:bg-gray-700"
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
            {/* Reconcile Modal */}
            <Modal
                isOpen={showReconcile}
                onClose={() => setShowReconcile(false)}
                title={`Reconcile: ${reconcileData.name}`}
                isDark={isDark}
            >
                <div className="space-y-4">
                    <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-sm">
                        <div className="flex justify-between mb-1">
                            <span className="opacity-70">Current Balance:</span>
                            <span className="font-bold">{formatMoney(toDisplay(reconcileData.currentBalance))}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Actual Balance ({currency})</label>
                        <SmartInput
                            autoFocus
                            value={reconcileData.newBalance}
                            onChange={(e) => setReconcileData({ ...reconcileData, newBalance: e.target.value })}
                            className="w-full px-3 py-2 border rounded text-lg font-bold"
                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            placeholder="0.00"
                        />
                    </div>

                    {reconcileData.newBalance && (
                        <div className="text-sm text-center">
                            <span className="opacity-70">Difference: </span>
                            <span className={`font-bold ${parseFloat(reconcileData.newBalance) - reconcileData.currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {formatMoney(toDisplay(parseFloat(reconcileData.newBalance) - reconcileData.currentBalance))}
                            </span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-2">Adjustment Method</label>
                        <div className="space-y-2">
                            <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                                <input
                                    type="radio"
                                    name="method"
                                    checked={reconcileData.method === 'transaction'}
                                    onChange={() => setReconcileData({ ...reconcileData, method: 'transaction' })}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-semibold text-sm">Add Adjustment Transaction</div>
                                    <div className="text-xs opacity-70">Creates a transaction for the difference. Keeps history clean.</div>
                                </div>
                            </label>
                            <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-black/5 dark:hover:bg-white/5">
                                <input
                                    type="radio"
                                    name="method"
                                    checked={reconcileData.method === 'direct'}
                                    onChange={() => setReconcileData({ ...reconcileData, method: 'direct' })}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-semibold text-sm">Update Balance Directly</div>
                                    <div className="text-xs opacity-70">Modifies the initial balance. No transaction record created.</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setShowReconcile(false)}
                            className="px-4 py-2 text-sm border rounded hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: textColor, borderColor }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReconcile}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                        >
                            Reconcile
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Accounts;
