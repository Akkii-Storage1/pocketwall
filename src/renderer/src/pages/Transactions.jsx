import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Edit2, Trash2, Search, Filter, Download, Plus, X, Check, ChevronLeft, ChevronRight, Upload, Paperclip, Share2, Save, FileText } from 'lucide-react';
import { motion, useDragControls } from 'framer-motion';
import { useToast } from '../components/Toast';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, CURRENCIES, DEFAULT_EXCHANGE_RATES } from '../constants';
import EmptyState from '../components/EmptyState';
import AttachmentViewer from '../components/AttachmentViewer';
import ShareButton from '../components/ShareButton';
import DataAdapter from '../utils/dataAdapter';
import ExportManager from '../utils/ExportManager';
import { autoTagTransaction } from '../utils/SmartTagging';
import { getExchangeRate } from '../utils/currencyApi';
import { formatDate } from '../utils/DateFormatter';
import SmartInput from '../components/SmartInput';
import VoiceInput from '../components/VoiceInput';
import { useFeature } from '../context/FeatureContext';

const Transactions = ({ isDark, isPrivacyMode, animationsEnabled, currency }) => {
    const dragControls = useDragControls();
    const location = useLocation();
    const toast = useToast();
    const { optionalFeatures } = useFeature();
    const [transactions, setTransactions] = useState([]);
    const [filteredTransactions, setFilteredTransactions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: 'all', // all, income, expense
        minAmount: '',
        maxAmount: '',
        categories: []
    });

    // Filter Presets State
    const [filterPresets, setFilterPresets] = useState(() => {
        const saved = localStorage.getItem('pocketwall_filter_presets');
        return saved ? JSON.parse(saved) : [];
    });
    const [showSavePreset, setShowSavePreset] = useState(false);
    const [presetName, setPresetName] = useState('');

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Payee State
    const [payees, setPayees] = useState([]);
    const [payeeSuggestions, setPayeeSuggestions] = useState([]);
    const [showPayeeSuggestions, setShowPayeeSuggestions] = useState(false);

    // Accounts State
    const [accounts, setAccounts] = useState([]);

    // User Settings State
    const [defaultCurrency, setDefaultCurrency] = useState('INR');
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [pendingCurrency, setPendingCurrency] = useState(null);
    const [fetchingRate, setFetchingRate] = useState(false);

    // Attachment Viewer State
    const [showAttachmentViewer, setShowAttachmentViewer] = useState(false);
    const [viewingAttachments, setViewingAttachments] = useState(null);

    const [showExportMenu, setShowExportMenu] = useState(false);

    // Template State
    const [templates, setTemplates] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);

    // Custom Categories from Budgets
    const [customCategories, setCustomCategories] = useState([]);
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);

    // Voice Input State
    const [showVoiceInput, setShowVoiceInput] = useState(false);

    const [viewMode, setViewMode] = useState('paginated'); // 'paginated' or 'all'
    const itemsPerPage = viewMode === 'all' ? filteredTransactions.length : 50; // Increased default to 50

    const [formData, setFormData] = useState({
        amount: '',
        originalAmount: '',
        currency: 'INR',
        exchangeRate: 1,
        type: 'expense',
        category: 'Food',
        payee: '',
        accountId: '',
        description: '',
        tags: '',
        date: new Date().toISOString().split('T')[0],
        isSplit: false,
        splits: [],
        attachments: []
    });

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const headerBg = isDark ? '#3e3e42' : '#e0e0e0';

    useEffect(() => {
        loadSettings();
        loadTransactions();
        loadPayees();
        loadAccounts();
        loadTemplates();
        loadBudgets();

        const handleOpenNew = () => handleAddNew();
        window.addEventListener('openNewTransaction', handleOpenNew);
        window.addEventListener('budgetUpdated', loadBudgets);
        return () => {
            window.removeEventListener('openNewTransaction', handleOpenNew);
            window.removeEventListener('budgetUpdated', loadBudgets);
        };
    }, []);

    // Handle navigation from Dashboard
    useEffect(() => {
        if (location.state?.editId && transactions.length > 0) {
            const t = transactions.find(tx => tx.id === location.state.editId);
            if (t) {
                handleEdit(t);
                // Clear state to prevent re-opening on refresh (optional, but good UX)
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state, transactions]);

    const loadTransactions = async () => {
        const data = await DataAdapter.getTransactions();
        setTransactions(data);
    };

    const loadSettings = async () => {
        const settings = await DataAdapter.getUserSettings();
        if (settings && settings.defaultCurrency) {
            setDefaultCurrency(settings.defaultCurrency);
        }
    };

    const loadPayees = async () => {
        const data = await DataAdapter.getPayees();
        setPayees(data);
    };

    const loadAccounts = async () => {
        const data = await DataAdapter.getAccounts();
        setAccounts(data);
        // Set default account if creating new
        if (!isEditing && data.length > 0) {
            setFormData(prev => ({ ...prev, accountId: data[0].id }));
        }
    };

    const loadTemplates = async () => {
        const data = await DataAdapter.getTransactionTemplates();
        setTemplates(data);
    };

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            toast.error('Please enter a template name');
            return;
        }

        const template = {
            name: templateName,
            data: { ...formData, date: undefined } // Don't save date
        };

        await DataAdapter.saveTransactionTemplate(template);
        await loadTemplates();
        toast.success('Template saved');
        setShowSaveTemplateModal(false);
        setTemplateName('');
    };

    const handleApplyTemplate = (template) => {
        setFormData({
            ...formData,
            ...template.data,
            date: new Date().toISOString().split('T')[0] // Reset date to today
        });
        setShowTemplateModal(false);
        toast.success(`Applied template: ${template.name}`);
    };

    const handleDeleteTemplate = async (id) => {
        if (confirm('Delete this template?')) {
            await DataAdapter.deleteTransactionTemplate(id);
            await loadTemplates();
            toast.success('Template deleted');
        }
    };

    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const categoryDropdownRef = React.useRef(null);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
                setShowCategoryDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            filterAndSortData();
            setCurrentPage(1);
            setSelectedIds(new Set()); // Clear selection on filter change
        }, 300);

        return () => clearTimeout(handler);
    }, [searchTerm, transactions, filterDate, filters, sortConfig]);

    const inputRef = React.useRef(null);

    useEffect(() => {
        if (showForm && inputRef.current) {
            // Aggressive focus strategy with fallback
            const focusInput = () => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            };

            // Attempt 1: Immediate
            focusInput();

            // Attempt 2: Short delay (for render)
            const t1 = setTimeout(focusInput, 100);

            // Attempt 3: Longer delay (for animations/transitions)
            const t2 = setTimeout(() => {
                focusInput();
                // Check if we missed
                if (document.activeElement !== inputRef.current) {
                    console.log('Focus missed, forcing again');
                    focusInput();
                }
            }, 300);

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
            };
        }
    }, [showForm]);

    const loadBudgets = async () => {
        console.log('Transactions: Loading budgets...');
        const budgets = await DataAdapter.getBudgets();
        if (budgets) {
            console.log('Transactions: Budgets loaded', Object.keys(budgets));
            // Force a new array reference to ensure re-render
            setCustomCategories([...Object.keys(budgets)]);
        }
    };

    // Add new category inline from Transaction form
    const handleAddCategory = async () => {
        const categoryName = newCategoryInput.trim();
        if (!categoryName) {
            toast.error('Please enter a category name');
            return;
        }

        // Check if already exists
        const allCategories = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, ...customCategories];
        if (allCategories.includes(categoryName)) {
            toast.error('Category already exists');
            return;
        }

        try {
            // Save to budgets (same storage as Settings categories)
            const budgets = await DataAdapter.getBudgets() || {};
            budgets[categoryName] = { limit: 0 }; // Add with zero limit
            await DataAdapter.saveBudgets(budgets);

            // Update local state
            setCustomCategories([...customCategories, categoryName]);
            setFormData({ ...formData, category: categoryName });
            setNewCategoryInput('');
            setShowAddCategory(false);
            setShowCategoryDropdown(false);

            toast.success(`Category "${categoryName}" added!`);
        } catch (error) {
            toast.error('Failed to add category');
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const filterAndSortData = () => {
        let result = transactions;

        // 1. Basic Date Filter (Month/Year) - Only if Advanced Date Range is NOT used
        if (filterDate && !filters.startDate && !filters.endDate) {
            result = result.filter(t => t.date.startsWith(filterDate));
        }

        // 2. Advanced Filters
        if (filters.startDate) {
            result = result.filter(t => t.date.split('T')[0] >= filters.startDate);
        }
        if (filters.endDate) {
            result = result.filter(t => t.date.split('T')[0] <= filters.endDate);
        }
        if (filters.type !== 'all') {
            result = result.filter(t => t.type === filters.type);
        }
        if (filters.minAmount) {
            result = result.filter(t => Math.abs(t.amount) >= parseFloat(filters.minAmount));
        }
        if (filters.maxAmount) {
            result = result.filter(t => Math.abs(t.amount) <= parseFloat(filters.maxAmount));
        }
        if (filters.categories.length > 0) {
            result = result.filter(t => filters.categories.includes(t.category));
        }

        // 3. Search Term
        if (searchTerm.trim() !== '') {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(t =>
                t.category.toLowerCase().includes(lowerTerm) ||
                (t.description && t.description.toLowerCase().includes(lowerTerm)) ||
                (t.tags && t.tags.toLowerCase().includes(lowerTerm)) ||
                (t.payee && t.payee.toLowerCase().includes(lowerTerm)) ||
                t.amount.toString().includes(lowerTerm)
            );
        }

        // 4. Sorting
        result.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        setFilteredTransactions(result);
    };

    const handleEdit = (transaction) => {
        setFormData({
            amount: transaction.amount,
            originalAmount: transaction.originalAmount || transaction.amount,
            currency: transaction.currency || 'INR',
            exchangeRate: transaction.exchangeRate || 1,
            type: transaction.type,
            category: transaction.category,
            payee: transaction.payee || '',
            accountId: transaction.accountId,
            description: transaction.description || '',
            tags: transaction.tags || '',
            date: transaction.date,
            isSplit: !!transaction.splits && transaction.splits.length > 0,
            splits: transaction.splits || [],
            attachments: transaction.attachments || []
        });
        setEditId(transaction.id);
        setIsEditing(true);
        setShowForm(true);
    };

    const handleAddNew = () => {
        // Get current rate for default currency
        const rate = defaultCurrency === 'INR' ? 1 : (DEFAULT_EXCHANGE_RATES[defaultCurrency] || 1);

        setFormData({
            amount: '',
            originalAmount: '',
            currency: defaultCurrency,
            exchangeRate: rate,
            type: 'expense',
            category: 'Food',
            payee: '',
            accountId: accounts.length > 0 ? accounts[0].id : '',
            description: '',
            tags: '',
            date: new Date().toISOString().split('T')[0],
            isSplit: false,
            splits: [],
            attachments: []
        });
        setIsEditing(false);
        setEditId(null);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validation for Split Transactions
            if (formData.isSplit) {
                const totalSplit = formData.splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
                const originalVal = parseFloat(formData.originalAmount);

                if (Math.abs(totalSplit - originalVal) > 0.01) {
                    toast.error(`Split total (${totalSplit.toFixed(2)}) does not match transaction amount (${originalVal.toFixed(2)})`);
                    return;
                }
            }

            // Validation for Payee
            if (!formData.payee || formData.payee.trim() === '' || formData.payee.toLowerCase() === 'unknown') {
                toast.error('Please enter a valid Payee name');
                return;
            }

            if (isEditing && editId) {
                await DataAdapter.deleteTransaction(editId);
            }

            // Calculate converted amount for storage (Base Currency: INR)
            const originalVal = parseFloat(formData.originalAmount);
            const rate = parseFloat(formData.exchangeRate);

            // If currency is INR, rate is 1. If USD, rate is ~89.36.
            // Amount stored should be in INR.
            // If user enters 100 USD, we store:
            // amount: 8936 (INR)
            // originalAmount: 100
            // currency: 'USD'
            // exchangeRate: 89.36

            let convertedAmount;
            if (formData.currency === 'INR') {
                convertedAmount = originalVal;
            } else {
                convertedAmount = (originalVal * rate).toFixed(2);
            }

            // Auto-tagging
            let transactionToSave = {
                ...formData,
                amount: convertedAmount, // Main amount is in INR (base)
                originalAmount: originalVal,
                exchangeRate: rate
            };

            // Apply smart tagging if tags are empty
            if (!transactionToSave.tags) {
                const autoTagged = autoTagTransaction(transactionToSave);
                if (autoTagged.tags && autoTagged.tags.length > 0) {
                    transactionToSave.tags = autoTagged.tags.join(', ');
                    toast.success(`Auto-tagged: ${transactionToSave.tags}`);
                }
            }

            await DataAdapter.addTransaction(transactionToSave);

            // Auto-Deposit to Goals (for income transactions)
            if (transactionToSave.type === 'income' && optionalFeatures?.goals?.autoDeposit) {
                try {
                    const depositPercent = optionalFeatures?.goals?.autoDepositPercent || 10;
                    const depositAmount = (parseFloat(transactionToSave.amount) * depositPercent) / 100;

                    // Get goals and deposit to first incomplete goal
                    const goals = await DataAdapter.getGoals();
                    const targetGoal = goals.find(g => g.current < g.target);

                    if (targetGoal && depositAmount > 0) {
                        const newCurrent = Math.min(targetGoal.target, (parseFloat(targetGoal.current) || 0) + depositAmount);
                        await DataAdapter.updateGoal({ ...targetGoal, current: newCurrent });
                        toast.success(`💰 Auto-saved ₹${Math.round(depositAmount).toLocaleString()} (${depositPercent}%) to "${targetGoal.name}"`);
                    }
                } catch (autoDepositError) {
                    console.warn('Auto-deposit failed:', autoDepositError);
                }
            }

            await loadTransactions();
            await loadPayees();
            toast.success(isEditing ? 'Transaction updated' : 'Transaction saved');
            setShowForm(false);
        } catch (error) {
            toast.error('Failed to save transaction');
        }
    };

    // Handle currency selection change
    const handleCurrencyChange = async (newCurrency) => {
        const rate = newCurrency === 'INR' ? 1 : (DEFAULT_EXCHANGE_RATES[newCurrency] || 1);

        setFormData(prev => ({
            ...prev,
            currency: newCurrency,
            exchangeRate: rate
        }));

        // Try to fetch live rate if different from default
        if (newCurrency !== defaultCurrency && newCurrency !== 'INR') {
            try {
                const liveRate = await getExchangeRate(newCurrency, defaultCurrency);
                if (liveRate && liveRate > 0) {
                    setFormData(prev => ({
                        ...prev,
                        exchangeRate: liveRate
                    }));
                }
            } catch (err) {
                console.warn('Using fallback exchange rate');
            }
        }
    };

    const restoreTransactions = async (itemsToRestore) => {
        try {
            for (const item of itemsToRestore) {
                await DataAdapter.addTransaction(item);
            }
            await loadTransactions();
            toast.success('Restored successfully');
        } catch (error) {
            toast.error('Failed to restore');
        }
    };

    const handleDelete = async (id) => {
        const itemToDelete = transactions.find(t => t.id === id);
        if (!itemToDelete) return;

        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                await DataAdapter.deleteTransaction(id);
                await loadTransactions();

                toast.success('Transaction deleted', {
                    duration: 5000,
                    action: {
                        label: 'Undo',
                        onClick: () => restoreTransactions([itemToDelete])
                    }
                });
            } catch (error) {
                toast.error('Failed to delete transaction');
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Delete ${selectedIds.size} selected transactions?`)) return;

        const itemsToDelete = transactions.filter(t => selectedIds.has(t.id));

        try {
            for (const id of selectedIds) {
                await DataAdapter.deleteTransaction(id);
            }
            await loadTransactions();
            setSelectedIds(new Set());

            toast.success(`${itemsToDelete.length} transactions deleted`, {
                duration: 5000,
                action: {
                    label: 'Undo',
                    onClick: () => restoreTransactions(itemsToDelete)
                }
            });
        } catch (error) {
            toast.error('Failed to delete some transactions');
        }
    };

    // Bulk Category Change
    const handleBulkCategoryChange = async (newCategory) => {
        if (selectedIds.size === 0) return;
        if (!newCategory) return;

        try {
            const itemsToUpdate = transactions.filter(t => selectedIds.has(t.id));

            for (const item of itemsToUpdate) {
                await DataAdapter.deleteTransaction(item.id);
                await DataAdapter.addTransaction({ ...item, category: newCategory });
            }

            await loadTransactions();
            setSelectedIds(new Set());
            toast.success(`${itemsToUpdate.length} transactions moved to "${newCategory}"`);
        } catch (error) {
            console.error('Bulk category change failed:', error);
            toast.error('Failed to change category');
        }
    };

    // Filter Preset Functions
    const saveFilterPreset = () => {
        if (!presetName.trim()) {
            toast.error('Please enter a preset name');
            return;
        }

        const newPreset = {
            id: Date.now(),
            name: presetName.trim(),
            filters: { ...filters }
        };

        const updated = [...filterPresets, newPreset];
        setFilterPresets(updated);
        localStorage.setItem('pocketwall_filter_presets', JSON.stringify(updated));

        setPresetName('');
        setShowSavePreset(false);
        toast.success(`Filter preset "${newPreset.name}" saved!`);
    };

    const applyFilterPreset = (preset) => {
        setFilters(preset.filters);
        setShowFilters(true);
        toast.success(`Applied filter: ${preset.name}`);
    };

    const deleteFilterPreset = (id) => {
        const updated = filterPresets.filter(p => p.id !== id);
        setFilterPresets(updated);
        localStorage.setItem('pocketwall_filter_presets', JSON.stringify(updated));
        toast.success('Filter preset deleted');
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === currentItems.length) {
            setSelectedIds(new Set());
        } else {
            const newSet = new Set();
            currentItems.forEach(t => newSet.add(t.id));
            setSelectedIds(newSet);
        }
    };

    const handleExportCSV = () => {
        if (filteredTransactions.length === 0) {
            toast.showToast('No transactions to export', 'warning');
            return;
        }

        const headers = ['Date', 'Account', 'Type', 'Payee', 'Category', 'Amount', 'Currency', 'Description', 'Tags'];
        const csvContent = [
            headers.join(','),
            ...filteredTransactions.map(t => [
                formatDate(t.date, currency),
                accounts.find(a => a.id === t.accountId)?.name || 'Main',
                t.type,
                `"${(t.payee || '').replace(/"/g, '""')}"`,
                t.category,
                t.amount,
                t.currency || defaultCurrency,
                `"${(t.description || '').replace(/"/g, '""')}"`,
                `"${(t.tags || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        setShowExportMenu(false);
    };

    const handleExportExcel = () => {
        if (filteredTransactions.length === 0) {
            toast.showToast('No transactions to export', 'warning');
            return;
        }
        const data = filteredTransactions.map(t => ({
            Date: formatDate(t.date, currency),
            Payee: t.payee,
            Category: t.category,
            Type: t.type,
            Amount: t.amount,
            Currency: t.currency || defaultCurrency,
            Account: accounts.find(a => a.id === t.accountId)?.name || 'Main',
            Description: t.description,
            Tags: t.tags
        }));
        ExportManager.exportToExcel(data, `transactions_${new Date().toISOString().slice(0, 10)}`);
        setShowExportMenu(false);
    };

    const handleExportPDF = () => {
        try {
            if (filteredTransactions.length === 0) {
                toast.showToast('No transactions to export', 'warning');
                return;
            }
            const data = filteredTransactions.map(t => ({
                ...t,
                accountName: accounts.find(a => a.id === t.accountId)?.name || 'Main'
            }));
            ExportManager.exportTransactionsToPDF(data, 'Transaction Report');
            setShowExportMenu(false);
            toast.showToast('PDF Exported', 'success');
        } catch (error) {
            console.error(error);
            toast.showToast('Failed to export PDF: ' + error.message, 'error');
        }
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTransactions.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    // Dynamic Categories based on Type
    const currentCategories = formData.type === 'income'
        ? INCOME_CATEGORIES
        : [...new Set([...EXPENSE_CATEGORIES, ...customCategories])].sort();

    console.log('Transactions Render: currentCategories', currentCategories);

    // Helper to format currency with conversion
    const formatMoney = (amountInINR, targetCurrency = defaultCurrency) => {
        let displayAmount = amountInINR;
        if (targetCurrency !== 'INR') {
            const rate = DEFAULT_EXCHANGE_RATES[targetCurrency] || 1;
            displayAmount = amountInINR / rate;
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: targetCurrency
        }).format(displayAmount);
    };

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif' }}>
            {/* Header - Fixed at top */}
            <div className="p-4 border-b flex justify-between items-center shrink-0" style={{ backgroundColor: headerBg, borderColor, color: textColor }}>
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-sm" style={{ color: textColor }}>Transaction List</span>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => setFilterDate(prev => {
                            const d = new Date(prev + '-01');
                            d.setMonth(d.getMonth() - 1);
                            return d.toISOString().slice(0, 7);
                        })} className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-1">◀</button>
                        <input
                            type="month"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-semibold focus:outline-none cursor-pointer"
                            style={{ color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                        />
                        <button onClick={() => setFilterDate(prev => {
                            const d = new Date(prev + '-01');
                            d.setMonth(d.getMonth() + 1);
                            return d.toISOString().slice(0, 7);
                        })} className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-1">▶</button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="px-2 py-1 text-xs border w-40 pl-7"
                            style={{
                                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                color: textColor,
                                borderColor: isDark ? '#555' : '#adadad'
                            }}
                        />
                        <span className="absolute left-2 top-1 opacity-50 text-xs">🔍</span>
                    </div>

                    {/* View Mode Toggle */}
                    <button
                        onClick={() => setViewMode(prev => prev === 'paginated' ? 'all' : 'paginated')}
                        className="px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors border"
                        style={{
                            backgroundColor: viewMode === 'all' ? (isDark ? '#3e3e42' : '#e0e0e0') : 'transparent',
                            color: textColor,
                            borderColor: borderColor
                        }}
                        title={viewMode === 'paginated' ? "Switch to Scroll View" : "Switch to Paginated View"}
                    >
                        {viewMode === 'paginated' ? 'View Mode: Pages' : 'View Mode: Scroll'}
                    </button>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 transition-colors border ${showFilters ? 'bg-blue-100 text-blue-700 border-blue-300' : ''}`}
                        style={{
                            backgroundColor: showFilters ? (isDark ? '#264f78' : '#dbeafe') : 'transparent',
                            color: showFilters ? (isDark ? '#fff' : '#1d4ed8') : textColor,
                            borderColor: showFilters ? (isDark ? '#507ebf' : '#93c5fd') : borderColor
                        }}
                    >
                        <span>Filters</span>
                        {(filters.startDate || filters.endDate || filters.minAmount || filters.maxAmount || filters.type !== 'all' || filters.categories.length > 0) && (
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        )}
                    </button>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="px-3 py-1 text-xs border font-semibold text-white bg-red-600 hover:bg-red-700"
                            style={{ borderColor: '#a80000' }}
                        >
                            Delete Selected ({selectedIds.size})
                        </button>
                    )}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="px-3 py-1 text-xs border hover:bg-opacity-80 flex items-center gap-1"
                            style={{
                                backgroundColor: isDark ? '#3e3e42' : '#f0f0f0',
                                color: textColor,
                                borderColor: isDark ? '#555' : '#adadad'
                            }}
                        >
                            Export ▾
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 z-50 shadow-xl border rounded flex flex-col min-w-[120px]"
                                style={{ backgroundColor: panelBg, borderColor: isDark ? '#555' : '#ccc' }}>
                                <button onClick={handleExportCSV} className="px-3 py-2 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5" style={{ color: textColor }}>
                                    As CSV
                                </button>
                                <button onClick={handleExportExcel} className="px-3 py-2 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5" style={{ color: textColor }}>
                                    As Excel (.xlsx)
                                </button>
                                <button onClick={handleExportPDF} className="px-3 py-2 text-left text-xs hover:bg-black/5 dark:hover:bg-white/5" style={{ color: textColor }}>
                                    As PDF
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="px-4 py-1 text-xs border font-semibold"
                        style={{
                            backgroundColor: isDark ? '#0e639c' : '#0078d4',
                            color: '#ffffff',
                            borderColor: isDark ? '#1177bb' : '#005a9e'
                        }}
                    >
                        Add New
                    </button>
                    {/* Voice button - hidden for now, pending Electron speech API fix
                    <button
                        onClick={() => setShowVoiceInput(true)}
                        className="px-3 py-1 text-xs border font-semibold flex items-center gap-1"
                        title="Add via Voice"
                        style={{
                            backgroundColor: isDark ? '#5c2d91' : '#7c3aed',
                            color: '#ffffff',
                            borderColor: isDark ? '#7c3aed' : '#6d28d9'
                        }}
                    >
                        🎤 Voice
                    </button>
                    */}
                    <button
                        onClick={() => {
                            loadTemplates();
                            setShowTemplateModal(true);
                        }}
                        className="px-3 py-1 text-xs border font-semibold flex items-center gap-1"
                        style={{
                            backgroundColor: isDark ? '#3e3e42' : '#f0f0f0',
                            color: textColor,
                            borderColor: isDark ? '#555' : '#adadad'
                        }}
                    >
                        <FileText size={12} /> Templates
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="p-3 border-b text-xs shrink-0" style={{ backgroundColor: isDark ? '#2d2d30' : '#f8f9fa', borderColor }}>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block mb-1 font-medium" style={{ color: textColor }}>Date Range</label>
                            <div className="flex gap-2 items-center">
                                <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="p-1 border rounded" style={{ backgroundColor: panelBg, color: textColor, borderColor, colorScheme: isDark ? 'dark' : 'light' }} />
                                <span>to</span>
                                <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="p-1 border rounded" style={{ backgroundColor: panelBg, color: textColor, borderColor, colorScheme: isDark ? 'dark' : 'light' }} />
                            </div>
                        </div>
                        {/* ... other filters ... */}
                        <div>
                            <label className="block mb-1 font-medium" style={{ color: textColor }}>Type</label>
                            <select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })} className="p-1 border rounded w-24" style={{ backgroundColor: panelBg, color: textColor, borderColor }}>
                                <option value="all">All</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium" style={{ color: textColor }}>Amount</label>
                            <div className="flex gap-2 items-center">
                                <input type="number" placeholder="Min" value={filters.minAmount} onChange={e => setFilters({ ...filters, minAmount: e.target.value })} className="p-1 border rounded w-20" style={{ backgroundColor: panelBg, color: textColor, borderColor }} />
                                <span>-</span>
                                <input type="number" placeholder="Max" value={filters.maxAmount} onChange={e => setFilters({ ...filters, maxAmount: e.target.value })} className="p-1 border rounded w-20" style={{ backgroundColor: panelBg, color: textColor, borderColor }} />
                            </div>
                        </div>
                        {/* Category */}
                        <div>
                            <label className="block text-xs font-semibold mb-1" style={{ color: textColor }}>Category</label>
                            <select
                                value={filters.categories[0] || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFilters({ ...filters, categories: val ? [val] : [] });
                                }}
                                className="w-full px-2 py-1 text-xs border"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor: isDark ? '#555' : '#ccc' }}
                            >
                                <option value="">All Categories</option>
                                {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Actions */}
                        <div className="flex items-center gap-3">
                            <button onClick={() => setFilters({ startDate: '', endDate: '', type: 'all', minAmount: '', maxAmount: '', categories: [] })} className="text-blue-500 hover:underline pb-1">Clear Filters</button>

                            {/* Save Preset Button */}
                            <button
                                onClick={() => setShowSavePreset(true)}
                                className="px-2 py-1 text-xs rounded flex items-center gap-1"
                                style={{ backgroundColor: isDark ? '#3e3e42' : '#e5e7eb', color: textColor }}
                            >
                                💾 Save Preset
                            </button>

                            {/* Saved Presets Dropdown */}
                            {filterPresets.length > 0 && (
                                <div className="relative">
                                    <select
                                        onChange={(e) => {
                                            const preset = filterPresets.find(p => p.id === parseInt(e.target.value));
                                            if (preset) applyFilterPreset(preset);
                                            e.target.value = '';
                                        }}
                                        className="px-2 py-1 text-xs rounded border"
                                        style={{ backgroundColor: panelBg, color: textColor, borderColor }}
                                        defaultValue=""
                                    >
                                        <option value="">📁 Saved Presets ({filterPresets.length})</option>
                                        {filterPresets.map(p => (
                                            <option key={p.id} value={p.id}>📌 {p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Save Preset Modal */}
            {showSavePreset && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="p-4 rounded-lg shadow-xl max-w-sm w-full mx-4" style={{ backgroundColor: panelBg }}>
                        <h4 className="font-semibold mb-3" style={{ color: textColor }}>💾 Save Filter Preset</h4>
                        <input
                            type="text"
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder="Preset name (e.g., High Expenses)"
                            className="w-full px-3 py-2 border rounded mb-3 text-sm"
                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                            autoFocus
                        />
                        <div className="text-xs mb-3 opacity-60" style={{ color: textColor }}>
                            Current filters: {filters.type !== 'all' ? `Type: ${filters.type}` : ''}
                            {filters.startDate ? ` From: ${filters.startDate}` : ''}
                            {filters.endDate ? ` To: ${filters.endDate}` : ''}
                            {filters.minAmount ? ` Min: ₹${filters.minAmount}` : ''}
                            {filters.maxAmount ? ` Max: ₹${filters.maxAmount}` : ''}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={saveFilterPreset}
                                className="flex-1 py-2 text-sm font-semibold text-white rounded bg-blue-600 hover:bg-blue-700"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { setShowSavePreset(false); setPresetName(''); }}
                                className="px-4 py-2 text-sm border rounded"
                                style={{ backgroundColor: panelBg, color: textColor, borderColor }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DataGridView */}
            <div className={`flex-1 overflow-auto ${viewMode === 'paginated' ? 'overflow-y-hidden' : ''}`} style={{ backgroundColor: panelBg }}>
                {filteredTransactions.length === 0 ? (
                    <EmptyState
                        title="No Transactions Found"
                        message={searchTerm ? "Try adjusting your search terms." : "No transactions recorded for this month. Click 'Add New' to get started."}
                        isDark={isDark}
                    />
                ) : (
                    <>
                        {/* Bulk Action Bar */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-4 px-4 py-2 border-b" style={{ backgroundColor: isDark ? '#1e3a5f' : '#dbeafe', borderColor }}>
                                <span className="text-sm font-medium" style={{ color: textColor }}>
                                    {selectedIds.size} selected
                                </span>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                                >
                                    🗑️ Delete Selected
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs" style={{ color: textColor }}>Move to:</span>
                                    <select
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleBulkCategoryChange(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        className="px-2 py-1 text-xs border rounded"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                        defaultValue=""
                                    >
                                        <option value="">Select Category...</option>
                                        <optgroup label="Expense">
                                            {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </optgroup>
                                        <optgroup label="Income">
                                            {INCOME_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </optgroup>
                                        {customCategories.length > 0 && (
                                            <optgroup label="Custom">
                                                {customCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                                <button
                                    onClick={() => setSelectedIds(new Set())}
                                    className="px-2 py-1 text-xs opacity-60 hover:opacity-100"
                                    style={{ color: textColor }}
                                >
                                    ✕ Clear Selection
                                </button>
                            </div>
                        )}

                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                            <table className="w-full text-xs border-collapse">
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: headerBg, zIndex: 10 }}>
                                    <tr>
                                        <th className="px-3 py-2 text-center border-b w-10" style={{ borderColor }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === currentItems.length && currentItems.length > 0}
                                                onChange={toggleAll}
                                            />
                                        </th>
                                        <th onClick={() => handleSort('date')} className="px-3 py-2 text-left font-semibold border-b cursor-pointer hover:opacity-70" style={{ borderColor, color: textColor }}>
                                            Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th onClick={() => handleSort('accountId')} className="px-3 py-2 text-left font-semibold border-b cursor-pointer hover:opacity-70" style={{ borderColor, color: textColor }}>
                                            Account {sortConfig.key === 'accountId' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th onClick={() => handleSort('type')} className="px-3 py-2 text-left font-semibold border-b cursor-pointer hover:opacity-70" style={{ borderColor, color: textColor }}>
                                            Type {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th onClick={() => handleSort('payee')} className="px-3 py-2 text-left font-semibold border-b cursor-pointer hover:opacity-70" style={{ borderColor, color: textColor }}>
                                            Payee {sortConfig.key === 'payee' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th onClick={() => handleSort('amount')} className="px-3 py-2 text-right font-semibold border-b cursor-pointer hover:opacity-70" style={{ borderColor, color: textColor }}>
                                            Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th onClick={() => handleSort('category')} className="px-3 py-2 text-left font-semibold border-b cursor-pointer hover:opacity-70" style={{ borderColor, color: textColor }}>
                                            Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                        </th>
                                        <th className="px-3 py-2 text-center border-b" style={{ borderColor, color: textColor }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map(t => (
                                        <tr key={t.id} className="hover:bg-opacity-50 border-b" style={{ backgroundColor: selectedIds.has(t.id) ? (isDark ? '#004466' : '#cce8ff') : 'transparent', borderColor }}>
                                            <td className="px-3 py-2 text-center" style={{ borderColor }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(t.id)}
                                                    onChange={() => toggleSelection(t.id)}
                                                />
                                            </td>
                                            <td className="px-3 py-2" style={{ borderColor, color: textColor }}>{formatDate(t.date, currency)}</td>
                                            <td className="px-3 py-2" style={{ borderColor, color: textColor }}>
                                                {accounts.find(a => a.id === t.accountId)?.name || 'Main'}
                                            </td>
                                            <td className="px-3 py-2" style={{ borderColor }}>
                                                <span className={`px-2 py-0.5 rounded text-[10px] ${t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {t.type.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-medium" style={{ borderColor, color: textColor }}>{t.payee}</td>
                                            <td className="px-3 py-2 text-right font-bold" style={{ borderColor, color: t.type === 'income' ? '#059669' : '#ef4444' }}>
                                                {t.type === 'income' ? '+' : '-'}{formatMoney(Math.abs(t.amount))}
                                            </td>
                                            <td className="px-3 py-2" style={{ borderColor, color: textColor }}>{t.category}</td>
                                            <td className="px-3 py-2 text-center" style={{ borderColor }}>
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEdit(t)} className="text-blue-500 hover:text-blue-700 px-2 py-0.5 border rounded text-[10px]" style={{ borderColor: isDark ? '#555' : '#ccc' }}>
                                                        Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 px-2 py-0.5 border rounded text-[10px]" style={{ borderColor: isDark ? '#555' : '#ccc' }}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden p-2 space-y-2">
                            {currentItems.map(t => (
                                <div
                                    key={t.id}
                                    className="p-3 rounded-lg border shadow-sm"
                                    style={{
                                        backgroundColor: selectedIds.has(t.id) ? (isDark ? '#004466' : '#cce8ff') : (isDark ? '#2d2d30' : '#fff'),
                                        borderColor
                                    }}
                                    onClick={() => toggleSelection(t.id)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-sm" style={{ color: textColor }}>{t.payee || 'Unknown'}</div>
                                            <div className="text-xs opacity-70" style={{ color: textColor }}>{new Date(t.date).toLocaleDateString('en-IN')}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold sensitive-amount ${isPrivacyMode ? 'privacy-blur' : ''}`} style={{ color: t.type === 'income' ? '#059669' : '#ef4444' }}>
                                                {t.type === 'income' ? '+' : '-'}{formatMoney(Math.abs(t.amount))}
                                            </div>
                                            <div className="text-xs opacity-70" style={{ color: textColor }}>{t.category}</div>
                                        </div>
                                    </div>
                                    {t.description && (
                                        <div className="text-xs mb-2 opacity-80" style={{ color: textColor }}>
                                            {t.description}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor }}>
                                        <div className="text-xs opacity-60" style={{ color: textColor }}>
                                            {accounts.find(a => a.id === t.accountId)?.name || 'Main'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                                                className="px-2 py-1 text-xs rounded border"
                                                style={{ borderColor: isDark ? '#555' : '#ccc', color: textColor }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                                                className="px-2 py-1 text-xs rounded border text-red-500"
                                                style={{ borderColor: isDark ? '#555' : '#ccc' }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Footer with Totals and Pagination */}
            <div className="border-t flex flex-col" style={{ borderColor, backgroundColor: headerBg, color: textColor }}>
                {/* Totals Row */}
                <div className="px-3 py-2 flex justify-between items-center border-b font-bold text-xs" style={{ borderColor, backgroundColor: isDark ? '#252526' : '#f0f0f0' }}>
                    <div>Total ({filteredTransactions.length} items)</div>
                    <div className="flex gap-4">
                        <div className="text-green-600">
                            Income: {formatMoney(filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0))}
                        </div>
                        <div className="text-red-600">
                            Expense: {formatMoney(filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0))}
                        </div>
                        <div className={`${filteredTransactions.reduce((sum, t) => sum + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Net: {formatMoney(filteredTransactions.reduce((sum, t) => sum + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount)), 0))}
                        </div>
                    </div>
                </div>

                {/* Pagination Controls */}
                <div className="px-3 py-2 text-xs flex justify-between items-center">
                    <span>Showing <strong>{currentItems.length}</strong> of <strong>{filteredTransactions.length}</strong> records</span>

                    <div className="flex gap-1 items-center">
                        <span className="mr-2">Page {currentPage} of {totalPages || 1}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-2 py-1 border disabled:opacity-50"
                            style={{ backgroundColor: isDark ? '#3e3e42' : '#fff', borderColor }}
                        >
                            &lt; Prev
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-2 py-1 border disabled:opacity-50"
                            style={{ backgroundColor: isDark ? '#3e3e42' : '#fff', borderColor }}
                        >
                            Next &gt;
                        </button>
                    </div>
                </div>
            </div>



            {/* Modal Dialog - .NET Style */}
            {
                showForm && (
                    <div className="fixed inset-0 flex items-center justify-center z-[9999]" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                        tabIndex="-1"
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setShowForm(false);
                        }}
                    >
                        <motion.div
                            drag
                            dragListener={false}
                            dragControls={dragControls}
                            dragMomentum={false}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="border-2 shadow-2xl"
                            style={{ backgroundColor: bgColor, borderColor: isDark ? '#007acc' : '#0078d4', width: '600px' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Title Bar */}
                            <div
                                className="px-3 py-2 flex justify-between items-center text-white cursor-move"
                                style={{ backgroundColor: isDark ? '#007acc' : '#0078d4' }}
                                onPointerDown={(e) => dragControls.start(e)}
                            >
                                <span className="font-semibold text-sm select-none">{isEditing ? 'Edit Transaction' : 'Add Transaction'}</span>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="hover:bg-white hover:bg-opacity-20 px-2 font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                                {/* Account Selector */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1" style={{ color: textColor }}>Account</label>
                                    <select
                                        value={formData.accountId}
                                        onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                                        className="w-full px-2 py-1 text-sm border"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#ffffff', color: textColor, borderColor }}
                                    >
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Transaction Type */}
                                <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: textColor }}>Transaction Type</label>
                                    <div className="flex gap-2">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={formData.type === 'expense'}
                                                onChange={() => setFormData({ ...formData, type: 'expense', category: EXPENSE_CATEGORIES[0], isSplit: false, splits: [] })}
                                            />
                                            <span className="text-sm" style={{ color: textColor }}>Expense</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={formData.type === 'income'}
                                                onChange={() => setFormData({ ...formData, type: 'income', category: INCOME_CATEGORIES[0], isSplit: false, splits: [] })}
                                            />
                                            <span className="text-sm" style={{ color: textColor }}>Income</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Amount & Currency */}
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold mb-1" style={{ color: textColor }}>Amount</label>
                                        <div className="flex gap-2">
                                            <SmartInput
                                                required
                                                autoFocus
                                                value={formData.originalAmount}
                                                onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                                                className="flex-1 px-2 py-1 text-sm border"
                                                style={{
                                                    backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                    color: textColor,
                                                    borderColor
                                                }}
                                            />
                                            <select
                                                value={formData.currency}
                                                onChange={(e) => handleCurrencyChange(e.target.value)}
                                                className="w-24 px-2 py-1 text-sm border"
                                                style={{
                                                    backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                    color: textColor,
                                                    borderColor
                                                }}
                                            >
                                                {CURRENCIES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.code}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Exchange Rate Info (Only if different from default) */}
                                {formData.currency !== defaultCurrency && (
                                    <div className="text-xs flex items-center gap-2 p-2 rounded border" style={{ backgroundColor: isDark ? '#252526' : '#f9f9f9', borderColor }}>
                                        <span style={{ color: textColor }}>
                                            Exchange Rate: 1 {formData.currency} = {formData.exchangeRate} {defaultCurrency}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPendingCurrency(formData.currency);
                                                setShowExchangeModal(true);
                                            }}
                                            className="text-blue-500 hover:underline ml-auto"
                                        >
                                            Edit Rate
                                        </button>
                                        <span className="font-bold ml-2" style={{ color: isDark ? '#4ec9b0' : '#008000' }}>
                                            ≈ {formatMoney(formData.originalAmount * formData.exchangeRate, defaultCurrency)}
                                        </span>
                                    </div>
                                )}

                                {/* Category & Split Toggle */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-semibold" style={{ color: textColor }}>Category</label>
                                        <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: textColor }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.isSplit}
                                                onChange={(e) => {
                                                    const isSplit = e.target.checked;
                                                    setFormData({
                                                        ...formData,
                                                        isSplit,
                                                        category: isSplit ? 'Split' : currentCategories[0],
                                                        splits: isSplit ? [{ category: currentCategories[0], amount: formData.originalAmount }] : []
                                                    });
                                                }}
                                            />
                                            Split Transaction
                                        </label>
                                    </div>

                                    {!formData.isSplit ? (
                                        <div className="relative" ref={categoryDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                                className="w-full px-2 py-1 text-sm border text-left flex justify-between items-center"
                                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#ffffff', color: textColor, borderColor }}
                                            >
                                                <span>{formData.category}</span>
                                                <span className="text-xs">▼</span>
                                            </button>

                                            {showCategoryDropdown && (
                                                <div className="absolute top-full left-0 w-[400px] z-50 border shadow-xl mt-1 max-h-60 overflow-y-auto"
                                                    style={{ backgroundColor: panelBg, borderColor }}>
                                                    {formData.type === 'income' ? (
                                                        <div className="p-2">
                                                            {INCOME_CATEGORIES.map(cat => (
                                                                <div
                                                                    key={cat}
                                                                    onClick={() => {
                                                                        setFormData({ ...formData, category: cat });
                                                                        setShowCategoryDropdown(false);
                                                                    }}
                                                                    className="px-2 py-1 cursor-pointer hover:bg-blue-600 hover:text-white rounded"
                                                                >
                                                                    {cat}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2 p-2">
                                                            <div>
                                                                <div className="text-xs font-bold mb-1 opacity-50 border-b pb-1">Default</div>
                                                                {EXPENSE_CATEGORIES.map(cat => (
                                                                    <div
                                                                        key={cat}
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, category: cat });
                                                                            setShowCategoryDropdown(false);
                                                                        }}
                                                                        className="px-2 py-1 cursor-pointer hover:bg-blue-600 hover:text-white rounded text-sm"
                                                                    >
                                                                        {cat}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold mb-1 opacity-50 border-b pb-1">Custom</div>
                                                                {customCategories.length === 0 && <div className="text-xs opacity-50 italic">No custom categories</div>}
                                                                {customCategories.map(cat => (
                                                                    <div
                                                                        key={cat}
                                                                        onClick={() => {
                                                                            setFormData({ ...formData, category: cat });
                                                                            setShowCategoryDropdown(false);
                                                                        }}
                                                                        className="px-2 py-1 cursor-pointer hover:bg-blue-600 hover:text-white rounded text-sm"
                                                                    >
                                                                        {cat}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Add Category Inline - spans both columns */}
                                                            <div className="col-span-2 border-t pt-2 mt-2" style={{ borderColor }}>
                                                                {!showAddCategory ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowAddCategory(true)}
                                                                        className="w-full px-2 py-1 text-sm text-left hover:bg-green-600 hover:text-white rounded flex items-center gap-2"
                                                                        style={{ color: '#10b981' }}
                                                                    >
                                                                        ➕ Add New Category
                                                                    </button>
                                                                ) : (
                                                                    <div className="flex gap-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Category name..."
                                                                            value={newCategoryInput}
                                                                            onChange={(e) => setNewCategoryInput(e.target.value)}
                                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                                                            className="flex-1 px-2 py-1 text-sm border rounded"
                                                                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                                                            autoFocus
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={handleAddCategory}
                                                                            className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                                                        >
                                                                            ✓
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setShowAddCategory(false); setNewCategoryInput(''); }}
                                                                            className="px-2 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="border p-2 rounded space-y-2" style={{ borderColor, backgroundColor: isDark ? '#252526' : '#f9f9f9' }}>
                                            {formData.splits.map((split, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <select
                                                        value={split.category}
                                                        onChange={(e) => {
                                                            const newSplits = [...formData.splits];
                                                            newSplits[index].category = e.target.value;
                                                            setFormData({ ...formData, splits: newSplits });
                                                        }}
                                                        className="flex-1 px-2 py-1 text-xs border"
                                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                                    >
                                                        {currentCategories.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={split.amount}
                                                        onChange={(e) => {
                                                            const newSplits = [...formData.splits];
                                                            newSplits[index].amount = e.target.value;
                                                            setFormData({ ...formData, splits: newSplits });
                                                        }}
                                                        className="w-24 px-2 py-1 text-xs border"
                                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newSplits = formData.splits.filter((_, i) => i !== index);
                                                            setFormData({ ...formData, splits: newSplits });
                                                        }}
                                                        className="text-red-500 font-bold px-1"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, splits: [...formData.splits, { category: currentCategories[0], amount: '' }] })}
                                                    className="text-xs text-blue-500 hover:underline"
                                                >
                                                    + Add Split
                                                </button>
                                                <span className={`text-xs font-bold ${Math.abs(formData.splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) - parseFloat(formData.originalAmount || 0)) < 0.01
                                                    ? 'text-green-500'
                                                    : 'text-red-500'
                                                    }`}>
                                                    Total: {formData.splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0).toFixed(2)} / {formData.originalAmount}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Description & Payee */}
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <label className="block text-sm font-semibold mb-1" style={{ color: textColor }}>Payee</label>
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            required
                                            autoFocus
                                            value={formData.payee}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setFormData({ ...formData, payee: val });
                                                if (val.length > 0) {
                                                    const matches = payees.filter(p => p.name.toLowerCase().includes(val.toLowerCase()));
                                                    setPayeeSuggestions(matches);
                                                    setShowPayeeSuggestions(true);
                                                } else {
                                                    setShowPayeeSuggestions(false);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (formData.payee) {
                                                    const matches = payees.filter(p => p.name.toLowerCase().includes(formData.payee.toLowerCase()));
                                                    setPayeeSuggestions(matches);
                                                    setShowPayeeSuggestions(true);
                                                }
                                            }}
                                            onBlur={() => setTimeout(() => setShowPayeeSuggestions(false), 200)}
                                            className="w-full px-2 py-1 text-sm border"
                                            style={{
                                                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                color: textColor,
                                                borderColor
                                            }}
                                            placeholder="e.g. Starbucks"
                                        />
                                        {showPayeeSuggestions && payeeSuggestions.length > 0 && (
                                            <div className="absolute z-10 w-full border shadow-lg max-h-40 overflow-y-auto" style={{ backgroundColor: panelBg, borderColor }}>
                                                {payeeSuggestions.map(p => (
                                                    <div
                                                        key={p.name}
                                                        className="px-2 py-1 text-xs cursor-pointer hover:bg-blue-600 hover:!text-white rounded"
                                                        style={{ color: textColor }}
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                payee: p.name,
                                                                category: p.lastCategory || formData.category
                                                            });
                                                            setShowPayeeSuggestions(false);
                                                        }}
                                                    >
                                                        <div className="font-bold">{p.name}</div>
                                                        <div className="opacity-70 text-[10px]">Used {p.count} times • {p.lastCategory}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold mb-1" style={{ color: textColor }}>Description</label>
                                        <input
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-2 py-1 text-sm border"
                                            style={{
                                                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                color: textColor,
                                                borderColor
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1" style={{ color: textColor }}>Tags (comma separated)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. #Malaysia, #Trip"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        className="w-full px-2 py-1 text-sm border"
                                        style={{
                                            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                            color: textColor,
                                            borderColor
                                        }}
                                    />
                                </div>


                                {/* Attachments */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1" style={{ color: textColor }}>
                                        Attachments
                                    </label>
                                    {formData.attachments && formData.attachments.length > 0 && (
                                        <div className="mb-2 space-y-1">
                                            {formData.attachments.map((att, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center justify-between p-2 border rounded"
                                                    style={{
                                                        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                        borderColor
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <span style={{ fontSize: '20px' }}>📎</span>
                                                        <span className="text-xs truncate" style={{ color: textColor }}>
                                                            {att.filename}
                                                        </span>
                                                        <span className="text-xs opacity-60" style={{ color: textColor }}>
                                                            ({(att.size / 1024).toFixed(1)} KB)
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newAttachments = formData.attachments.filter((_, i) => i !== index);
                                                            setFormData({ ...formData, attachments: newAttachments });
                                                        }}
                                                        className="px-2 py-1 text-xs border hover:bg-opacity-80"
                                                        style={{
                                                            backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                                            color: textColor,
                                                            borderColor
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const filePath = await DataAdapter.selectFile();
                                            if (filePath) {
                                                // Get file info
                                                const fileName = filePath.split(/[\\/]/).pop();
                                                // Create attachment metadata
                                                const attachment = {
                                                    id: Date.now().toString(),
                                                    filename: fileName,
                                                    path: filePath,
                                                    size: 0, // We'll get actual size from backend
                                                    uploadedAt: new Date().toISOString()
                                                };
                                                setFormData({
                                                    ...formData,
                                                    attachments: [...(formData.attachments || []), attachment]
                                                });
                                            }
                                        }}
                                        className="px-3 py-2 text-sm border hover:bg-opacity-90"
                                        style={{
                                            backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                            color: textColor,
                                            borderColor
                                        }}
                                    >
                                        📎 Add Receipt/Document
                                    </button>
                                </div>


                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-semibold mb-1" style={{ color: textColor }}>Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-2 py-1 text-sm border"
                                        style={{
                                            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                            color: textColor,
                                            borderColor
                                        }}
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-2 justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2 text-sm border"
                                        style={{
                                            backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                            color: textColor,
                                            borderColor: isDark ? '#555' : '#adadad'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm border font-semibold"
                                        style={{
                                            backgroundColor: isDark ? '#0e639c' : '#0078d4',
                                            color: '#ffffff',
                                            borderColor: isDark ? '#1177bb' : '#005a9e'
                                        }}
                                    >
                                        {isEditing ? 'Update' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowSaveTemplateModal(true)}
                                        className="px-4 py-2 text-sm border flex items-center gap-1"
                                        style={{
                                            backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                            color: textColor,
                                            borderColor: isDark ? '#555' : '#adadad'
                                        }}
                                    >
                                        <Save size={14} /> Save as Template
                                    </button>
                                </div>
                            </form >
                        </motion.div>
                    </div>
                )
            }

            {/* Template Selection Modal */}
            {
                showTemplateModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                        onClick={() => setShowTemplateModal(false)}
                    >
                        <div className="rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col"
                            style={{ backgroundColor: bgColor, borderColor: isDark ? '#007acc' : '#0078d4', border: '1px solid' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="p-3 border-b flex justify-between items-center" style={{ borderColor }}>
                                <h3 className="font-bold text-sm" style={{ color: textColor }}>Select Template</h3>
                                <button onClick={() => setShowTemplateModal(false)} className="hover:opacity-70">✕</button>
                            </div>
                            <div className="p-2 overflow-y-auto flex-1">
                                {templates.length === 0 ? (
                                    <div className="text-center py-8 opacity-50 text-xs" style={{ color: textColor }}>
                                        No templates found. Save a transaction as a template to see it here.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {templates.map(t => (
                                            <div key={t.id} className="p-2 border rounded flex justify-between items-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                                style={{ borderColor }}
                                                onClick={() => {
                                                    if (!showForm) handleAddNew(); // Open form if not open
                                                    handleApplyTemplate(t);
                                                }}
                                            >
                                                <div>
                                                    <div className="font-bold text-sm" style={{ color: textColor }}>{t.name}</div>
                                                    <div className="text-xs opacity-70" style={{ color: textColor }}>
                                                        {t.data.category} • {formatMoney(t.data.originalAmount, t.data.currency)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteTemplate(t.id);
                                                    }}
                                                    className="text-red-500 hover:bg-red-100 p-1 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Save Template Modal */}
            {
                showSaveTemplateModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-[70]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="rounded-lg shadow-xl w-80 p-4"
                            style={{ backgroundColor: bgColor, borderColor: isDark ? '#007acc' : '#0078d4', border: '1px solid' }}
                        >
                            <h3 className="font-bold mb-4" style={{ color: textColor }}>Save as Template</h3>
                            <input
                                type="text"
                                placeholder="Template Name"
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                                className="w-full px-3 py-2 border rounded mb-4 text-sm"
                                style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setShowSaveTemplateModal(false)}
                                    className="px-3 py-1 text-xs border rounded"
                                    style={{ color: textColor, borderColor }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveTemplate}
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Exchange Rate Modal */}
            {
                showExchangeModal && (
                    <div className="fixed inset-0 flex items-center justify-center z-[60]" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="border shadow-xl p-4 w-80" style={{ backgroundColor: bgColor, borderColor: isDark ? '#007acc' : '#0078d4' }}>
                            <h3 className="font-bold mb-4" style={{ color: textColor }}>Exchange Rate</h3>
                            <div className="mb-4">
                                <label className="block text-xs mb-1" style={{ color: textColor }}>
                                    1 {pendingCurrency} = ? {defaultCurrency}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    autoFocus
                                    value={formData.exchangeRate}
                                    onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                                    className="w-full px-2 py-1 border"
                                    style={{
                                        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                        color: textColor,
                                        borderColor
                                    }}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        // Confirm and set the pending currency
                                        if (pendingCurrency) {
                                            setFormData(prev => ({
                                                ...prev,
                                                currency: pendingCurrency
                                            }));
                                        }
                                        setShowExchangeModal(false);
                                        setPendingCurrency(null);
                                    }}
                                    className="px-3 py-1 text-xs border"
                                    style={{ backgroundColor: isDark ? '#3e3e42' : '#f0f0f0', color: textColor, borderColor }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Attachment Viewer Modal */}
            {
                showAttachmentViewer && viewingAttachments && (
                    <AttachmentViewer
                        attachments={viewingAttachments}
                        onClose={() => {
                            setShowAttachmentViewer(false);
                            setViewingAttachments(null);
                        }}
                        isDark={isDark}
                    />
                )
            }

            {/* Voice Input Modal */}
            {showVoiceInput && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="max-w-md w-full mx-4">
                        <VoiceInput
                            isDark={isDark}
                            onClose={() => setShowVoiceInput(false)}
                            onTransactionParsed={async (data) => {
                                // Create transaction from voice data
                                const newTransaction = {
                                    id: Date.now().toString(),
                                    amount: data.amount,
                                    type: data.type,
                                    category: data.category,
                                    description: data.description,
                                    date: new Date().toISOString().split('T')[0],
                                    payee: '',
                                    tags: 'voice-input',
                                    attachments: []
                                };

                                try {
                                    await DataAdapter.addTransaction(newTransaction);
                                    await loadTransactions();
                                    toast.success(`Voice transaction added: ${data.type === 'income' ? '+' : '-'}₹${data.amount}`);
                                    setShowVoiceInput(false);
                                } catch (error) {
                                    toast.error('Failed to save transaction');
                                    console.error(error);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div >
    );
};

export default Transactions;
