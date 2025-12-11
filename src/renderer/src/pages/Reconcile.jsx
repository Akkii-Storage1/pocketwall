import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';

const Reconcile = ({ isDark }) => {
    const toast = useToast();
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [step, setStep] = useState(1); // 1: Setup, 2: Reconcile
    const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);
    const [endingBalance, setEndingBalance] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [clearedIds, setClearedIds] = useState(new Set());
    const [currency, setCurrency] = useState('INR');

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const panelBg = isDark ? '#252526' : '#f0f0f0';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        const settings = await DataAdapter.getUserSettings();
        setCurrency(settings.defaultCurrency || 'INR');
        const data = await DataAdapter.getAccounts();
        setAccounts(data);
        if (data.length > 0) setSelectedAccount(data[0].id);
    };

    const startReconciliation = async () => {
        if (!selectedAccount || !endingBalance) {
            toast.error('Please select an account and enter ending balance');
            return;
        }

        const allTransactions = await DataAdapter.getTransactions();
        // Filter for selected account, not reconciled, and on or before statement date
        const relevant = allTransactions.filter(t =>
            t.accountId === selectedAccount &&
            !t.reconciled &&
            t.date <= statementDate
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        setTransactions(relevant);
        setClearedIds(new Set());
        setStep(2);
    };

    const toggleCleared = (id) => {
        const newSet = new Set(clearedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setClearedIds(newSet);
    };

    // Refined Logic:
    // We need to fetch ALL transactions for the account to calculate the starting "Reconciled Balance".
    const [reconciledBalance, setReconciledBalance] = useState(0);

    useEffect(() => {
        if (step === 2) {
            DataAdapter.getTransactions().then(all => {
                const accountTxns = all.filter(t => t.accountId === selectedAccount);
                const alreadyReconciled = accountTxns.filter(t => t.reconciled);

                const recBalance = alreadyReconciled.reduce((sum, t) => {
                    const amt = parseFloat(t.amount);
                    return t.type === 'income' ? sum + amt : sum - amt;
                }, parseFloat(accounts.find(a => a.id === selectedAccount)?.initialBalance || 0));

                setReconciledBalance(recBalance);
            });
        }
    }, [step, selectedAccount]);

    const calculateClearedBalance = () => {
        const clearedSum = transactions
            .filter(t => clearedIds.has(t.id))
            .reduce((sum, t) => {
                const amt = parseFloat(t.amount);
                return t.type === 'income' ? sum + amt : sum - amt;
            }, 0);
        return reconciledBalance + clearedSum;
    };

    const finishReconciliation = async () => {
        const diff = calculateClearedBalance() - parseFloat(endingBalance);
        if (Math.abs(diff) > 0.01) {
            if (!confirm(`There is a difference of ${diff.toFixed(2)}. Finish anyway?`)) return;
        }

        for (const id of clearedIds) {
            await DataAdapter.reconcileTransaction(id, true);
        }
        toast.success('Reconciliation complete!');
        setStep(1);
        setEndingBalance('');
        loadAccounts(); // Refresh balances
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
            <div className="p-4 border-b" style={{ borderColor }}>
                <h2 className="text-xl font-bold">Reconciliation</h2>
                <p className="text-xs opacity-70">Match transactions with your bank statement</p>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                {step === 1 ? (
                    <div className="max-w-md mx-auto border p-6 rounded shadow-sm" style={{ backgroundColor: panelBg, borderColor }}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Select Account</label>
                                <select
                                    value={selectedAccount}
                                    onChange={e => setSelectedAccount(e.target.value)}
                                    className="w-full px-2 py-1 border rounded"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                >
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Statement Date</label>
                                <input
                                    type="date"
                                    value={statementDate}
                                    onChange={e => setStatementDate(e.target.value)}
                                    className="w-full px-2 py-1 border rounded"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Statement Ending Balance ({currency})</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={endingBalance}
                                    onChange={e => setEndingBalance(e.target.value)}
                                    className="w-full px-2 py-1 border rounded"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                    placeholder="0.00"
                                />
                            </div>
                            <button
                                onClick={startReconciliation}
                                className="w-full py-2 font-bold text-white rounded mt-4"
                                style={{ backgroundColor: '#0078d4' }}
                            >
                                Start Reconciling
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Header Stats */}
                        <div className="grid grid-cols-4 gap-4 mb-4 text-center">
                            <div className="p-2 border rounded" style={{ borderColor }}>
                                <div className="text-xs opacity-70">Statement Balance</div>
                                <div className="font-bold">{formatMoney(parseFloat(endingBalance))}</div>
                            </div>
                            <div className="p-2 border rounded" style={{ borderColor }}>
                                <div className="text-xs opacity-70">Cleared Balance</div>
                                <div className="font-bold">{formatMoney(toDisplay(calculateClearedBalance()))}</div>
                            </div>
                            <div className="p-2 border rounded" style={{ borderColor }}>
                                <div className="text-xs opacity-70">Difference</div>
                                <div className={`font-bold ${Math.abs(calculateClearedBalance() - parseFloat(endingBalance)) < 0.01 ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatMoney(toDisplay(calculateClearedBalance()) - parseFloat(endingBalance))}
                                </div>
                            </div>
                            <button
                                onClick={finishReconciliation}
                                className="px-4 py-2 font-bold text-white rounded shadow-sm"
                                style={{ backgroundColor: Math.abs(calculateClearedBalance() - parseFloat(endingBalance)) < 0.01 ? '#107c10' : '#d13438' }}
                            >
                                Finish
                            </button>
                        </div>

                        {/* Transaction List */}
                        <div className="flex-1 overflow-y-auto border rounded" style={{ borderColor }}>
                            <table className="w-full text-sm">
                                <thead className="sticky top-0" style={{ backgroundColor: panelBg }}>
                                    <tr>
                                        <th className="p-2 border-b w-10" style={{ borderColor }}>✓</th>
                                        <th className="p-2 border-b text-left" style={{ borderColor }}>Date</th>
                                        <th className="p-2 border-b text-left" style={{ borderColor }}>Payee</th>
                                        <th className="p-2 border-b text-right" style={{ borderColor }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr
                                            key={t.id}
                                            onClick={() => toggleCleared(t.id)}
                                            className="cursor-pointer hover:opacity-80"
                                            style={{
                                                backgroundColor: clearedIds.has(t.id) ? (isDark ? '#004466' : '#cce8ff') : 'transparent',
                                                borderBottom: `1px solid ${borderColor}`
                                            }}
                                        >
                                            <td className="p-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={clearedIds.has(t.id)}
                                                    readOnly
                                                />
                                            </td>
                                            <td className="p-2">{new Date(t.date).toLocaleDateString()}</td>
                                            <td className="p-2">{t.payee || t.description}</td>
                                            <td className={`p-2 text-right font-mono ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                {formatMoney(toDisplay(parseFloat(t.amount)))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {transactions.length === 0 && (
                                <div className="p-8 text-center opacity-50">No uncleared transactions found for this period.</div>
                            )}
                        </div>

                        <button
                            onClick={() => setStep(1)}
                            className="mt-4 text-xs underline opacity-70 hover:opacity-100"
                        >
                            Cancel and go back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reconcile;
