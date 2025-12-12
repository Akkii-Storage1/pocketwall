import React, { useState, useEffect } from 'react';
import { X, Check, SkipForward, AlertCircle, TrendingUp } from 'lucide-react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from './Toast';
import stockApi from '../utils/stockApi';

const SIPDueModal = ({ isOpen, onClose, dueSIPs, onUpdate, isDark, accounts = [] }) => {
    const toast = useToast();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentNAV, setCurrentNAV] = useState('');
    const [units, setUnits] = useState('');
    const [fetchingNAV, setFetchingNAV] = useState(false);

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#333' : '#e0e0e0';
    const cardBg = isDark ? '#252526' : '#f8f9fa';

    const currentSIP = dueSIPs[currentIndex];

    useEffect(() => {
        if (currentSIP && isOpen) {
            fetchCurrentPrice();
        }
    }, [currentIndex, isOpen]);

    const fetchCurrentPrice = async () => {
        if (!currentSIP) return;

        setFetchingNAV(true);
        try {
            let price = null;

            if (currentSIP.assetType === 'Mutual Fund') {
                const navData = await stockApi.fetchMutualFundNAV(currentSIP.symbol);
                if (navData && navData.nav) {
                    price = navData.nav;
                }
            } else {
                const priceData = await stockApi.fetchStockPrice(currentSIP.symbol, currentSIP.exchange);
                if (priceData && priceData.currentPrice) {
                    price = priceData.currentPrice;
                }
            }

            if (price) {
                setCurrentNAV(price.toString());
                setUnits((currentSIP.amount / price).toFixed(4));
            } else {
                setCurrentNAV('');
                setUnits('');
            }
        } catch (error) {
            console.error('Error fetching price:', error);
        } finally {
            setFetchingNAV(false);
        }
    };

    const handleNAVChange = (nav) => {
        setCurrentNAV(nav);
        const navNum = parseFloat(nav);
        if (navNum > 0 && currentSIP) {
            setUnits((currentSIP.amount / navNum).toFixed(4));
        }
    };

    const calculateNextDueDate = (sipDay) => {
        const today = new Date();
        const day = Math.min(Math.max(parseInt(sipDay) || 1, 1), 28);
        let nextDue = new Date(today.getFullYear(), today.getMonth() + 1, day);
        return nextDue.toISOString().split('T')[0];
    };

    const handleExecute = async () => {
        if (!currentNAV || !units) {
            toast.error('Please enter NAV and units');
            return;
        }

        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const nav = parseFloat(currentNAV);
            const qty = parseFloat(units);

            // 1. Add to investments
            await DataAdapter.addInvestment({
                symbol: currentSIP.symbol,
                name: currentSIP.name,
                quantity: qty,
                buyPrice: nav,
                amount: currentSIP.amount,
                date: today,
                exchange: currentSIP.exchange,
                assetClass: currentSIP.assetType,
                type: 'SIP',
                note: `SIP Installment #${(currentSIP.totalInstallments || 0) + 1}`
            });

            // 2. Deduct from bank if linked
            if (currentSIP.sourceAccount) {
                await DataAdapter.addTransaction({
                    date: today,
                    payee: `SIP: ${currentSIP.name}`,
                    amount: currentSIP.amount,
                    type: 'expense',
                    category: 'Investment',
                    account: currentSIP.sourceAccount,
                    note: `SIP installment for ${currentSIP.symbol}`
                });
            }

            // 3. Update SIP record
            await DataAdapter.updateSIP({
                ...currentSIP,
                skipCount: 0, // Reset skip on execute
                totalInstallments: (currentSIP.totalInstallments || 0) + 1,
                totalInvested: (currentSIP.totalInvested || 0) + currentSIP.amount,
                lastExecutedDate: today,
                nextDueDate: calculateNextDueDate(currentSIP.sipDay)
            });

            toast.success(`✅ SIP executed! ${qty.toFixed(4)} units added`);

            // Move to next SIP or close
            if (currentIndex < dueSIPs.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setCurrentNAV('');
                setUnits('');
            } else {
                onUpdate();
                onClose();
            }
        } catch (error) {
            console.error('Error executing SIP:', error);
            toast.error('Failed to execute SIP');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            const newSkipCount = (currentSIP.skipCount || 0) + 1;

            if (newSkipCount >= 3) {
                // Void the SIP after 3 consecutive skips
                await DataAdapter.updateSIP({
                    ...currentSIP,
                    status: 'voided',
                    skipCount: newSkipCount,
                    note: `${currentSIP.note || ''} | Auto-voided after 3 consecutive skips`
                });
                toast.warning('⚠️ SIP voided after 3 consecutive skips!');
            } else {
                // Just skip and move to next month
                await DataAdapter.updateSIP({
                    ...currentSIP,
                    skipCount: newSkipCount,
                    nextDueDate: calculateNextDueDate(currentSIP.sipDay)
                });
                toast.info(`SIP skipped. ${3 - newSkipCount} skip(s) remaining before void.`);
            }

            // Move to next SIP or close
            if (currentIndex < dueSIPs.length - 1) {
                setCurrentIndex(prev => prev + 1);
                setCurrentNAV('');
                setUnits('');
            } else {
                onUpdate();
                onClose();
            }
        } catch (error) {
            console.error('Error skipping SIP:', error);
            toast.error('Failed to skip SIP');
        } finally {
            setLoading(false);
        }
    };

    const handleRemindLater = () => {
        toast.info('SIP reminder dismissed. Will appear next time you open the app.');
        onClose();
    };

    if (!isOpen || !currentSIP) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: bgColor }}>

                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle size={24} />
                            <div>
                                <h2 className="font-bold text-lg">SIP Due Today!</h2>
                                <p className="text-xs opacity-80">
                                    {currentIndex + 1} of {dueSIPs.length} SIP{dueSIPs.length > 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleRemindLater} className="p-2 rounded-full hover:bg-white/20">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* SIP Details */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-2">
                            {currentSIP.assetType === 'Mutual Fund' ? '📊' :
                                currentSIP.assetType === 'Stock' ? '📈' :
                                    currentSIP.assetType === 'US_Stock' ? '🇺🇸' :
                                        currentSIP.assetType === 'Crypto' ? '₿' : '💰'}
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: textColor }}>{currentSIP.name}</h3>
                        <p className="text-sm opacity-60" style={{ color: textColor }}>{currentSIP.symbol} • {currentSIP.assetType}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: cardBg }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>SIP Amount</div>
                            <div className="text-2xl font-bold text-green-500">₹{currentSIP.amount.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: cardBg }}>
                            <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>Installment</div>
                            <div className="text-2xl font-bold" style={{ color: textColor }}>#{(currentSIP.totalInstallments || 0) + 1}</div>
                        </div>
                    </div>

                    {/* Skip Warning */}
                    {currentSIP.skipCount > 0 && (
                        <div className="mb-4 p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm">
                            ⚠️ You've skipped {currentSIP.skipCount}/3 times. One more skip will void this SIP.
                        </div>
                    )}

                    {/* NAV/Price Input */}
                    <div className="space-y-3 mb-6">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: textColor }}>
                                Current {currentSIP.assetType === 'Mutual Fund' ? 'NAV' : 'Price'} (₹)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={currentNAV}
                                    onChange={(e) => handleNAVChange(e.target.value)}
                                    placeholder={fetchingNAV ? 'Fetching...' : 'Enter NAV'}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                                />
                                {fetchingNAV && <span className="absolute right-3 top-2.5 text-xs opacity-50">...</span>}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: textColor }}>Units to Allot</label>
                            <input
                                type="number"
                                value={units}
                                onChange={(e) => setUnits(e.target.value)}
                                placeholder="Auto-calculated"
                                className="w-full px-3 py-2 border rounded-lg"
                                style={{ backgroundColor: cardBg, color: textColor, borderColor }}
                            />
                        </div>
                    </div>

                    {currentSIP.sourceAccount && (
                        <div className="text-xs text-center opacity-60 mb-4" style={{ color: textColor }}>
                            💳 Will deduct from: {currentSIP.sourceAccount}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <button
                            onClick={handleExecute}
                            disabled={loading || !currentNAV}
                            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Check size={18} /> {loading ? 'Processing...' : 'Execute SIP'}
                        </button>
                        <button
                            onClick={handleSkip}
                            disabled={loading}
                            className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <SkipForward size={18} /> Skip This Month
                        </button>
                        <button
                            onClick={handleRemindLater}
                            className="w-full py-2 text-sm opacity-60 hover:opacity-100"
                            style={{ color: textColor }}
                        >
                            Remind Me Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SIPDueModal;
