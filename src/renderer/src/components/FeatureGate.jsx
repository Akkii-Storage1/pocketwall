import React from 'react';
import { useFeature, TIERS } from '../context/FeatureContext';

const FeatureGate = ({ feature, children, fallback = null, showLock = true }) => {
    const { hasFeature, tier, isTrial, config } = useFeature();

    // Allow access if has feature OR is in trial period
    if (hasFeature(feature) || isTrial) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    if (!showLock) {
        return null;
    }

    return (
        <div className="relative overflow-hidden rounded-lg">
            {/* Blurred Content Preview */}
            <div className="filter blur-sm opacity-50 pointer-events-none select-none" aria-hidden="true">
                {children}
            </div>

            {/* Lock Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                    Pro Feature
                </h3>
                <p className="text-gray-300 mb-4 max-w-xs">
                    Upgrade to <b className="text-yellow-400">Pro</b> to unlock {getFeatureName(feature)}.
                </p>
                <div className="text-sm text-gray-500 mb-4">
                    Current: {config?.label || 'Starter Plan'}
                </div>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-subscription-modal'))}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all transform hover:scale-105"
                >
                    ⭐ Upgrade Now
                </button>
                <p className="mt-3 text-xs text-gray-500">7-day money back guarantee</p>
            </div>
        </div>
    );
};

// Helper function to get readable feature names
const getFeatureName = (feature) => {
    const names = {
        investments: 'Investment Tracking',
        crypto: 'Crypto Portfolio',
        aiInsights: 'AI-Powered Insights',
        exportPDF: 'PDF Reports',
        privacyMode: 'Privacy Mode',
        incognito: 'Incognito Mode',
        secureNotes: 'Secure Notes',
        assets: 'Fixed Assets Management',
        loans: 'Debt & Loan Tracking',
        charity: 'Charity Tracking'
    };
    return names[feature] || feature.replace(/([A-Z])/g, ' $1').toLowerCase();
};

/**
 * LimitGate - Shows warning when approaching limits
 */
export const LimitGate = ({ limit, currentCount, children, itemName = 'items' }) => {
    const { checkLimit, getLimit, config } = useFeature();

    const maxLimit = getLimit(limit);
    const canAdd = checkLimit(limit, currentCount);
    const isNearLimit = maxLimit !== -1 && currentCount >= maxLimit - 1;

    return (
        <div>
            {children}

            {isNearLimit && maxLimit !== -1 && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-500 text-sm">
                        ⚠️ Using {currentCount}/{maxLimit} {itemName}.
                        <button
                            className="ml-2 underline hover:text-yellow-400"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-subscription-modal'))}
                        >
                            Upgrade for unlimited
                        </button>
                    </p>
                </div>
            )}

            {!canAdd && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-500 text-sm">
                        🚫 Limit reached ({maxLimit} {itemName}).
                        <button
                            className="ml-2 underline hover:text-red-400"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-subscription-modal'))}
                        >
                            Upgrade to add more
                        </button>
                    </p>
                </div>
            )}
        </div>
    );
};

/**
 * TrialBanner - Shows trial status at top
 */
export const TrialBanner = ({ isDark = true }) => {
    const { isTrial, trialInfo, config } = useFeature();

    if (!isTrial) return null;

    const daysLeft = Math.ceil(trialInfo.remainingHours / 24);
    const hoursLeft = Math.round(trialInfo.remainingHours);
    const isUrgent = daysLeft <= 2;

    return (
        <div className={`px-4 py-2 ${isUrgent ? 'bg-red-500/20 border-b border-red-500/30' : 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-b border-orange-500/30'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xl">{isUrgent ? '🔥' : '⏱️'}</span>
                    <div>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {isUrgent ? 'Trial ending soon!' : 'Trial Active'}: {daysLeft > 1 ? `${daysLeft} days` : `${hoursLeft} hours`} left
                        </p>
                        <p className={`text-xs ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
                            Enjoying Pro features? Upgrade to keep them!
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-subscription-modal'))}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-lg hover:opacity-90 transition-all text-sm"
                >
                    Upgrade Now
                </button>
            </div>
        </div>
    );
};

/**
 * TrialExpiredOverlay - Full screen overlay when trial ends
 */
export const TrialExpiredOverlay = ({ isDark = true }) => {
    const { isTrial, trialInfo, tier } = useFeature();

    // Only show if trial has expired (not active) and user is on starter
    if (isTrial || tier !== 'starter') return null;

    // Check if user ever had a trial
    const hadTrial = localStorage.getItem('trial_started');
    if (!hadTrial) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="max-w-md text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">
                    Trial Expired
                </h2>
                <p className="text-gray-400 mb-6">
                    Your 7-day Pro trial has ended. Upgrade now to continue using all Pro features, or continue with the free Starter plan.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-subscription-modal'))}
                        className="w-full py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-all"
                    >
                        ⭐ Upgrade to Pro
                    </button>
                    <button
                        onClick={() => {
                            localStorage.setItem('trial_dismissed', 'true');
                            window.location.reload();
                        }}
                        className="w-full py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all"
                    >
                        Continue with Starter (Limited Features)
                    </button>
                </div>

                <p className="mt-6 text-xs text-gray-500">
                    Pro: $4.99/month • Cancel anytime
                </p>
            </div>
        </div>
    );
};

export default FeatureGate;
