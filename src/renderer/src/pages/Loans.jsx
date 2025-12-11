import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUpRight, ArrowDownLeft, CheckCircle, Circle, DollarSign, Calendar, Edit2, Save, X } from 'lucide-react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import CurrencyConverter from '../utils/CurrencyConverter';

const Loans = ({ isDark }) => {
    const [loans, setLoans] = useState([]);
    const [editingLoan, setEditingLoan] = useState(null);
    const [newLoan, setNewLoan] = useState({
        person: '',
        amount: '',
        type: 'payable', // 'payable' (I owe) or 'receivable' (Owed to me)
        dueDate: '',
        notes: ''
    });
    const toast = useToast();
    const [currency, setCurrency] = useState('INR');

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const cardBg = isDark ? '#2d2d30' : '#f9fafb';
    const borderColor = isDark ? '#333' : '#e5e7eb';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const settings = await DataAdapter.getUserSettings();
        setCurrency(settings.defaultCurrency || 'INR');
        const data = await DataAdapter.getLoans();
        setLoans(data);
    };

    const saveData = async (updatedLoans) => {
        await DataAdapter.saveLoans(updatedLoans);
        setLoans(updatedLoans);
    };

    const addLoan = async () => {
        if (!newLoan.person || !newLoan.amount) return toast.error("Person and Amount are required");

        // Convert Amount (Display) to Base (INR)
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const amountInINR = parseFloat(newLoan.amount) / rate;

        const loan = {
            id: Date.now(),
            ...newLoan,
            amount: amountInINR,
            status: 'pending', // 'pending' or 'paid'
            createdAt: new Date().toISOString()
        };

        const updatedLoans = [...loans, loan];
        await saveData(updatedLoans);
        setNewLoan({ person: '', amount: '', type: 'payable', dueDate: '', notes: '' });
        toast.success("Record added");
    };

    const toggleStatus = async (id) => {
        const updatedLoans = loans.map(l =>
            l.id === id ? { ...l, status: l.status === 'pending' ? 'paid' : 'pending' } : l
        );
        await saveData(updatedLoans);
    };

    const updateLoan = async (updatedLoan) => {
        // Convert Amount (Display) to Base (INR)
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const amountInINR = parseFloat(updatedLoan.amount) / rate;

        const updatedLoans = loans.map(l => l.id === updatedLoan.id ? { ...updatedLoan, amount: amountInINR } : l);
        await saveData(updatedLoans);
        setEditingLoan(null);
        toast.success("Loan updated");
    };

    const deleteLoan = async (id) => {
        if (!confirm("Delete this record?")) return;
        const updatedLoans = loans.filter(l => l.id !== id);
        await saveData(updatedLoans);
        toast.success("Record deleted");
    };

    const totalPayable = loans
        .filter(l => l.type === 'payable' && l.status === 'pending')
        .reduce((sum, l) => sum + l.amount, 0);

    const totalReceivable = loans
        .filter(l => l.type === 'receivable' && l.status === 'pending')
        .reduce((sum, l) => sum + l.amount, 0);

    const formatMoney = (amount) => {
        return CurrencyConverter.format(amount, currency);
    };

    // Helper to convert INR to Display
    const toDisplay = (amountINR) => {
        return CurrencyConverter.convert(amountINR, 'INR', currency);
    };

    return (
        <div className="p-6 h-full flex flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <DollarSign className="text-green-500" /> Debt & Loan Management
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl border shadow-sm flex items-center justify-between" style={{ backgroundColor: cardBg, borderColor }}>
                    <div>
                        <div className="text-sm opacity-70">Total Payables (I Owe)</div>
                        <div className="text-2xl font-bold text-red-500">{formatMoney(toDisplay(totalPayable))}</div>
                    </div>
                    <ArrowUpRight className="text-red-500 opacity-50" size={32} />
                </div>
                <div className="p-4 rounded-xl border shadow-sm flex items-center justify-between" style={{ backgroundColor: cardBg, borderColor }}>
                    <div>
                        <div className="text-sm opacity-70">Total Receivables (Owed to Me)</div>
                        <div className="text-2xl font-bold text-green-500">{formatMoney(toDisplay(totalReceivable))}</div>
                    </div>
                    <ArrowDownLeft className="text-green-500 opacity-50" size={32} />
                </div>
            </div>

            {/* Add New Form */}
            <div className="p-4 rounded-xl border shadow-sm mb-6" style={{ backgroundColor: cardBg, borderColor }}>
                <h3 className="font-semibold mb-3">Add New Record</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <select
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light', backgroundColor: isDark ? '#2d2d30' : '#ffffff' }}
                        value={newLoan.type}
                        onChange={e => setNewLoan({ ...newLoan, type: e.target.value })}
                    >
                        <option value="payable" style={{ backgroundColor: isDark ? '#2d2d30' : '#ffffff', color: textColor }}>I Owe (Payable)</option>
                        <option value="receivable" style={{ backgroundColor: isDark ? '#2d2d30' : '#ffffff', color: textColor }}>Owed to Me (Receivable)</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Person / Entity Name"
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor }}
                        value={newLoan.person}
                        onChange={e => setNewLoan({ ...newLoan, person: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder={`Amount (${currency})`}
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor }}
                        value={newLoan.amount}
                        onChange={e => setNewLoan({ ...newLoan, amount: e.target.value })}
                    />
                    <input
                        type="date"
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                        value={newLoan.dueDate}
                        onChange={e => setNewLoan({ ...newLoan, dueDate: e.target.value })}
                    />
                    <button
                        onClick={addLoan}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 justify-center"
                    >
                        <Plus size={18} /> Add
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Notes (optional)"
                    className="w-full p-2 mt-2 rounded border bg-transparent"
                    style={{ borderColor, color: textColor }}
                    value={newLoan.notes}
                    onChange={e => setNewLoan({ ...newLoan, notes: e.target.value })}
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
                <div className="space-y-2">
                    {loans.length === 0 ? (
                        <div className="text-center opacity-50 mt-10">No records found.</div>
                    ) : (
                        loans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(loan => (
                            <div
                                key={loan.id}
                                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${loan.status === 'paid' ? 'opacity-50' : ''}`}
                                style={{ backgroundColor: cardBg, borderColor }}
                            >
                                {editingLoan?.id === loan.id ? (
                                    /* Edit Mode */
                                    <>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <input
                                                type="text"
                                                className="p-2 rounded border bg-transparent"
                                                style={{ borderColor, color: textColor }}
                                                value={editingLoan.person}
                                                onChange={e => setEditingLoan({ ...editingLoan, person: e.target.value })}
                                                placeholder="Person/Entity"
                                            />
                                            <input
                                                type="number"
                                                className="p-2 rounded border bg-transparent"
                                                style={{ borderColor, color: textColor }}
                                                value={editingLoan.amount} // This should be in Display Currency
                                                // But wait, when we click edit, we need to set it to Display Currency.
                                                // Let's fix handleEditClick logic below (inline here).
                                                onChange={e => setEditingLoan({ ...editingLoan, amount: e.target.value })}
                                                placeholder="Amount"
                                            />
                                            <input
                                                type="date"
                                                className="p-2 rounded border bg-transparent"
                                                style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                                                value={editingLoan.dueDate}
                                                onChange={e => setEditingLoan({ ...editingLoan, dueDate: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex gap-2 ml-2">
                                            <button onClick={() => updateLoan(editingLoan)} className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900 p-2 rounded">
                                                <Save size={16} />
                                            </button>
                                            <button onClick={() => setEditingLoan(null)} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* View Mode */
                                    <>
                                        <div className="flex items-center gap-4 flex-1">
                                            <button onClick={() => toggleStatus(loan.id)}>
                                                {loan.status === 'paid' ? (
                                                    <CheckCircle className="text-green-500" />
                                                ) : (
                                                    <Circle className="text-gray-400" />
                                                )}
                                            </button>
                                            <div className={`p-2 rounded-full ${loan.type === 'payable' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'}`}>
                                                {loan.type === 'payable' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">{loan.person}</div>
                                                <div className="text-xs opacity-70 flex items-center gap-2">
                                                    {loan.dueDate && <span className="flex items-center gap-1"><Calendar size={12} /> Due: {new Date(loan.dueDate).toLocaleDateString()}</span>}
                                                    {loan.notes && <span>• {loan.notes}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className={`text-xl font-bold ${loan.type === 'payable' ? 'text-red-500' : 'text-green-500'}`}>
                                                {loan.type === 'payable' ? '-' : '+'}{formatMoney(toDisplay(loan.amount))}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    // Convert Base (INR) to Display Currency for editing
                                                    const rate = CurrencyConverter.convert(1, 'INR', currency);
                                                    setEditingLoan({
                                                        ...loan,
                                                        amount: (loan.amount * rate).toFixed(2)
                                                    });
                                                }}
                                                className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-2 rounded"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => deleteLoan(loan.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-2 rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Loans;
