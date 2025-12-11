import React, { useState, useEffect, useCallback } from 'react';

const PinLock = ({ isDark, onUnlock, onSetPin, mode = 'unlock', onClose }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);
    const [step, setStep] = useState(mode === 'setup' ? 'create' : 'unlock');

    // Colors matching app theme
    const colors = {
        bg: isDark ? '#1e1e1e' : '#f0f0f0',
        panel: isDark ? '#252526' : '#ffffff',
        border: isDark ? '#3e3e42' : '#d4d4d4',
        text: isDark ? '#ffffff' : '#1a1a1a',
        textMuted: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
        keyBg: isDark ? '#2d2d30' : '#ffffff',
        keyHover: isDark ? '#3e3e42' : '#e5e7eb',
        keyBorder: isDark ? '#3e3e42' : '#d4d4d4',
        accent: '#0078d4',
        dotEmpty: isDark ? '#3e3e42' : '#d4d4d4',
        dotFilled: '#0078d4',
        error: '#ef4444'
    };

    // Clear error after 2s
    useEffect(() => {
        if (error) {
            setShake(true);
            const shakeTimer = setTimeout(() => setShake(false), 500);
            const errorTimer = setTimeout(() => setError(''), 2000);
            return () => {
                clearTimeout(shakeTimer);
                clearTimeout(errorTimer);
            };
        }
    }, [error]);

    // Keyboard input handler
    const handleKeyDown = useCallback((e) => {
        // Numbers 0-9
        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            handlePress(e.key);
        }
        // Backspace/Delete
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            handleDelete();
        }
        // Escape to cancel (in setup mode)
        if (e.key === 'Escape' && mode === 'setup' && onClose) {
            e.preventDefault();
            onClose();
        }
    }, [pin, step]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handlePress = (num) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);

            if (newPin.length === 4) {
                setTimeout(() => handleComplete(newPin), 150);
            }
        }
    };

    const handleDelete = () => {
        setPin(pin.slice(0, -1));
    };

    const handleComplete = (completedPin) => {
        if (step === 'unlock') {
            const storedPin = localStorage.getItem('pocketwall_pin');
            if (completedPin === storedPin) {
                onUnlock();
            } else {
                setError('Incorrect PIN');
                setPin('');
            }
        } else if (step === 'create') {
            setConfirmPin(completedPin);
            setPin('');
            setStep('confirm');
        } else if (step === 'confirm') {
            if (completedPin === confirmPin) {
                onSetPin(completedPin);
            } else {
                setError('PINs do not match');
                setPin('');
                setConfirmPin('');
                setStep('create');
            }
        }
    };

    const getTitle = () => {
        if (step === 'unlock') return 'Enter PIN';
        if (step === 'create') return 'Create PIN';
        if (step === 'confirm') return 'Confirm PIN';
    };

    const getSubtitle = () => {
        if (step === 'unlock') return 'Enter your 4-digit PIN to unlock';
        if (step === 'create') return 'Choose a 4-digit PIN';
        if (step === 'confirm') return 'Re-enter your PIN to confirm';
    };

    // Number pad layout
    const numPad = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        ['', 0, 'del']
    ];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{
                backgroundColor: colors.bg,
                fontFamily: '"Segoe UI", system-ui, sans-serif'
            }}
        >
            {/* Main Card */}
            <div
                className="w-full max-w-sm rounded-lg shadow-xl overflow-hidden"
                style={{
                    backgroundColor: colors.panel,
                    border: `1px solid ${colors.border}`
                }}
            >
                {/* Header */}
                <div
                    className="px-6 py-5 text-center"
                    style={{
                        borderBottom: `1px solid ${colors.border}`,
                        background: isDark
                            ? 'linear-gradient(180deg, #2d2d30 0%, #252526 100%)'
                            : 'linear-gradient(180deg, #f5f5f5 0%, #ffffff 100%)'
                    }}
                >
                    <div
                        className="w-14 h-14 mx-auto mb-3 rounded-xl flex items-center justify-center"
                        style={{
                            backgroundColor: colors.accent,
                            boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)'
                        }}
                    >
                        <span className="text-2xl">🔐</span>
                    </div>
                    <h2 className="text-xl font-semibold" style={{ color: colors.text }}>
                        {getTitle()}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                        {getSubtitle()}
                    </p>
                </div>

                {/* PIN Display */}
                <div className="px-6 py-6">
                    {/* Error Message */}
                    <div className="h-6 mb-4 text-center">
                        {error && (
                            <p className="text-sm font-medium animate-pulse" style={{ color: colors.error }}>
                                ⚠ {error}
                            </p>
                        )}
                    </div>

                    {/* PIN Dots */}
                    <div
                        className={`flex justify-center gap-4 mb-6 ${shake ? 'animate-shake' : ''}`}
                    >
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="w-4 h-4 rounded-full transition-all duration-200"
                                style={{
                                    backgroundColor: i < pin.length ? colors.dotFilled : colors.dotEmpty,
                                    transform: i < pin.length ? 'scale(1.2)' : 'scale(1)',
                                    boxShadow: i < pin.length ? '0 2px 8px rgba(0, 120, 212, 0.4)' : 'none'
                                }}
                            />
                        ))}
                    </div>

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-3">
                        {numPad.flat().map((key, index) => {
                            if (key === '') {
                                return <div key={index} className="h-14"></div>;
                            }

                            if (key === 'del') {
                                return (
                                    <button
                                        key={index}
                                        onClick={handleDelete}
                                        className="h-14 rounded-lg text-lg font-medium transition-all duration-150 flex items-center justify-center hover:opacity-80 active:scale-95"
                                        style={{
                                            backgroundColor: 'transparent',
                                            color: colors.textMuted
                                        }}
                                    >
                                        ⌫
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handlePress(key)}
                                    className="h-14 rounded-lg text-xl font-semibold transition-all duration-150 flex items-center justify-center hover:scale-105 active:scale-95"
                                    style={{
                                        backgroundColor: colors.keyBg,
                                        color: colors.text,
                                        border: `1px solid ${colors.keyBorder}`,
                                        boxShadow: isDark
                                            ? '0 2px 4px rgba(0,0,0,0.3)'
                                            : '0 2px 4px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    {key}
                                </button>
                            );
                        })}
                    </div>

                    {/* Keyboard Hint */}
                    <p
                        className="text-center text-xs mt-4"
                        style={{ color: colors.textMuted }}
                    >
                        💡 Use keyboard numbers 0-9
                    </p>
                </div>

                {/* Footer */}
                {mode === 'setup' && onClose && (
                    <div
                        className="px-6 py-3 text-center"
                        style={{
                            borderTop: `1px solid ${colors.border}`,
                            background: isDark ? '#2d2d30' : '#f5f5f5'
                        }}
                    >
                        <button
                            onClick={onClose}
                            className="text-sm font-medium hover:underline"
                            style={{ color: colors.accent }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Shake Animation */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                    20%, 40%, 60%, 80% { transform: translateX(4px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default PinLock;
