import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

const TransactionForm = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        amount: '',
        type: 'expense',
        category: 'Food',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Add Transaction</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type Selection */}
                    <div className="flex bg-gray-900/50 p-1 rounded-xl mb-4">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === 'expense' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'income' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === 'income' ? 'bg-green-500/20 text-green-400 shadow-sm' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Income
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Amount</label>
                        <input
                            type="number"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-lg"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            <option>Food</option>
                            <option>Transport</option>
                            <option>Utilities</option>
                            <option>Entertainment</option>
                            <option>Salary</option>
                            <option>Investment</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Date</label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full bg-gray-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-6"
                    >
                        <Check size={20} />
                        Save Transaction
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TransactionForm;
