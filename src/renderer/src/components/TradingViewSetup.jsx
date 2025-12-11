import React, { useState } from 'react';

/**
 * TradingView Setup Modal
 * Smooth onboarding for premium charts experience
 */
const TradingViewSetup = ({ isOpen, onComplete, onSkip, isDark }) => {
    const [mode, setMode] = useState('choose');

    const colors = {
        bg: isDark ? '#1e222d' : '#ffffff',
        card: isDark ? '#2a2e39' : '#f8f9fa',
        text: isDark ? '#d1d4dc' : '#131722',
        subtext: isDark ? '#787b86' : '#6b7280',
        border: isDark ? '#363a45' : '#e5e7eb',
        accent: '#2962ff',
        green: '#26a69a',
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        }}>
            {mode === 'choose' && (
                <div style={{
                    width: '420px', backgroundColor: colors.bg, borderRadius: '16px',
                    overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                }}>
                    <div style={{ padding: '28px 28px 20px', textAlign: 'center', borderBottom: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📈</div>
                        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: colors.text, marginBottom: '8px' }}>
                            Premium Charts
                        </h2>
                        <p style={{ margin: 0, fontSize: '14px', color: colors.subtext, lineHeight: 1.5 }}>
                            Get professional TradingView charts with<br />50+ indicators & drawing tools
                        </p>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <button onClick={() => setMode('login')} style={{
                            width: '100%', padding: '16px 20px', marginBottom: '12px',
                            borderRadius: '12px', border: `2px solid ${colors.accent}`,
                            backgroundColor: colors.accent, color: '#fff',
                            fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                        }}>
                            🔑 I have a TradingView account
                        </button>

                        <button onClick={() => setMode('signup')} style={{
                            width: '100%', padding: '16px 20px', marginBottom: '12px',
                            borderRadius: '12px', border: `2px solid ${colors.green}`,
                            backgroundColor: 'transparent', color: colors.green,
                            fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                        }}>
                            ✨ Create Free Account (30 sec)
                        </button>

                        <button onClick={onSkip} style={{
                            width: '100%', padding: '14px 20px',
                            borderRadius: '12px', border: `1px solid ${colors.border}`,
                            backgroundColor: 'transparent', color: colors.subtext,
                            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                        }}>
                            Skip - Use Basic Charts
                        </button>
                    </div>

                    <div style={{ padding: '16px 24px', backgroundColor: colors.card, fontSize: '12px', color: colors.subtext, textAlign: 'center' }}>
                        💡 Login once = unlimited charts forever
                    </div>
                </div>
            )}

            {(mode === 'login' || mode === 'signup') && (
                <div style={{
                    width: '90%', maxWidth: '500px', height: '80%', maxHeight: '700px',
                    backgroundColor: colors.bg, borderRadius: '16px', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                }}>
                    <div style={{
                        padding: '12px 16px', borderBottom: `1px solid ${colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        backgroundColor: colors.card,
                    }}>
                        <button onClick={() => setMode('choose')} style={{
                            padding: '6px 12px', borderRadius: '6px',
                            border: `1px solid ${colors.border}`, backgroundColor: 'transparent',
                            color: colors.text, fontSize: '13px', cursor: 'pointer',
                        }}>
                            ← Back
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: colors.text }}>
                            {mode === 'login' ? '🔑 Login' : '✨ Sign Up'}
                        </span>
                        <button onClick={onComplete} style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none',
                            backgroundColor: colors.green, color: '#fff',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        }}>
                            Done ✓
                        </button>
                    </div>

                    <div style={{ flex: 1 }}>
                        <webview
                            src={mode === 'login'
                                ? 'https://www.tradingview.com/accounts/signin/'
                                : 'https://www.tradingview.com/pricing/?source=header_go_pro_button'
                            }
                            style={{ width: '100%', height: '100%' }}
                            partition="persist:tradingview"
                            allowpopups="true"
                            useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        />
                    </div>

                    <div style={{
                        padding: '10px 16px', backgroundColor: colors.card,
                        fontSize: '12px', color: colors.subtext, textAlign: 'center',
                        borderTop: `1px solid ${colors.border}`,
                    }}>
                        Click <strong>"Start for free"</strong> on pricing page, then click <strong>Done ✓</strong>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TradingViewSetup;
