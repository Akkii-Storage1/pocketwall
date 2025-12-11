import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Heart, Gift, DollarSign, Calendar, CheckCircle, XCircle, Edit2, Save, X } from 'lucide-react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import CurrencyConverter from '../utils/CurrencyConverter';

const Charity = ({ isDark }) => {
    const [donations, setDonations] = useState([]);
    const [editingDonation, setEditingDonation] = useState(null);
    const [newDonation, setNewDonation] = useState({
        organization: '',
        cause: '',
        amount: '',
        date: '',
        taxDeductible: false,
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
        const data = await DataAdapter.getCharity();
        setDonations(data);
    };

    const saveData = async (updatedDonations) => {
        await DataAdapter.saveCharity(updatedDonations);
        setDonations(updatedDonations);
    };

    const addDonation = async () => {
        if (!newDonation.organization || !newDonation.amount) return toast.error("Organization and Amount are required");

        // Convert Amount (Display) to Base (INR)
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const amountInINR = parseFloat(newDonation.amount) / rate;

        const donation = {
            id: Date.now(),
            ...newDonation,
            amount: amountInINR,
            createdAt: new Date().toISOString()
        };

        const updatedDonations = [...donations, donation];
        await saveData(updatedDonations);
        setNewDonation({ organization: '', cause: '', amount: '', date: '', taxDeductible: false, notes: '' });
        toast.success("Donation added");
    };

    const updateDonation = async (updatedDonation) => {
        // Convert Amount (Display) to Base (INR)
        const rate = CurrencyConverter.convert(1, 'INR', currency);
        const amountInINR = parseFloat(updatedDonation.amount) / rate;

        const updatedDonations = donations.map(d => d.id === updatedDonation.id ? { ...updatedDonation, amount: amountInINR } : d);
        await saveData(updatedDonations);
        setEditingDonation(null);
        toast.success("Donation updated");
    };

    const deleteDonation = async (id) => {
        if (!confirm("Delete this record?")) return;
        const updatedDonations = donations.filter(d => d.id !== id);
        await saveData(updatedDonations);
        toast.success("Record deleted");
    };

    const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
    const totalTaxDeductible = donations.filter(d => d.taxDeductible).reduce((sum, d) => sum + d.amount, 0);

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
                <Heart className="text-pink-500" /> Charity & Impact
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl border shadow-sm flex items-center justify-between" style={{ backgroundColor: cardBg, borderColor }}>
                    <div>
                        <div className="text-sm opacity-70">Total Donated</div>
                        <div className="text-2xl font-bold text-pink-500">{formatMoney(toDisplay(totalDonated))}</div>
                    </div>
                    <Gift className="text-pink-500 opacity-50" size={32} />
                </div>
                <div className="p-4 rounded-xl border shadow-sm flex items-center justify-between" style={{ backgroundColor: cardBg, borderColor }}>
                    <div>
                        <div className="text-sm opacity-70">Tax Deductible</div>
                        <div className="text-2xl font-bold text-green-500">{formatMoney(toDisplay(totalTaxDeductible))}</div>
                    </div>
                    <CheckCircle className="text-green-500 opacity-50" size={32} />
                </div>
            </div>

            {/* Add New Form */}
            <div className="p-4 rounded-xl border shadow-sm mb-6" style={{ backgroundColor: cardBg, borderColor }}>
                <h3 className="font-semibold mb-3">Add New Donation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <input
                        type="text"
                        placeholder="Organization / Charity"
                        className="p-2 rounded border bg-transparent lg:col-span-2"
                        style={{ borderColor, color: textColor }}
                        value={newDonation.organization}
                        onChange={e => setNewDonation({ ...newDonation, organization: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Cause (e.g. Education)"
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor }}
                        value={newDonation.cause}
                        onChange={e => setNewDonation({ ...newDonation, cause: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder={`Amount (${currency})`}
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor }}
                        value={newDonation.amount}
                        onChange={e => setNewDonation({ ...newDonation, amount: e.target.value })}
                    />
                    <input
                        type="date"
                        className="p-2 rounded border bg-transparent"
                        style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                        value={newDonation.date}
                        onChange={e => setNewDonation({ ...newDonation, date: e.target.value })}
                    />
                </div>
                <div className="flex items-center justify-between mt-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={newDonation.taxDeductible}
                            onChange={e => setNewDonation({ ...newDonation, taxDeductible: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <span className="text-sm">Tax Deductible (80G)</span>
                    </label>
                    <button
                        onClick={addDonation}
                        className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded flex items-center gap-2"
                    >
                        <Plus size={18} /> Add Donation
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
                <div className="space-y-2">
                    {donations.length === 0 ? (
                        <div className="text-center opacity-50 mt-10">No donations recorded yet.</div>
                    ) : (
                        donations.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)).map(donation => (
                            <div
                                key={donation.id}
                                className="flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-md"
                                style={{ backgroundColor: cardBg, borderColor }}
                            >
                                {editingDonation?.id === donation.id ? (
                                    /* Edit Mode */
                                    <>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <input
                                                type="text"
                                                className="p-2 rounded border bg-transparent"
                                                style={{ borderColor, color: textColor }}
                                                value={editingDonation.organization}
                                                onChange={e => setEditingDonation({ ...editingDonation, organization: e.target.value })}
                                                placeholder="Organization"
                                            />
                                            <input
                                                type="text"
                                                className="p-2 rounded border bg-transparent"
                                                style={{ borderColor, color: textColor }}
                                                value={editingDonation.cause}
                                                onChange={e => setEditingDonation({ ...editingDonation, cause: e.target.value })}
                                                placeholder="Cause"
                                            />
                                            <input
                                                type="number"
                                                className="p-2 rounded border bg-transparent"
                                                style={{ borderColor, color: textColor }}
                                                value={editingDonation.amount} // Should be in Display Currency
                                                // Need to fix handleEditClick logic below (inline here)
                                                onChange={e => setEditingDonation({ ...editingDonation, amount: e.target.value })}
                                                placeholder="Amount"
                                            />
                                        </div>
                                        <div className="flex gap-2 ml-2">
                                            <button onClick={() => updateDonation(editingDonation)} className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900 p-2 rounded">
                                                <Save size={16} />
                                            </button>
                                            <button onClick={() => setEditingDonation(null)} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* View Mode */
                                    <>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="p-3 rounded-full bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300">
                                                <Heart size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">{donation.organization}</div>
                                                <div className="text-xs opacity-70 flex items-center gap-2">
                                                    {donation.cause && <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-[10px]">{donation.cause}</span>}
                                                    {donation.date && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(donation.date).toLocaleDateString()}</span>}
                                                    {donation.taxDeductible && <span className="text-green-500 flex items-center gap-1"><CheckCircle size={12} /> Tax Deductible</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-xl font-bold text-pink-500">
                                                {formatMoney(toDisplay(donation.amount))}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    // Convert Base (INR) to Display Currency for editing
                                                    const rate = CurrencyConverter.convert(1, 'INR', currency);
                                                    setEditingDonation({
                                                        ...donation,
                                                        amount: (donation.amount * rate).toFixed(2)
                                                    });
                                                }}
                                                className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-2 rounded"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => deleteDonation(donation.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-2 rounded">
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

export default Charity;
