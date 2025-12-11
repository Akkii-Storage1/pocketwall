import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import TrialManager from '../utils/TrialManager';
import DataAdapter from '../utils/dataAdapter';
import LicenseManager from '../utils/LicenseManager';
import { auth, db } from '../utils/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const FeatureContext = createContext(null);

export const TIERS = {
    STARTER: 'starter',
    PRO: 'pro',
    ELITE: 'elite'
};

export const TIER_CONFIG = {
    [TIERS.STARTER]: {
        label: 'Starter Plan',
        limits: {
            maxAccounts: 2,
            maxBudgets: 5,
            maxRecurring: 2,
        },
        features: {
            exportPDF: false,
            aiInsights: false,
            privacyMode: false,
            investments: false,
            crypto: false,
            incognito: false,
            secureNotes: false
        }
    },
    [TIERS.PRO]: {
        label: 'Pro Plan',
        limits: {
            maxAccounts: -1,
            maxBudgets: -1,
            maxRecurring: -1,
        },
        features: {
            exportPDF: true,
            aiInsights: false,
            privacyMode: true,
            investments: true,
            crypto: true,
            incognito: false,
            secureNotes: true
        }
    },
    [TIERS.ELITE]: {
        label: 'Elite Plan',
        limits: {
            maxAccounts: -1,
            maxBudgets: -1,
            maxRecurring: -1,
        },
        features: {
            exportPDF: true,
            aiInsights: true,
            privacyMode: true,
            investments: true,
            crypto: true,
            incognito: true,
            secureNotes: true
        }
    }
};

