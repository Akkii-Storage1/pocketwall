import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ASSET_TYPES } from '../utils/watchlistAPI';
import TradingViewSetup from './TradingViewSetup';

/**
 * Smart Chart Modal
 * - Premium users: Full TradingView webview
 * - Basic users: Widget embed (no login needed)
 * - First-time: Shows setup modal
 */
const ChartModal = ({ isOpen, onClose, asset, price, changePercent, isDark }) => {
    const [loading, setLoading] = useState(true);
    const [exchange, setExchange] = useState('NSE');
    const [progress, setProgress] = useState(0);
    const [showSetup, setShowSetup] = useState(false);
    const webviewRef = useRef(null);

    // Check user's chart preference
    const [chartMode, setChartMode] = useState(() => {
        const saved = localStorage.getItem('tradingViewMode');
        return saved || 'unknown'; // 'premium', 'basic', 'unknown'
    });

    const colors = {
        bg: isDark ? '#131722' : '#ffffff',
        text: isDark ? '#d1d4dc' : '#131722',
        subtext: isDark ? '#787b86' : '#6b7280',
        border: isDark ? '#2a2e39' : '#e0e3eb',
        up: '#26a69a',
        down: '#ef5350',
        accent: '#2962ff',
    };

    // Show setup on first use
    useEffect(() => {
        if (isOpen && chartMode === 'unknown') {
            setShowSetup(true);
        }
    }, [isOpen, chartMode]);

    // Listen for IPC from main process when TradingView auth is intercepted
    useEffect(() => {
        const handleAuthRequired = () => {
            console.log('📩 Received tradingview-auth-required from main');
            setShowSetup(true);
        };

        // Check if window.api exists (Electron environment)
        if (window.api && window.api.onTradingViewAuth) {
            window.api.onTradingViewAuth(handleAuthRequired);
        } else if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.on('tradingview-auth-required', handleAuthRequired);
        }

        return () => {
            if (window.electron && window.electron.ipcRenderer) {
                window.electron.ipcRenderer.removeListener('tradingview-auth-required', handleAuthRequired);
            }
        };
    }, []);

    useEffect(() => {
        if (asset) {
            setExchange('NSE');
            setLoading(true);
            setProgress(0);
        }
    }, [asset?.id, asset?.type]);

    // Webview loading events + Navigation Intercept
    useEffect(() => {
        if (chartMode !== 'premium') return;
        const webview = webviewRef.current;
        if (!webview) return;

        let progressTimer;
        const startProgress = () => {
            setProgress(10);
            progressTimer = setInterval(() => {
                setProgress(p => p >= 90 ? p : p + Math.random() * 12);
            }, 200);
        };

        const handleStart = () => { setLoading(true); startProgress(); };
        const handleStop = () => { setLoading(false); setProgress(100); clearInterval(progressTimer); };

        // Check if URL is a TradingView auth/signup page
        const isAuthUrl = (url) => {
            return url.includes('tradingview.com/accounts') ||
                url.includes('tradingview.com/pricing') ||
                url.includes('tradingview.com/gopro') ||
                url.includes('tradingview.com/#signin') ||
                url.includes('accounts.tradingview.com') ||
                url.includes('tradingview.com/u/');
        };

        // INTERCEPT: Catch new window popups (signup dialogs)
        const handleNewWindow = (e) => {
            const url = e.url || '';
            console.log('🔗 New window requested:', url);
            if (isAuthUrl(url)) {
                console.log('🚫 Blocked external auth, showing custom modal');
                setShowSetup(true);
            }
            // Always prevent new windows from opening externally
            e.preventDefault();
        };

        // INTERCEPT: Catch navigation attempts within webview
        const handleWillNavigate = (e) => {
            const url = e.url || '';
            console.log('➡️ Will navigate to:', url);
            if (isAuthUrl(url)) {
                console.log('🚫 Blocked auth navigation, showing custom modal');
                setShowSetup(true);
            }
        };

        // Attach events after webview is ready
        const handleDomReady = () => {
            console.log('✅ Webview DOM ready, intercepting navigation...');
            // Inject script to intercept link clicks
            webview.executeJavaScript(`
                document.addEventListener('click', function(e) {
                    const link = e.target.closest('a');
                    if (link && link.href) {
                        const url = link.href;
                        if (url.includes('tradingview.com/accounts') || 
                            url.includes('tradingview.com/pricing') ||
                            url.includes('tradingview.com/gopro') ||
                            url.includes('tradingview.com/#signin')) {
                            e.preventDefault();
                            e.stopPropagation();
                            window.postMessage({ type: 'SHOW_AUTH_MODAL' }, '*');
                        }
                    }
                }, true);

                // Also intercept buttons that trigger auth
                document.addEventListener('click', function(e) {
                    const btn = e.target.closest('button');
                    if (btn) {
                        const text = btn.textContent.toLowerCase();
                        if (text.includes('sign') || text.includes('log in') || text.includes('register')) {
                            e.preventDefault();
                            e.stopPropagation();
                            window.postMessage({ type: 'SHOW_AUTH_MODAL' }, '*');
                        }
                    }
                }, true);
            `).catch(() => { });
        };

        // Listen for IPC from injected script
        const handleIpcMessage = (e) => {
            if (e.channel === 'show-auth-modal' ||
                (e.args && e.args[0] && e.args[0].type === 'SHOW_AUTH_MODAL')) {
                console.log('📩 IPC: Show auth modal');
                setShowSetup(true);
            }
        };

        webview.addEventListener('did-start-loading', handleStart);
        webview.addEventListener('did-stop-loading', handleStop);
        webview.addEventListener('new-window', handleNewWindow);
        webview.addEventListener('will-navigate', handleWillNavigate);
        webview.addEventListener('dom-ready', handleDomReady);
        webview.addEventListener('ipc-message', handleIpcMessage);

        return () => {
            clearInterval(progressTimer);
            webview.removeEventListener('did-start-loading', handleStart);
            webview.removeEventListener('did-stop-loading', handleStop);
            webview.removeEventListener('new-window', handleNewWindow);
            webview.removeEventListener('will-navigate', handleWillNavigate);
            webview.removeEventListener('dom-ready', handleDomReady);
            webview.removeEventListener('ipc-message', handleIpcMessage);
        };
    }, [chartMode, isOpen]);

    // Get TradingView symbol
    const tvSymbol = useMemo(() => {
        if (!asset) return 'BINANCE:BTCUSDT';
        const sym = (asset.symbol || '').toUpperCase();
        const id = (asset.id || '').toLowerCase();

        switch (asset.type) {
            case 'Crypto':
                const cryptoMap = { 'bitcoin': 'BTCUSDT', 'ethereum': 'ETHUSDT', 'solana': 'SOLUSDT' };
                return `BINANCE:${cryptoMap[id] || sym + 'USDT'}`;
            case 'IndianStock':
                return `${exchange}:${sym}`;
            case 'USStock':
                const nasdaq = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META'];
                return nasdaq.includes(sym) ? `NASDAQ:${sym}` : `NYSE:${sym}`;
            case 'Forex':
                return `FX_IDC:${id.toUpperCase()}INR`;
            case 'Commodity':
                const comMap = { 'gold': 'TVC:GOLD', 'silver': 'TVC:SILVER', 'crude-oil': 'TVC:USOIL' };
                return comMap[id] || 'TVC:GOLD';
            default:
                return `NSE:${sym}`;
        }
    }, [asset, exchange]);

    // URLs
    const webviewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`;
    const widgetUrl = useMemo(() => {
        const params = new URLSearchParams({
            symbol: tvSymbol,
            interval: 'D',
            timezone: 'Asia/Kolkata',
            theme: isDark ? 'dark' : 'light',
            style: '1',
            locale: 'en',
            hide_side_toolbar: '0',
            allow_symbol_change: 'true',
            save_image: 'true',
        });
        return `https://s.tradingview.com/widgetembed/?${params.toString()}`;
    }, [tvSymbol, isDark]);

    // Handlers
    const handleSetupComplete = () => {
        localStorage.setItem('tradingViewMode', 'premium');
        setChartMode('premium');
        setShowSetup(false);
    };

    const handleSetupSkip = () => {
        localStorage.setItem('tradingViewMode', 'basic');
        setChartMode('basic');
        setShowSetup(false);
    };

    const toggleMode = () => {
        const newMode = chartMode === 'premium' ? 'basic' : 'premium';
        if (newMode === 'premium' && localStorage.getItem('tradingViewMode') !== 'premium') {
            setShowSetup(true);
        } else {
            localStorage.setItem('tradingViewMode', newMode);
            setChartMode(newMode);
            setLoading(true);
        }
    };

    if (!isOpen || !asset) return null;

    const assetConfig = ASSET_TYPES[asset.type] || { emoji: '📊', color: '#666' };
    const isUp = (changePercent || 0) >= 0;
    const isIndian = asset.type === 'IndianStock';
    const isPremium = chartMode === 'premium';

    return (
        <>
            {/* Setup Modal */}
            <TradingViewSetup
                isOpen={showSetup}
                onComplete={handleSetupComplete}
                onSkip={handleSetupSkip}
                isDark={isDark}
            />

            {/* Main Chart Modal */}
            {!showSetup && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: colors.bg,
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 12px',
                        borderBottom: `1px solid ${colors.border}`,
                        backgroundColor: isDark ? '#1e222d' : '#f8f9fa',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>{asset.emoji || assetConfig.emoji}</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}>{asset.symbol}</span>
                            <span style={{
                                fontSize: '9px', padding: '2px 6px', borderRadius: '3px',
                                backgroundColor: `${assetConfig.color}20`, color: assetConfig.color,
                            }}>{tvSymbol}</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginLeft: '8px' }}>
                                ₹{(price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: isUp ? colors.up : colors.down }}>
                                {isUp ? '+' : ''}{(changePercent || 0).toFixed(2)}%
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {/* Mode Toggle */}
                            <button
                                onClick={toggleMode}
                                title={isPremium ? 'Switch to Basic' : 'Switch to Premium'}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: `1px solid ${isPremium ? colors.accent : colors.border}`,
                                    backgroundColor: isPremium ? `${colors.accent}15` : 'transparent',
                                    color: isPremium ? colors.accent : colors.subtext,
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                {isPremium ? '⭐ Premium' : '📊 Basic'}
                            </button>

                            {/* NSE/BSE Switch */}
                            {isIndian && (
                                <div style={{
                                    display: 'flex',
                                    borderRadius: '4px',
                                    border: `1px solid ${colors.border}`,
                                    overflow: 'hidden',
                                }}>
                                    {['NSE', 'BSE'].map(ex => (
                                        <button
                                            key={ex}
                                            onClick={() => { setExchange(ex); setLoading(true); }}
                                            style={{
                                                padding: '3px 8px',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                border: 'none',
                                                borderLeft: ex === 'BSE' ? `1px solid ${colors.border}` : 'none',
                                                cursor: 'pointer',
                                                backgroundColor: exchange === ex ? '#FF9933' : 'transparent',
                                                color: exchange === ex ? '#fff' : colors.text,
                                            }}
                                        >
                                            {ex}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Browser Controls (Premium only) */}
                            {isPremium && (
                                <>
                                    <button onClick={() => webviewRef.current?.goBack()} title="Back"
                                        style={{
                                            padding: '3px 6px', borderRadius: '4px', border: `1px solid ${colors.border}`,
                                            backgroundColor: 'transparent', cursor: 'pointer', fontSize: '11px', color: colors.text
                                        }}>←</button>
                                    <button onClick={() => webviewRef.current?.goForward()} title="Forward"
                                        style={{
                                            padding: '3px 6px', borderRadius: '4px', border: `1px solid ${colors.border}`,
                                            backgroundColor: 'transparent', cursor: 'pointer', fontSize: '11px', color: colors.text
                                        }}>→</button>
                                    <button onClick={() => webviewRef.current?.reload()} title="Reload"
                                        style={{
                                            padding: '3px 6px', borderRadius: '4px', border: `1px solid ${colors.border}`,
                                            backgroundColor: 'transparent', cursor: 'pointer', fontSize: '11px', color: colors.text
                                        }}>↻</button>
                                </>
                            )}

                            {/* Close */}
                            <button onClick={onClose} style={{
                                width: '26px', height: '26px', borderRadius: '4px',
                                border: `1px solid ${colors.border}`, backgroundColor: 'transparent',
                                cursor: 'pointer', fontSize: '12px', color: colors.text,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✕</button>
                        </div>
                    </div>

                    {/* Progress Bar (Premium mode) */}
                    {isPremium && loading && (
                        <div style={{ height: '2px', backgroundColor: colors.border }}>
                            <div style={{
                                height: '100%',
                                width: `${progress}%`,
                                backgroundColor: colors.accent,
                                transition: 'width 0.2s ease-out',
                            }} />
                        </div>
                    )}

                    {/* Chart Area */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        {loading && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: colors.text, flexDirection: 'column', gap: '10px',
                                backgroundColor: colors.bg, zIndex: 10,
                                opacity: isPremium && progress > 50 ? 0 : 1,
                                transition: 'opacity 0.3s',
                                pointerEvents: isPremium && progress > 50 ? 'none' : 'auto',
                            }}>
                                <div style={{ fontSize: '40px' }}>📈</div>
                                <div>{isPremium ? 'Loading TradingView...' : 'Loading Chart...'}</div>
                                {isPremium && <div style={{ fontSize: '11px', color: colors.subtext }}>{Math.round(progress)}%</div>}
                            </div>
                        )}

                        {/* Premium: Webview | Basic: Widget */}
                        {isPremium ? (
                            <webview
                                ref={webviewRef}
                                src={webviewUrl}
                                style={{ width: '100%', height: '100%' }}
                                partition="persist:tradingview"
                                allowpopups="true"
                                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                            />
                        ) : (
                            <iframe
                                src={widgetUrl}
                                style={{ width: '100%', height: '100%', border: 'none' }}
                                title="TradingView Chart"
                                onLoad={() => setLoading(false)}
                                allowFullScreen
                            />
                        )}
                    </div>

                    {/* Indian Stock Tip (Basic mode only) */}
                    {!isPremium && isIndian && (
                        <div style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            color: '#f59e0b',
                            backgroundColor: isDark ? '#1e1e1e' : '#fffbeb',
                            borderTop: `1px solid ${colors.border}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <span>💡 Some Indian stocks not available in Basic mode</span>
                            <button
                                onClick={toggleMode}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: colors.accent,
                                    color: '#fff',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Upgrade to Premium ⭐
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default ChartModal;
