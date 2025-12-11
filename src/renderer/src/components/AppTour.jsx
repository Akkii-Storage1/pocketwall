import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Interactive App Tour Component
 * Shows a step-by-step walkthrough for first-time users
 */

const TOUR_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to PocketWall! 🎉',
        content: 'Your all-in-one personal finance manager. Track expenses, manage budgets, and achieve your financial goals.',
        target: null, // Center overlay
        placement: 'center'
    },
    {
        id: 'dashboard',
        title: 'Dashboard Overview 📊',
        content: 'Get a quick snapshot of your finances: total balance, monthly spending, and recent transactions.',
        target: '.dashboard-cards',
        placement: 'bottom'
    },
    {
        id: 'add-transaction',
        title: 'Add Transactions 💰',
        content: 'Click here to log income and expenses. Support for multiple currencies and smart categorization!',
        target: '.add-transaction-btn',
        placement: 'bottom'
    },
    {
        id: 'budgets',
        title: 'Set Budgets 📈',
        content: 'Create monthly budgets for different categories to stay on track with your spending goals.',
        target: '[data-tour="budgets"]',
        placement: 'right'
    },
    {
        id: 'investments',
        title: 'Track Investments 💼',
        content: 'Monitor your stock portfolio with real-time prices and performance analytics.',
        target: '[data-tour="investments"]',
        placement: 'right'
    },
    {
        id: 'reports',
        title: 'View Reports 📑',
        content: 'Generate tax reports, spending insights, and export your data anytime.',
        target: '[data-tour="reports"]',
        placement: 'right'
    },
    {
        id: 'settings',
        title: 'Customize Settings ⚙️',
        content: 'Set your default currency, theme, and personalize PocketWall to your needs.',
        target: '[data-tour="settings"]',
        placement: 'right'
    },
    {
        id: 'complete',
        title: 'You\'re All Set! 🚀',
        content: 'Start adding your transactions or try our sample data to explore features. Happy budgeting!',
        target: null,
        placement: 'center'
    }
];

const STORAGE_KEY = 'pocketwall_tour_completed';

const AppTour = ({ isDark, onComplete }) => {
    const [isActive, setIsActive] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [highlightedElement, setHighlightedElement] = useState(null);

    useEffect(() => {
        // Check if tour has been completed
        const tourCompleted = localStorage.getItem(STORAGE_KEY);
        if (!tourCompleted) {
            // Show tour after a short delay
            setTimeout(() => setIsActive(true), 1000);
        }
    }, []);

    useEffect(() => {
        if (!isActive) return;

        const step = TOUR_STEPS[currentStep];
        if (step.target) {
            const element = document.querySelector(step.target);
            if (element) {
                setHighlightedElement(element);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            setHighlightedElement(null);
        }
    }, [currentStep, isActive]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeTour();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        completeTour();
    };

    const completeTour = () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsActive(false);
        setHighlightedElement(null);
        if (onComplete) onComplete();
    };

    if (!isActive) return null;

    const step = TOUR_STEPS[currentStep];
    const isCenter = step.placement === 'center';

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#555' : '#ddd';

    return (
        <AnimatePresence>
            {isActive && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            zIndex: 9998,
                            pointerEvents: 'none'
                        }}
                    />

                    {/* Highlight cutout for targeted element */}
                    {highlightedElement && (
                        <div
                            style={{
                                position: 'absolute',
                                border: `3px solid #4CAF50`,
                                borderRadius: '8px',
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                                pointerEvents: 'none',
                                zIndex: 9999,
                                top: highlightedElement.getBoundingClientRect().top - 4,
                                left: highlightedElement.getBoundingClientRect().left - 4,
                                width: highlightedElement.offsetWidth + 8,
                                height: highlightedElement.offsetHeight + 8,
                                transition: 'all 0.3s ease'
                            }}
                        />
                    )}

                    {/* Tour Card */}
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'fixed',
                            top: isCenter ? '50%' : 'auto',
                            left: isCenter ? '50%' : 'auto',
                            transform: isCenter ? 'translate(-50%, -50%)' : 'none',
                            backgroundColor: bgColor,
                            color: textColor,
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                            border: `1px solid ${borderColor}`,
                            zIndex: 10000,
                            ...getPositioning(highlightedElement, step.placement)
                        }}
                    >
                        {/* Progress Indicators */}
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                            {TOUR_STEPS.map((_, index) => (
                                <div
                                    key={index}
                                    style={{
                                        flex: 1,
                                        height: '3px',
                                        backgroundColor: index <= currentStep ? '#4CAF50' : borderColor,
                                        borderRadius: '2px',
                                        transition: 'background-color 0.3s'
                                    }}
                                />
                            ))}
                        </div>

                        {/* Content */}
                        <h3 style={{ margin: 0, fontSize: '20px', marginBottom: '12px', fontWeight: 600 }}>
                            {step.title}
                        </h3>
                        <p style={{ margin: 0, marginBottom: '20px', fontSize: '14px', lineHeight: '1.5', opacity: 0.9 }}>
                            {step.content}
                        </p>

                        {/* Navigation */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                onClick={handleSkip}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    color: textColor,
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    opacity: 0.7,
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = 1}
                                onMouseLeave={(e) => e.target.style.opacity = 0.7}
                            >
                                Skip Tour
                            </button>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                {currentStep > 0 && (
                                    <button
                                        onClick={handlePrevious}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: isDark ? '#3e3e42' : '#f0f0f0',
                                            color: textColor,
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 500
                                        }}
                                    >
                                        Previous
                                    </button>
                                )}
                                <button
                                    onClick={handleNext}
                                    style={{
                                        padding: '8px 20px',
                                        backgroundColor: '#4CAF50',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                                >
                                    {currentStep === TOUR_STEPS.length - 1 ? 'Get Started' : 'Next'}
                                </button>
                            </div>
                        </div>

                        {/* Step Counter */}
                        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>
                            Step {currentStep + 1} of {TOUR_STEPS.length}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

/**
 * Calculate positioning for tour card based on target element
 */
function getPositioning(element, placement) {
    if (!element) return {};

    const rect = element.getBoundingClientRect();
    const offset = 16;

    switch (placement) {
        case 'bottom':
            return {
                top: rect.bottom + offset,
                left: rect.left + rect.width / 2,
                transform: 'translateX(-50%)'
            };
        case 'top':
            return {
                bottom: window.innerHeight - rect.top + offset,
                left: rect.left + rect.width / 2,
                transform: 'translateX(-50%)'
            };
        case 'right':
            return {
                top: rect.top + rect.height / 2,
                left: rect.right + offset,
                transform: 'translateY(-50%)'
            };
        case 'left':
            return {
                top: rect.top + rect.height / 2,
                right: window.innerWidth - rect.left + offset,
                transform: 'translateY(-50%)'
            };
        default:
            return {};
    }
}

/**
 * Utility to reset tour (for testing)
 */
export function resetTour() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
}

export default AppTour;
