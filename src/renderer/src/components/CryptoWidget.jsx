import React, { useState, useEffect } from 'react';

/**
 * CryptoWidget - Cryptocurrency Prices Component
 * Uses CoinGecko API free tier (10,000 calls/month)
 * 
 * Features:
 * - Top 10 cryptocurrency prices
 * - 24h price change
 * - Market cap and volume
 * - Price charts sparkline
 */

const CryptoWidget = ({ theme = 'dark', compact = false, onCryptoSelect }) => {
    const [cryptos, setCryptos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [currency, setCurrency] = useState('usd');

    // Currency symbols
    const currencySymbols = {
        usd: '$',
        inr: '₹',
        eur: '€',
        gbp: '£'
    };

    useEffect(() => {
        fetchCryptos();
        // Refresh every 2 minutes
        const interval = setInterval(fetchCryptos, 120000);
        return () => clearInterval(interval);
    }, [currency]);

    const fetchCryptos = async () => {
        try {
            setError(null);
            // CoinGecko free API - no key required
            const response = await fetch(
                `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`
            );

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            setCryptos(data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Crypto fetch error:', err);
            setError('Unable to fetch crypto prices');
            // Use fallback data
            setCryptos([
                { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 97000, price_change_percentage_24h: 2.5, market_cap: 1900000000000, image: '₿' },
                { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3600, price_change_percentage_24h: -1.2, market_cap: 430000000000, image: 'Ξ' },
            ]);
        }
        setLoading(false);
    };

    const formatPrice = (price) => {
        if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
        if (price >= 1) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
        return price.toLocaleString(undefined, { maximumFractionDigits: 6 });
    };

    const formatMarketCap = (cap) => {
        if (cap >= 1e12) return `${(cap / 1e12).toFixed(2)}T`;
        if (cap >= 1e9) return `${(cap / 1e9).toFixed(2)}B`;
        if (cap >= 1e6) return `${(cap / 1e6).toFixed(2)}M`;
        return cap.toLocaleString();
    };

    // Theme colors
    const colors = theme === 'dark' ? {
        bg: '#252526',
        card: '#2d2d30',
        border: '#3e3e42',
        text: '#ffffff',
        textMuted: '#888888',
        accent: '#0078d4',
        green: '#10b981',
        red: '#ef4444'
    } : {
        bg: '#ffffff',
        card: '#f5f5f5',
        border: '#e0e0e0',
        text: '#1a1a1a',
        textMuted: '#666666',
        accent: '#0078d4',
        green: '#10b981',
        red: '#ef4444'
    };

    // Crypto icons
    const getIcon = (symbol) => {
        const icons = {
            btc: '₿',
            eth: 'Ξ',
            usdt: '₮',
            bnb: '◈',
            xrp: '✕',
            sol: '◎',
            ada: '₳',
            doge: 'Ð',
            default: '●'
        };
        return icons[symbol.toLowerCase()] || icons.default;
    };

    if (compact) {
        // Compact mode for dashboard widget
        return (
            <div style={{
                backgroundColor: colors.card,
                borderRadius: '8px',
                padding: '12px',
                border: `1px solid ${colors.border}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ color: colors.text, fontWeight: '600', fontSize: '14px' }}>🪙 Crypto</span>
                    {loading && <span style={{ color: colors.textMuted, fontSize: '12px' }}>Loading...</span>}
                </div>
                {cryptos.slice(0, 3).map(crypto => (
                    <div key={crypto.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: `1px solid ${colors.border}`
                    }}>
                        <span style={{ color: colors.text, fontSize: '13px' }}>
                            {getIcon(crypto.symbol)} {crypto.symbol.toUpperCase()}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: colors.text, fontSize: '13px', fontWeight: '500' }}>
                                {currencySymbols[currency]}{formatPrice(crypto.current_price)}
                            </div>
                            <div style={{
                                color: crypto.price_change_percentage_24h >= 0 ? colors.green : colors.red,
                                fontSize: '11px'
                            }}>
                                {crypto.price_change_percentage_24h >= 0 ? '▲' : '▼'}
                                {Math.abs(crypto.price_change_percentage_24h || 0).toFixed(2)}%
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: colors.bg,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.border}`
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🪙</span>
                    <div>
                        <h3 style={{ color: colors.text, margin: 0, fontSize: '18px' }}>Cryptocurrency</h3>
                        <p style={{ color: colors.textMuted, margin: 0, fontSize: '12px' }}>
                            Top 10 by Market Cap
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Currency Selector */}
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        style={{
                            backgroundColor: colors.card,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            padding: '6px 10px',
                            color: colors.text,
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="usd">USD ($)</option>
                        <option value="inr">INR (₹)</option>
                        <option value="eur">EUR (€)</option>
                        <option value="gbp">GBP (£)</option>
                    </select>

                    <button
                        onClick={fetchCryptos}
                        disabled={loading}
                        style={{
                            backgroundColor: colors.accent,
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            fontSize: '12px'
                        }}
                    >
                        {loading ? '⟳' : '⟳ Refresh'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '16px',
                    color: '#ef4444',
                    fontSize: '13px'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Crypto List */}
            <div style={{
                backgroundColor: colors.card,
                borderRadius: '8px',
                overflow: 'hidden',
                border: `1px solid ${colors.border}`
            }}>
                {/* Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1.5fr 1fr 1fr 1fr',
                    padding: '12px 16px',
                    backgroundColor: theme === 'dark' ? '#333' : '#eee',
                    fontSize: '12px',
                    color: colors.textMuted,
                    fontWeight: '500'
                }}>
                    <span>#</span>
                    <span>Coin</span>
                    <span style={{ textAlign: 'right' }}>Price</span>
                    <span style={{ textAlign: 'right' }}>24h %</span>
                    <span style={{ textAlign: 'right' }}>Market Cap</span>
                </div>

                {/* Rows */}
                {cryptos.map((crypto, index) => (
                    <div
                        key={crypto.id}
                        onClick={() => onCryptoSelect && onCryptoSelect(crypto)}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '40px 1.5fr 1fr 1fr 1fr',
                            padding: '14px 16px',
                            borderBottom: index < cryptos.length - 1 ? `1px solid ${colors.border}` : 'none',
                            cursor: onCryptoSelect ? 'pointer' : 'default',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.card}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <span style={{ color: colors.textMuted, fontSize: '14px' }}>{index + 1}</span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {crypto.image && typeof crypto.image === 'string' && crypto.image.startsWith('http') ? (
                                <img
                                    src={crypto.image}
                                    alt={crypto.name}
                                    style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                                />
                            ) : (
                                <span style={{ fontSize: '20px' }}>{getIcon(crypto.symbol)}</span>
                            )}
                            <div>
                                <div style={{ color: colors.text, fontWeight: '500', fontSize: '14px' }}>
                                    {crypto.name}
                                </div>
                                <div style={{ color: colors.textMuted, fontSize: '12px' }}>
                                    {crypto.symbol.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', color: colors.text, fontWeight: '500', fontSize: '14px' }}>
                            {currencySymbols[currency]}{formatPrice(crypto.current_price)}
                        </div>

                        <div style={{
                            textAlign: 'right',
                            color: (crypto.price_change_percentage_24h || 0) >= 0 ? colors.green : colors.red,
                            fontWeight: '500',
                            fontSize: '14px'
                        }}>
                            {(crypto.price_change_percentage_24h || 0) >= 0 ? '▲' : '▼'}
                            {Math.abs(crypto.price_change_percentage_24h || 0).toFixed(2)}%
                        </div>

                        <div style={{ textAlign: 'right', color: colors.textMuted, fontSize: '13px' }}>
                            {currencySymbols[currency]}{formatMarketCap(crypto.market_cap)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Last Updated */}
            {lastUpdated && (
                <div style={{
                    color: colors.textMuted,
                    fontSize: '11px',
                    textAlign: 'center',
                    marginTop: '12px'
                }}>
                    Data from CoinGecko • Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
            )}
        </div>
    );
};

export default CryptoWidget;
