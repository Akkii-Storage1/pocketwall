import React, { useState, useEffect } from 'react';
import { X, Plus, TrendingUp, AlertCircle, Check, SkipForward, Pause, Play, Trash2 } from 'lucide-react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from './Toast';
import stockApi from '../utils/stockApi';

// Asset type configurations
const ASSET_TYPES = [
    { id: 'Mutual Fund', label: '📊 Mutual Fund', exchange: 'MF' },
    { id: 'Stock', label: '📈 Stock (India)', exchange: 'NSE' },
    { id: 'US_Stock', label: '🇺🇸 US Stock', exchange: 'US' },
    { id: 'Crypto', label: '₿ Crypto', exchange: 'Crypto' },
    { id: 'Gold', label: '🥇 Gold/Commodity', exchange: 'Commodity' },
    { id: 'ETF', label: '📋 ETF', exchange: 'NSE' }
];

const SIPManager = ({ isOpen, onClose, isDark, currency, accounts = [] }) => {
    const toast = useToast();
    const [sips, setSips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingSIP, setEditingSIP] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        assetType: 'Mutual Fund',
        symbol: '',
        name: '',
        exchange: 'MF',
        amount: '',
        sipDay: '5',
        startDate: new Date().toISOString().split('T')[0],
        sourceAccount: '',
        note: ''
    });

    // Search state for MF/Stock selection
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const cardBg = isDark ? '#2d2d30' : '#f8f9fa';

    useEffect(() => {
        if (isOpen) loadSIPs();
    }, [isOpen]);

    const loadSIPs = async () => {
        setLoading(true);
        try {
            const data = await DataAdapter.getSIPs();
            setSips(data);
        } catch (error) {
            console.error('Error loading SIPs:', error);
            toast.error('Failed to load SIPs');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            let results = [];
            if (formData.assetType === 'Mutual Fund') {
                results = await stockApi.searchMutualFund(term);
            } else if (['Stock', 'US_Stock', 'ETF'].includes(formData.assetType)) {
                results = await stockApi.searchStock(term);
                // Filter by exchange
                if (formData.assetType === 'US_Stock') {
                    results = results.filter(r => ['US', 'NASDAQ', 'NYSE'].includes(r.exchange));
                } else {
                    results = results.filter(r => ['NSE', 'BSE'].includes(r.exchange));
                }
            }
            setSearchResults(results.slice(0, 8));
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectAsset = (asset) => {
        setFormData(prev => ({
            ...prev,
            symbol: asset.code || asset.symbol,
            name: asset.name || asset.description,
            exchange: asset.exchange || prev.exchange
        }));
        setSearchTerm(asset.name || asset.description);
        setSearchResults([]);
    };

    const handleAssetTypeChange = (type) => {
        const config = ASSET_TYPES.find(a => a.id === type);
        setFormData(prev => ({
            ...prev,
            assetType: type,
            exchange: config?.exchange || 'MF',
            symbol: '',
            name: ''
        }));
        setSearchTerm('');
        setSearchResults([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.symbol || !formData.amount) {
            toast.error('Please fill all required fields');
            return;
        }

        const sipData = {
            ...formData,
            amount: parseFloat(formData.amount),
            sipDay: parseInt(formData.sipDay) || 5
        };

        try {
            if (editingSIP) {
                await DataAdapter.updateSIP({ ...sipData, id: editingSIP.id });
                toast.success('SIP updated successfully');
            } else {
                await DataAdapter.addSIP(sipData);
                toast.success('SIP created successfully! 🎉');
            }

            resetForm();
            loadSIPs();
        } catch (error) {
            console.error('Error saving SIP:', error);
            toast.error('Failed to save SIP');
        }
    };

    const resetForm = () => {
        setFormData({
            assetType: 'Mutual Fund',
            symbol: '',
            name: '',
            exchange: 'MF',
            amount: '',
            sipDay: '5',
            startDate: new Date().toISOString().split('T')[0],
            sourceAccount: '',
            note: ''
        });
        setSearchTerm('');
        setShowForm(false);
        setEditingSIP(null);
    };

    const handleEdit = (sip) => {
        setFormData({
            assetType: sip.assetType,
            symbol: sip.symbol,
            name: sip.name,
            exchange: sip.exchange,
            amount: sip.amount.toString(),
            sipDay: sip.sipDay.toString(),
            startDate: sip.startDate,
            sourceAccount: sip.sourceAccount || '',
            note: sip.note || ''
        });
        setSearchTerm(sip.name);
        setEditingSIP(sip);
        setShowForm(true);
    };

    const handleDelete = async (sipId) => {
        if (!confirm('Are you sure you want to delete this SIP?')) return;

        try {
            await DataAdapter.deleteSIP(sipId);
            toast.success('SIP deleted');
            loadSIPs();
        } catch (error) {
            toast.error('Failed to delete SIP');
        }
    };

    const handleTogglePause = async (sip) => {
        const newStatus = sip.status === 'active' ? 'paused' : 'active';
        try {
            await DataAdapter.updateSIP({ ...sip, status: newStatus });
            toast.success(newStatus === 'paused' ? 'SIP paused' : 'SIP resumed');
            loadSIPs();
        } catch (error) {
            toast.error('Failed to update SIP');
        }
    };

    const getDueSIPs = () => sips.filter(s => {
        if (s.status !== 'active') return false;
        const today = new Date().toISOString().split('T')[0];
        return s.nextDueDate && s.nextDueDate <= today;
    });

    const getActiveSIPs = () => sips.filter(s => s.status === 'active');
    const getPausedSIPs = () => sips.filter(s => s.status === 'paused');
    const getVoidedSIPs = () => sips.filter(s => s.status === 'voided');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="w-full max-w-3xl h-[85vh] rounded border shadow-lg flex flex-col overflow-hidden" style={{ backgroundColor: bgColor, borderColor }}>

                {/* Header */}
                <div className="p-3 border-b flex justify-between items-center" style={{ borderColor }}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🔄</span>
                        <div>
                            <h2 className="text-lg font-semibold" style={{ color: textColor }}>SIP Manager</h2>
                            <p className="text-xs opacity-50" style={{ color: textColor }}>Systematic Investment Plans</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { resetForm(); setShowForm(true); }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded"
                            style={{ backgroundColor: '#107c10' }}
                        >
                            + New SIP
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10">
                            <X size={18} style={{ color: textColor }} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-8 opacity-50" style={{ color: textColor }}>Loading...</div>
                    ) : showForm ? (
                        /* SIP Creation Form */
                        <div className="max-w-xl mx-auto">
                            <h3 className="text-lg font-bold mb-4" style={{ color: textColor }}>
                                {editingSIP ? 'Edit SIP' : 'Create New SIP'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Asset Type */}
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>Asset Type</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {ASSET_TYPES.map(type => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => handleAssetTypeChange(type.id)}
                                                className={`p-2 text-xs rounded border transition-all ${formData.assetType === type.id ? 'bg-blue-500 text-white border-blue-500' : 'hover:border-blue-400'}`}
                                                style={{ borderColor: formData.assetType === type.id ? undefined : borderColor, color: formData.assetType === type.id ? '#fff' : textColor }}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Asset Search */}
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>
                                        {formData.assetType === 'Mutual Fund' ? 'Fund Name' : 'Stock Symbol'} *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            placeholder={formData.assetType === 'Mutual Fund' ? 'Search fund...' : 'Search stock...'}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                                        />
                                        {searching && <span className="absolute right-3 top-2.5 text-xs opacity-50">...</span>}

                                        {searchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border rounded-lg shadow-lg" style={{ backgroundColor: cardBg, borderColor }}>
                                                {searchResults.map((r, i) => (
                                                    <div
                                                        key={i}
                                                        className="p-2 text-sm cursor-pointer hover:bg-blue-500 hover:text-white border-b last:border-0"
                                                        style={{ borderColor }}
                                                        onClick={() => handleSelectAsset(r)}
                                                    >
                                                        <div className="font-medium">{r.name || r.description}</div>
                                                        <div className="text-xs opacity-70">{r.code || r.symbol} • {r.exchange}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {formData.symbol && (
                                        <div className="text-xs text-green-500 mt-1">Selected: {formData.symbol}</div>
                                    )}
                                </div>

                                {/* Amount & Day */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>Monthly Amount (₹) *</label>
                                        <input
                                            type="number"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="5000"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                                            min="100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>SIP Day (1-28)</label>
                                        <input
                                            type="number"
                                            value={formData.sipDay}
                                            onChange={(e) => setFormData({ ...formData, sipDay: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                                            min="1"
                                            max="28"
                                        />
                                    </div>
                                </div>

                                {/* Start Date & Bank */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>Source Account</label>
                                        <select
                                            value={formData.sourceAccount}
                                            onChange={(e) => setFormData({ ...formData, sourceAccount: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                            style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                                        >
                                            <option value="">Select Account</option>
                                            {accounts.map(acc => (
                                                <option key={acc.id || acc.name} value={acc.name}>{acc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Note */}
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: textColor }}>Note (optional)</label>
                                    <input
                                        type="text"
                                        value={formData.note}
                                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                        placeholder="Any additional notes..."
                                        className="w-full px-3 py-2 border rounded-lg"
                                        style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                                    />
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        {editingSIP ? 'Update SIP' : 'Create SIP'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-6 py-3 border rounded-lg"
                                        style={{ borderColor, color: textColor }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* SIP List View */
                        <div className="space-y-6">
                            {/* Due Today Section */}
                            {getDueSIPs().length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase opacity-70 mb-3 flex items-center gap-2" style={{ color: textColor }}>
                                        <AlertCircle size={16} className="text-orange-500" /> Due Today ({getDueSIPs().length})
                                    </h3>
                                    <div className="space-y-2">
                                        {getDueSIPs().map(sip => (
                                            <SIPCard key={sip.id} sip={sip} isDark={isDark} textColor={textColor} borderColor={borderColor} cardBg={cardBg} onEdit={handleEdit} onDelete={handleDelete} onTogglePause={handleTogglePause} isDue />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Active SIPs */}
                            {getActiveSIPs().length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase opacity-70 mb-3" style={{ color: textColor }}>
                                        ✅ Active SIPs ({getActiveSIPs().length})
                                    </h3>
                                    <div className="space-y-2">
                                        {getActiveSIPs().filter(s => !getDueSIPs().includes(s)).map(sip => (
                                            <SIPCard key={sip.id} sip={sip} isDark={isDark} textColor={textColor} borderColor={borderColor} cardBg={cardBg} onEdit={handleEdit} onDelete={handleDelete} onTogglePause={handleTogglePause} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Paused SIPs */}
                            {getPausedSIPs().length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold uppercase opacity-70 mb-3" style={{ color: textColor }}>
                                        ⏸️ Paused SIPs ({getPausedSIPs().length})
                                    </h3>
                                    <div className="space-y-2">
                                        {getPausedSIPs().map(sip => (
                                            <SIPCard key={sip.id} sip={sip} isDark={isDark} textColor={textColor} borderColor={borderColor} cardBg={cardBg} onEdit={handleEdit} onDelete={handleDelete} onTogglePause={handleTogglePause} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {sips.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📊</div>
                                    <h3 className="text-xl font-bold mb-2" style={{ color: textColor }}>No SIPs Yet</h3>
                                    <p className="opacity-60 mb-6" style={{ color: textColor }}>Start your wealth building journey with a Systematic Investment Plan</p>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        Create Your First SIP
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Summary Footer */}
                {sips.length > 0 && !showForm && (
                    <div className="p-4 border-t grid grid-cols-3 gap-4 text-center" style={{ borderColor, backgroundColor: cardBg }}>
                        <div>
                            <div className="text-xs opacity-60" style={{ color: textColor }}>Monthly Commitment</div>
                            <div className="text-xl font-bold text-blue-500">
                                ₹{getActiveSIPs().reduce((sum, s) => sum + s.amount, 0).toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs opacity-60" style={{ color: textColor }}>Total Invested</div>
                            <div className="text-xl font-bold text-green-500">
                                ₹{sips.reduce((sum, s) => sum + (s.totalInvested || 0), 0).toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs opacity-60" style={{ color: textColor }}>Installments</div>
                            <div className="text-xl font-bold" style={{ color: textColor }}>
                                {sips.reduce((sum, s) => sum + (s.totalInstallments || 0), 0)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// SIP Card Component
const SIPCard = ({ sip, isDark, textColor, borderColor, cardBg, onEdit, onDelete, onTogglePause, isDue }) => {
    const getAssetEmoji = () => {
        switch (sip.assetType) {
            case 'Mutual Fund': return '📊';
            case 'Stock': return '📈';
            case 'US_Stock': return '🇺🇸';
            case 'Crypto': return '₿';
            case 'Gold': return '🥇';
            case 'ETF': return '📋';
            default: return '💰';
        }
    };

    return (
        <div
            className={`p-4 rounded-lg border flex items-center justify-between ${isDue ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : ''}`}
            style={{ backgroundColor: isDue ? undefined : cardBg, borderColor: isDue ? undefined : borderColor }}
        >
            <div className="flex items-center gap-4">
                <div className="text-2xl">{getAssetEmoji()}</div>
                <div>
                    <div className="font-bold" style={{ color: textColor }}>{sip.name}</div>
                    <div className="text-xs opacity-60" style={{ color: textColor }}>
                        {sip.symbol} • {sip.sipDay}th of every month • {sip.sourceAccount || 'No bank linked'}
                    </div>
                    {sip.skipCount > 0 && (
                        <div className="text-xs text-orange-500 mt-1">
                            ⚠️ {sip.skipCount}/3 skips (voided at 3)
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <div className="font-bold text-lg text-green-500">₹{sip.amount.toLocaleString()}</div>
                    <div className="text-xs opacity-60" style={{ color: textColor }}>
                        Next: {sip.nextDueDate}
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => onTogglePause(sip)}
                        className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10"
                        title={sip.status === 'active' ? 'Pause SIP' : 'Resume SIP'}
                    >
                        {sip.status === 'active' ? <Pause size={16} style={{ color: textColor }} /> : <Play size={16} className="text-green-500" />}
                    </button>
                    <button
                        onClick={() => onEdit(sip)}
                        className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10"
                        title="Edit SIP"
                    >
                        <span className="text-blue-500 text-sm">Edit</span>
                    </button>
                    <button
                        onClick={() => onDelete(sip.id)}
                        className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                        title="Delete SIP"
                    >
                        <Trash2 size={16} className="text-red-500" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SIPManager;
