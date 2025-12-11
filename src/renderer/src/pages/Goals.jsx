import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import DataAdapter from '../utils/dataAdapter';
import CurrencyConverter from '../utils/CurrencyConverter';
import ExportManager from '../utils/ExportManager';

const Goals = ({ isDark }) => {
    const toast = useToast();
    const [goals, setGoals] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [showDepositForm, setShowDepositForm] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [currency, setCurrency] = useState('INR');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        targetAmount: '',
        currentAmount: '',
        deadline: '',
        color: '#0078d4',
        icon: '🎯'
    });

    const [logAsExpense, setLogAsExpense] = useState(false);

    const [editingId, setEditingId] = useState(null);

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const panelBg = isDark ? '#252526' : '#f0f0f0';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';

    useEffect(() => {
        loadGoals();
    }, []);

    const loadGoals = async () => {
        const settings = await DataAdapter.getUserSettings();
        setCurrency(settings.defaultCurrency || 'INR');
        const data = await DataAdapter.getGoals();
        setGoals(data);
    };

    const handleSaveGoal = async (e) => {
        e.preventDefault();
        try {
            // Convert Target/Current to Base (INR) if input is in Display Currency?
            // Assuming input is in Display Currency.
            // But wait, if I change currency, the goal amount shouldn't change value, just display?
            // Or should it? 
            // If I set a goal of $1000, it is $1000.
            // If I switch to INR, it is ~89000 INR.
            // So we should store in Base (INR).

            // Let's assume user inputs in Display Currency.
            const rate = CurrencyConverter.convert(1, 'INR', currency);

            const targetInINR = parseFloat(formData.targetAmount) / rate;
            const currentInINR = formData.currentAmount ? parseFloat(formData.currentAmount) / rate : 0;

            const goalData = {
                ...formData,
                targetAmount: targetInINR,
                currentAmount: currentInINR
            };

            if (editingId) {
                await DataAdapter.updateGoal({ ...goalData, id: editingId });
                toast.success('Goal updated successfully');
            } else {
                await DataAdapter.addGoal(goalData);
                toast.success('Goal created successfully');
            }
            await loadGoals();
            setShowForm(false);
            resetForm();
        } catch (error) {
            toast.error('Failed to save goal');
        }
    };

    const handleEditClick = (goal) => {
        // Convert Base (INR) to Display Currency for editing
        const rate = CurrencyConverter.convert(1, 'INR', currency);

        setFormData({
            name: goal.name,
            targetAmount: (goal.targetAmount * rate).toFixed(2),
            currentAmount: (goal.currentAmount * rate).toFixed(2),
            deadline: goal.deadline || '',
            color: goal.color,
            icon: goal.icon
        });
        setEditingId(goal.id);
        setShowForm(true);
    };

    const handleDeposit = async (e) => {
        e.preventDefault();
        try {
            const amountVal = parseFloat(depositAmount);
            if (isNaN(amountVal) || amountVal <= 0) {
                toast.error('Please enter a valid amount');
                return;
            }

            // Convert Deposit (Display) to Base (INR)
            const rate = CurrencyConverter.convert(1, 'INR', currency);
            const amountInINR = amountVal / rate;

            const updatedGoal = {
                ...selectedGoal,
                currentAmount: (selectedGoal.currentAmount || 0) + amountInINR
            };
            await DataAdapter.updateGoal(updatedGoal);

            if (logAsExpense) {
                await DataAdapter.addTransaction({
                    date: new Date().toISOString().split('T')[0],
                    type: 'expense',
                    category: 'Goals',
                    amount: amountInINR, // Transaction expects Base (INR) usually, or we handle it in addTransaction?
                    // DataAdapter.addTransaction usually takes raw amount. 
                    // Transactions.jsx handles conversion before calling addTransaction.
                    // So we should pass INR here if the system expects INR.
                    // Yes, db.js expects amount.
                    description: `Deposit to goal: ${selectedGoal.name}`,
                    account: 'Bank Account'
                });
            }

            await loadGoals();

            // Milestone Notifications 🎉
            const oldProgress = selectedGoal.target > 0 ? ((selectedGoal.currentAmount || 0) / selectedGoal.target) * 100 : 0;
            const newProgress = selectedGoal.target > 0 ? (updatedGoal.currentAmount / selectedGoal.target) * 100 : 0;

            // Check which milestones were crossed
            const milestones = [
                { threshold: 100, emoji: '🎊', message: `Goal "${selectedGoal.name}" COMPLETED! 🎉🏆` },
                { threshold: 75, emoji: '🔥', message: `75% done! Almost there for "${selectedGoal.name}"!` },
                { threshold: 50, emoji: '🌟', message: `Halfway there! 50% of "${selectedGoal.name}" reached!` },
                { threshold: 25, emoji: '🚀', message: `Great start! 25% of "${selectedGoal.name}" achieved!` }
            ];

            for (const milestone of milestones) {
                if (oldProgress < milestone.threshold && newProgress >= milestone.threshold) {
                    // Crossed this milestone
                    toast.success(`${milestone.emoji} ${milestone.message}`, { duration: 5000 });
                    break; // Show only highest milestone crossed
                }
            }

            setShowDepositForm(false);
            setSelectedGoal(null);
            setDepositAmount('');
            setLogAsExpense(false);
            toast.success('Funds deposited successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to add funds');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this goal?')) return;
        try {
            await DataAdapter.deleteGoal(id);
            await loadGoals();
            toast.success('Goal deleted');
        } catch (error) {
            toast.error('Failed to delete goal');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            targetAmount: '',
            currentAmount: '',
            deadline: '',
            color: '#0078d4',
            icon: '🎯'
        });
        setEditingId(null);
    };

    const calculateProgress = (current, target) => {
        if (!target) return 0;
        const percent = (current / target) * 100;
        return Math.min(percent, 100).toFixed(1);
    };

    const getDaysRemaining = (deadline) => {
        if (!deadline) return null;
        const diff = new Date(deadline) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    const calculateRequiredSavings = (current, target, deadline) => {
        if (!deadline || !target) return null;
        const remaining = target - current;
        if (remaining <= 0) return null;

        const daysLeft = getDaysRemaining(deadline);
        if (daysLeft <= 0) return null;

        return {
            daily: remaining / daysLeft,
            weekly: remaining / (daysLeft / 7),
            monthly: remaining / (daysLeft / 30)
        };
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
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor }}>
                <div>
                    <h2 className="text-xl font-bold">Goal Tracking</h2>
                    <p className="text-xs opacity-70">Save for your dreams</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (goals.length === 0) {
                                toast.error('No goals to export');
                                return;
                            }
                            ExportManager.exportGoalsToPDF(goals);
                            toast.success('PDF exported successfully');
                        }}
                        className="px-3 py-1.5 text-sm font-semibold rounded border transition-colors hover:bg-opacity-90"
                        style={{
                            backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                            color: textColor,
                            borderColor
                        }}
                    >
                        📄 Export PDF
                    </button>
                    <button
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all"
                        style={{ backgroundColor: isDark ? '#007acc' : '#0078d4' }}
                    >
                        + New Goal
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                {goals.length === 0 ? (
                    <EmptyState
                        title="No Goals Set"
                        message="Start saving for something special. Create your first goal!"
                        isDark={isDark}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {goals.map(goal => {
                            const analysis = calculateRequiredSavings(goal.currentAmount, goal.targetAmount, goal.deadline);
                            const isCompleted = parseFloat(goal.currentAmount) >= parseFloat(goal.targetAmount);
                            const progress = calculateProgress(goal.currentAmount, goal.targetAmount);

                            return (
                                <div key={goal.id} className={`border p-4 relative group shadow-sm hover:shadow-md transition-all flex flex-col ${isCompleted ? 'ring-2 ring-yellow-400' : ''}`} style={{ backgroundColor: panelBg, borderColor }}>
                                    {isCompleted && (
                                        <div className="absolute -top-3 -right-3 bg-yellow-400 text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
                                            COMPLETED 🎉
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{goal.icon}</span>
                                            <div>
                                                <h3 className="font-bold text-sm">{goal.name}</h3>
                                                {goal.deadline && !isCompleted && (
                                                    <p className="text-[10px] opacity-70">
                                                        {getDaysRemaining(goal.deadline)} days left
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditClick(goal)}
                                                className="text-xs text-blue-500 hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(goal.id)}
                                                className="text-xs text-red-500 hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mb-4 flex-1">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span>{formatMoney(toDisplay(goal.currentAmount))}</span>
                                            <span className="font-semibold">{formatMoney(toDisplay(goal.targetAmount))}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-500"
                                                style={{
                                                    width: `${progress}%`,
                                                    backgroundColor: isCompleted ? '#FFD700' : goal.color
                                                }}
                                            />
                                        </div>
                                        <div className="text-right text-[10px] mt-1 opacity-70">
                                            {progress}%
                                        </div>

                                        {/* Smart Analysis */}
                                        {analysis && !isCompleted && (
                                            <div className="mt-3 pt-2 border-t text-[10px]" style={{ borderColor: isDark ? '#444' : '#e0e0e0' }}>
                                                <p className="font-semibold mb-1 opacity-80">Required Savings Rate:</p>
                                                <div className="grid grid-cols-3 gap-1 text-center">
                                                    <div className="bg-opacity-10 p-1 rounded" style={{ backgroundColor: goal.color + '20' }}>
                                                        <div className="font-bold">{formatMoney(toDisplay(analysis.daily))}</div>
                                                        <div className="opacity-60 text-[9px]">Daily</div>
                                                    </div>
                                                    <div className="bg-opacity-10 p-1 rounded" style={{ backgroundColor: goal.color + '20' }}>
                                                        <div className="font-bold">{formatMoney(toDisplay(analysis.weekly))}</div>
                                                        <div className="opacity-60 text-[9px]">Weekly</div>
                                                    </div>
                                                    <div className="bg-opacity-10 p-1 rounded" style={{ backgroundColor: goal.color + '20' }}>
                                                        <div className="font-bold">{formatMoney(toDisplay(analysis.monthly))}</div>
                                                        <div className="opacity-60 text-[9px]">Monthly</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => { setSelectedGoal(goal); setShowDepositForm(true); }}
                                        disabled={isCompleted}
                                        className={`w-full py-1 text-xs font-semibold border transition-colors ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-10'}`}
                                        style={{ borderColor: isCompleted ? '#ccc' : goal.color, color: isCompleted ? '#ccc' : goal.color }}
                                    >
                                        {isCompleted ? 'Goal Achieved!' : '+ Add Funds'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Goal Modal */}
            {showForm && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-80 border shadow-2xl p-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="font-bold mb-4">{editingId ? 'Edit Goal' : 'Create New Goal'}</h3>
                        <form onSubmit={handleSaveGoal} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold mb-1">Goal Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold mb-1">Target ({currency})</label>
                                    <input
                                        type="number"
                                        required
                                        value={formData.targetAmount}
                                        onChange={e => setFormData({ ...formData, targetAmount: e.target.value })}
                                        className="w-full px-2 py-1 text-sm border"
                                        style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                    />
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold mb-1">Icon</label>
                                    <select
                                        value={formData.icon}
                                        onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                        className="w-full px-2 py-1 text-sm border"
                                        style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                    >
                                        <option value="🎯">🎯</option>
                                        <option value="💻">💻</option>
                                        <option value="🚗">🚗</option>
                                        <option value="🏠">🏠</option>
                                        <option value="✈️">✈️</option>
                                        <option value="💍">💍</option>
                                        <option value="🎓">🎓</option>
                                        <option value="🏥">🏥</option>
                                    </select>
                                </div>
                            </div>
                            {!editingId && (
                                <div>
                                    <label className="block text-xs font-bold mb-1">Initial Savings (Optional)</label>
                                    <input
                                        type="number"
                                        value={formData.currentAmount}
                                        onChange={e => setFormData({ ...formData, currentAmount: e.target.value })}
                                        className="w-full px-2 py-1 text-sm border"
                                        style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold mb-1">Deadline (Optional)</label>
                                <input
                                    type="date"
                                    value={formData.deadline}
                                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                                    className="w-full px-2 py-1 text-sm border"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Color</label>
                                <div className="flex gap-2">
                                    {['#0078d4', '#d13438', '#107c10', '#ffb900', '#881798'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color: c })}
                                            className={`w-6 h-6 rounded-full border-2 ${formData.color === c ? 'border-black dark:border-white' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
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
                                    {editingId ? 'Update Goal' : 'Create Goal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deposit Modal */}
            {showDepositForm && selectedGoal && (
                <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="w-72 border shadow-2xl p-4" style={{ backgroundColor: panelBg, borderColor }}>
                        <h3 className="font-bold mb-4">Add Funds to "{selectedGoal.name}"</h3>
                        <form onSubmit={handleDeposit} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold mb-1">Amount to Add ({currency})</label>
                                <input
                                    type="number"
                                    required
                                    autoFocus
                                    value={depositAmount}
                                    onChange={e => setDepositAmount(e.target.value)}
                                    className="w-full px-2 py-1 text-sm border"
                                    style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                                />
                            </div>

                            {/* Linked Transaction Checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={logAsExpense}
                                    onChange={e => setLogAsExpense(e.target.checked)}
                                />
                                <span className="text-xs">Log as Expense (Category: Savings)</span>
                            </label>

                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowDepositForm(false); setSelectedGoal(null); setLogAsExpense(false); }}
                                    className="px-3 py-1 text-xs border hover:bg-gray-100 dark:hover:bg-gray-700"
                                    style={{ borderColor }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1 text-xs text-white font-bold"
                                    style={{ backgroundColor: '#107c10' }}
                                >
                                    Add Funds
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Goals;