export const FeatureProvider = ({ children }) => {
    const [currentTier, setCurrentTier] = useState(TIERS.STARTER);
    const [isTrial, setIsTrial] = useState(false);
    const [trialInfo, setTrialInfo] = useState({ remainingHours: 0, isActive: false });
    const [loading, setLoading] = useState(true);
    const [showCelebration, setShowCelebration] = useState(false);
    const [previousTier, setPreviousTier] = useState(null);

    // Check if plan was upgraded
    const checkPlanUpgrade = useCallback((newTier, oldTier) => {
        const tierOrder = { starter: 0, pro: 1, elite: 2 };
        if (oldTier && tierOrder[newTier] > tierOrder[oldTier]) {
            // Upgraded! Show celebration
            setShowCelebration(true);
            // Dispatch event for confetti
            window.dispatchEvent(new CustomEvent('plan-upgraded', { detail: { from: oldTier, to: newTier } }));
            // Auto-hide after 5 seconds
            setTimeout(() => setShowCelebration(false), 5000);
        }
    }, []);

    const checkStatus = async () => {
        try {
            // 1. Check for active license (Priority)
            const settings = await DataAdapter.getUserSettings();
            if (settings.licenseKey && settings.licenseTier) {
                const oldTier = currentTier;
                setCurrentTier(settings.licenseTier);
                setIsTrial(false);
                setLoading(false);

                // Check if upgraded
                if (previousTier && previousTier !== settings.licenseTier) {
                    checkPlanUpgrade(settings.licenseTier, previousTier);
                }
                setPreviousTier(settings.licenseTier);
                return;
            }

            // 2. Check Trial Status
            const status = await TrialManager.checkTrialStatus();
            setTrialInfo(status);

            if (status.isActive) {
                setIsTrial(true);
                setCurrentTier(TIERS.PRO); // Trial gives Pro access
                setPreviousTier(TIERS.PRO);
            } else {
                setIsTrial(false);
                setCurrentTier(TIERS.STARTER); // Fallback to Starter
                setPreviousTier(TIERS.STARTER);
            }
        } catch (error) {
            console.error('Feature context error:', error);
            setCurrentTier(TIERS.STARTER);
        } finally {
            setLoading(false);
        }
    };

    // Real-time listener for Firebase plan changes
    useEffect(() => {
        let unsubscribe = null;

        const setupListener = () => {
            if (auth.currentUser) {
                const userRef = doc(db, 'users', auth.currentUser.uid);

                unsubscribe = onSnapshot(userRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.data();

                        // Check if plan changed in Firebase
                        if (data.plan) {
                            const newTier = data.plan;
                            const isTrialActive = data.trialEnds && new Date(data.trialEnds) > new Date();

                            // If paid plan (not trial)
                            if (newTier === 'pro' || newTier === 'elite') {
                                if (!isTrialActive || data.isPaidPlan) {
                                    const oldTier = currentTier;
                                    setCurrentTier(newTier);
                                    setIsTrial(false);

                                    // Check for upgrade
                                    if (previousTier && previousTier !== newTier) {
                                        checkPlanUpgrade(newTier, previousTier);
                                    }
                                    setPreviousTier(newTier);

                                    // Also update local settings
                                    DataAdapter.updateUserSettings({
                                        licenseTier: newTier,
                                        licenseKey: data.licenseKey || 'firebase-synced'
                                    });
                                }
                            }
                        }
                    }
                }, (error) => {
                    console.error('Firebase listener error:', error);
                });
            }
        };

        // Listen for auth state changes
        const authUnsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setupListener();
            } else if (unsubscribe) {
                unsubscribe();
            }
        });

        // Initial check
        checkStatus();
        const interval = setInterval(checkStatus, 60000);

        return () => {
            if (unsubscribe) unsubscribe();
            authUnsubscribe();
            clearInterval(interval);
        };
    }, [previousTier, checkPlanUpgrade]);

    const hasFeature = (featureName) => {
        const config = TIER_CONFIG[currentTier];
        return config?.features?.[featureName] === true;
    };

    const checkLimit = (limitName, currentValue) => {
        const config = TIER_CONFIG[currentTier];
        const limit = config?.limits?.[limitName];

        if (limit === -1) return true; // Unlimited
        if (limit === undefined) return true; // No limit defined

        return currentValue < limit;
    };

    const getLimit = (limitName) => {
        return TIER_CONFIG[currentTier]?.limits?.[limitName];
    };

    // Feature Flags
    const [featureFlags, setFeatureFlags] = useState(() => {
        const saved = localStorage.getItem('feature_flags');
        const defaults = {
            'crypto_integration': true,
            'mutual_funds': true,
            'maintenance_mode': false,
            'beta_features': true
        };
        return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    });

    // OPTIONAL FEATURE SETTINGS - All OFF by default, user enables what they need
    const DEFAULT_OPTIONAL_FEATURES = {
        budgeting: {
            rollover: false,           // Carry unused budget to next month
            envelope: false,           // Envelope budgeting mode
            zeroBased: false,          // Zero-based budgeting mode
            period: 'monthly'          // 'weekly' | 'biweekly' | 'monthly'
        },
        goals: {
            autoDeposit: false,        // Auto-save % from income
            autoDepositPercent: 10     // Default percentage
        },
        transactions: {
            voiceInput: false          // Enable voice input (Pro)
        },
        exports: {
            hideBranding: false,       // Remove PocketWall logo (Pro)
            dateFormat: 'DD/MM/YYYY'   // Date format in exports
        }
    };

    const [optionalFeatures, setOptionalFeatures] = useState(() => {
        const saved = localStorage.getItem('pocketwall_optional_features');
        return saved ? { ...DEFAULT_OPTIONAL_FEATURES, ...JSON.parse(saved) } : DEFAULT_OPTIONAL_FEATURES;
    });

    // Save optional features to localStorage
    useEffect(() => {
        localStorage.setItem('pocketwall_optional_features', JSON.stringify(optionalFeatures));
    }, [optionalFeatures]);

    // Update optional feature
    const updateOptionalFeature = (category, key, value) => {
        setOptionalFeatures(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: value
            }
        }));
    };

    // Check if optional feature is enabled
    const isOptionalEnabled = (category, key) => {
        return optionalFeatures[category]?.[key] ?? false;
    };

    // Get optional feature value
    const getOptionalValue = (category, key) => {
        return optionalFeatures[category]?.[key];
    };

    // Reset optional features to defaults
    const resetOptionalFeatures = () => {
        setOptionalFeatures(DEFAULT_OPTIONAL_FEATURES);
    };

    // Feature descriptions for Settings UI
    // Features with requiredPlan need that tier to enable
    const OPTIONAL_FEATURE_INFO = {
        budgeting: {
            rollover: {
                label: 'Budget Rollover',
                description: 'Carry unused budget to next month automatically',
                icon: '🔄',
                requiredPlan: null  // Free for all
            },
            envelope: {
                label: 'Envelope Budgeting',
                description: 'Visual envelope-style budgets for each category',
                icon: '✉️',
                requiredPlan: null
            },
            zeroBased: {
                label: 'Zero-Based Budgeting',
                description: 'Allocate every rupee until budget equals zero',
                icon: '🎯',
                requiredPlan: null
            },
            period: {
                label: 'Budget Period',
                description: 'Set weekly, bi-weekly, or monthly budgets',
                icon: '📅',
                type: 'select',
                options: [
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'biweekly', label: 'Bi-Weekly' },
                    { value: 'monthly', label: 'Monthly' }
                ],
                requiredPlan: null
            }
        },
        goals: {
            autoDeposit: {
                label: 'Auto-Deposit from Income',
                description: 'Automatically save a percentage of income to goals',
                icon: '💰',
                requiredPlan: null
            },
            autoDepositPercent: {
                label: 'Auto-Deposit Percentage',
                description: 'Percentage of income to auto-save (1-50%)',
                icon: '%',
                type: 'number',
                min: 1,
                max: 50,
                requiredPlan: null,
                dependsOn: 'autoDeposit'  // Only show when autoDeposit is enabled
            }
        },
        transactions: {
            voiceInput: {
                label: 'Voice Input',
                description: 'Add transactions using voice commands',
                icon: '🎤',
                requiredPlan: 'pro'  // Pro feature
            }
        },
        exports: {
            hideBranding: {
                label: 'Hide PocketWall Branding',
                description: 'Remove logo from exported PDFs',
                icon: '🏷️',
                requiredPlan: 'pro'  // Pro feature - Free users always have branding
            },
            dateFormat: {
                label: 'Date Format',
                description: 'Date format for exports',
                icon: '📆',
                type: 'select',
                options: [
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Indian)' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' }
                ],
                requiredPlan: null
            }
        }
    };

    const updateFeatureFlag = (flag, value) => {
        const newFlags = { ...featureFlags, [flag]: value };
        setFeatureFlags(newFlags);
        localStorage.setItem('feature_flags', JSON.stringify(newFlags));
    };

    const upgradeTier = async (tier, licenseKey) => {
        const oldTier = currentTier;

        // Use LicenseManager to validate and activate
        const activatedTier = await LicenseManager.activateLicense(licenseKey);

        // Update local state
        setCurrentTier(activatedTier);
        setIsTrial(false);

        // Check for upgrade celebration
        checkPlanUpgrade(activatedTier, oldTier);
        setPreviousTier(activatedTier);

        // Refresh status to ensure everything is synced
        await checkStatus();
    };

    const resetTrial = async () => {
        await TrialManager.resetTrial();
        await checkStatus();
    };

    const dismissCelebration = () => {
        setShowCelebration(false);
    };

    return (
        <FeatureContext.Provider value={{
            tier: currentTier,
            config: TIER_CONFIG[currentTier],
            isTrial,
            trialInfo,
            loading,
            hasFeature,
            checkLimit,
            getLimit,
            upgradeTier,
            resetTrial,
            featureFlags,
            updateFeatureFlag,
            showCelebration,
            dismissCelebration,
            // Optional Features
            optionalFeatures,
            updateOptionalFeature,
            isOptionalEnabled,
            getOptionalValue,
            resetOptionalFeatures,
            OPTIONAL_FEATURE_INFO
        }}>
            {children}
        </FeatureContext.Provider>
    );
};

export const useFeature = () => {
    const context = useContext(FeatureContext);
    if (!context) {
        throw new Error('useFeature must be used within a FeatureProvider');
    }
    return context;
};
