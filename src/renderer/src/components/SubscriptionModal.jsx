import React, { useState } from 'react';
import { useFeature, TIERS, TIER_CONFIG } from '../context/FeatureContext';
import { useToast } from './Toast';

const SubscriptionModal = ({ onClose, isDark }) => {
    const { tier, isTrial, trialInfo } = useFeature();
    const toast = useToast();
    const [loading, setLoading] = useState(false);

    // Open website for payment
    const handleUpgrade = async (targetTier) => {
        setLoading(true);
        try {
            // Open website in default browser for payment
            const paymentUrl = 'https://pocketwall.web.app/signup'; // or your actual payment URL

            // In Electron, use shell.openExternal
            if (window.electron && window.electron.shell) {
                window.electron.shell.openExternal(paymentUrl);
            } else {
                // Fallback for web
                window.open(paymentUrl, '_blank');
            }

            toast.success('Opening payment page in browser...');
            onClose();
        } catch (error) {
            toast.error('Failed to open payment page');
        } finally {
            setLoading(false);
        }
    };

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const cardBg = isDark ? '#252526' : '#f8f9fa';
    const borderColor = isDark ? '#3e3e42' : '#e9ecef';

    const plans = [
        {
            id: 'free',
            name: 'Starter',
            price: 'Free',
            period: 'forever',
            features: [
                'Up to 3 Accounts',
                '5 Budget Categories',
                'Basic Expense Tracking',
                'Financial Goals',
                'Recurring Bills',
                'Local Data Storage'
            ],
            notIncluded: ['Investments', 'Portfolio', 'Cloud Sync']
        },
        {
            id: TIERS.PRO,
            name: 'Pro',
            price: '$4.99',
            altPrice: '₹199',
            period: '/month',
            yearlyPrice: '$49/year',
            popular: true,
            features: [
                'Everything in Starter',
                'Unlimited Accounts',
                'Investment Portfolio',
                'Real-time Stock Prices',
                'Mutual Fund Tracking',
                'Fixed Assets',
                'Debt & Loan Tracking',
                'Cloud Sync (Coming Soon)',
                'PDF Reports',
                'Priority Support'
            ],
            notIncluded: []
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
                {/* Header */}
                <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-violet-600/20 to-cyan-600/20" style={{ borderColor }}>
                    <div>
                        <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
                        <p className="opacity-70">Unlock the full potential of PocketWall</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                        ✕
                    </button>
                </div>

                {/* Trial Banner */}
                {isTrial && (
                    <div className="px-6 py-3 bg-orange-500/20 border-b border-orange-500/30">
                        <p className="text-orange-400 text-sm">
                            ⏱️ <strong>Trial Active:</strong> {Math.ceil(trialInfo.remainingHours / 24)} days remaining. Upgrade now to keep Pro features!
                        </p>
                    </div>
                )}

                {/* Plans Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {plans.map((plan) => {
                            const isCurrent = tier === plan.id || (tier === TIERS.STARTER && plan.id === 'free');
                            const isPro = plan.id === TIERS.PRO;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative border rounded-xl p-6 flex flex-col ${isPro ? 'ring-2 ring-violet-500' : ''}`}
                                    style={{
                                        backgroundColor: cardBg,
                                        borderColor: isPro ? '#8b5cf6' : borderColor
                                    }}
                                >
                                    {isPro && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                                            RECOMMENDED
                                        </div>
                                    )}

                                    {isCurrent && !isPro && (
                                        <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                                            CURRENT
                                        </div>
                                    )}

                                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                    <div className="mb-4">
                                        <span className="text-3xl font-bold">{plan.price}</span>
                                        <span className="opacity-60">{plan.period}</span>
                                        {plan.altPrice && (
                                            <span className="block text-sm opacity-50">({plan.altPrice}{plan.period})</span>
                                        )}
                                    </div>

                                    {plan.yearlyPrice && (
                                        <div className="mb-4 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                                            💰 Save 17%: {plan.yearlyPrice}
                                        </div>
                                    )}

                                    <ul className="space-y-2 mb-6 flex-1">
                                        {plan.features.map((feat, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <span className="text-green-500">✓</span>
                                                <span className="opacity-80">{feat}</span>
                                            </li>
                                        ))}
                                        {plan.notIncluded.map((feat, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm opacity-40">
                                                <span className="text-gray-500">✕</span>
                                                <span>{feat}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => isPro && handleUpgrade(plan.id)}
                                        disabled={!isPro || loading}
                                        className={`w-full py-3 rounded-xl font-bold transition-all ${isPro
                                            ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90'
                                            : 'bg-white/10 opacity-50 cursor-not-allowed'
                                            } ${loading ? 'opacity-50' : ''}`}
                                    >
                                        {loading ? 'Opening...' : (isPro ? '⭐ Upgrade Now' : 'Current Plan')}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t text-center text-xs opacity-50" style={{ borderColor }}>
                    🔒 Secure payment via Stripe • Cancel anytime • 7-day money back guarantee
                </div>
            </div>
        </div>
    );
};

export default SubscriptionModal;
