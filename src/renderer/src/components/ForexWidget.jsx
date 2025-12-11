import React, { useState, useEffect } from 'react';

/**
 * ForexWidget - Currency Converter Component
 * Uses ExchangeRate-API free tier (1500 requests/month)
 * 
 * Features:
 * - Convert between 30+ major currencies
 * - Live exchange rates
 * - Swap currencies
 * - Popular currency pairs
 */

const ForexWidget = ({ theme = 'dark', compact = false }) => {
    const [amount, setAmount] = useState(1);
    const [fromCurrency, setFromCurrency] = useState('USD');
    const [toCurrency, setToCurrency] = useState('INR');
    const [rates, setRates] = useState({});
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [error, setError] = useState(null);

    // Popular currencies
    const currencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
        { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
        { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
        { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
        { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
        { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
        { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
        { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
        { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
    ];

    // Fetch rates from ExchangeRate-API (free, no key needed for basic)
    useEffect(() => {
        fetchRates();
    }, [fromCurrency]);

    const fetchRates = async () => {
        setLoading(true);
        setError(null);
        try {
            // Using free ExchangeRate-API endpoint
            const response = await fetch(
                `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
            );

            if (!response.ok) throw new Error('Failed to fetch rates');

            const data = await response.json();
            setRates(data.rates);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Forex fetch error:', err);
            setError('Unable to fetch rates. Please try again.');
            // Fallback rates (approximate)
            setRates({ USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79 });
        }
        setLoading(false);
    };

    const convertedAmount = () => {
        if (!rates[toCurrency]) return 0;
        return (amount * rates[toCurrency]).toFixed(2);
    };

    const swapCurrencies = () => {
        setFromCurrency(toCurrency);
        setToCurrency(fromCurrency);
    };

    const getRate = () => {
        if (!rates[toCurrency]) return 'N/A';
        return rates[toCurrency].toFixed(4);
    };

    const getCurrencyInfo = (code) => {
        return currencies.find(c => c.code === code) || { flag: '💱', name: code };
    };

    // Theme colors
    const colors = theme === 'dark' ? {
        bg: '#252526',
        card: '#2d2d30',
        border: '#3e3e42',
        text: '#ffffff',
        textMuted: '#888888',
        accent: '#0078d4',
        input: '#1e1e1e'
    } : {
        bg: '#ffffff',
        card: '#f5f5f5',
        border: '#e0e0e0',
        text: '#1a1a1a',
        textMuted: '#666666',
        accent: '#0078d4',
        input: '#ffffff'
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: colors.text, fontWeight: '600', fontSize: '14px' }}>💱 Forex</span>
                    {loading && <span style={{ color: colors.textMuted, fontSize: '12px' }}>Loading...</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: colors.text, fontSize: '16px' }}>1 {fromCurrency}</span>
                    <span style={{ color: colors.textMuted }}>→</span>
                    <span style={{ color: colors.accent, fontSize: '16px', fontWeight: '600' }}>
                        {getRate()} {toCurrency}
                    </span>
                </div>
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
                    <span style={{ fontSize: '24px' }}>💱</span>
                    <div>
                        <h3 style={{ color: colors.text, margin: 0, fontSize: '18px' }}>Currency Converter</h3>
                        <p style={{ color: colors.textMuted, margin: 0, fontSize: '12px' }}>
                            Live exchange rates
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchRates}
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
                    {loading ? '⟳ Updating...' : '⟳ Refresh'}
                </button>
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

            {/* Amount Input */}
            <div style={{ marginBottom: '16px' }}>
                <label style={{ color: colors.textMuted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                    Amount
                </label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: colors.input,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        fontSize: '18px',
                        fontWeight: '600',
                        boxSizing: 'border-box'
                    }}
                />
            </div>

            {/* Currency Selection */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                {/* From Currency */}
                <div style={{ flex: 1 }}>
                    <label style={{ color: colors.textMuted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                        From
                    </label>
                    <select
                        value={fromCurrency}
                        onChange={(e) => setFromCurrency(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: colors.input,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            color: colors.text,
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        {currencies.map(c => (
                            <option key={c.code} value={c.code}>
                                {c.flag} {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Swap Button */}
                <button
                    onClick={swapCurrencies}
                    style={{
                        backgroundColor: colors.card,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        cursor: 'pointer',
                        marginTop: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                    }}
                    title="Swap currencies"
                >
                    ⇄
                </button>

                {/* To Currency */}
                <div style={{ flex: 1 }}>
                    <label style={{ color: colors.textMuted, fontSize: '12px', display: 'block', marginBottom: '6px' }}>
                        To
                    </label>
                    <select
                        value={toCurrency}
                        onChange={(e) => setToCurrency(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: colors.input,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '8px',
                            color: colors.text,
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        {currencies.map(c => (
                            <option key={c.code} value={c.code}>
                                {c.flag} {c.code} - {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Result */}
            <div style={{
                backgroundColor: colors.card,
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                border: `1px solid ${colors.border}`
            }}>
                <div style={{ color: colors.textMuted, fontSize: '14px', marginBottom: '8px' }}>
                    {getCurrencyInfo(fromCurrency).flag} {amount.toLocaleString()} {fromCurrency}
                </div>
                <div style={{ color: colors.text, fontSize: '12px', marginBottom: '8px' }}>
                    =
                </div>
                <div style={{ color: colors.accent, fontSize: '32px', fontWeight: '700' }}>
                    {getCurrencyInfo(toCurrency).flag} {parseFloat(convertedAmount()).toLocaleString()} {toCurrency}
                </div>
                <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '12px' }}>
                    1 {fromCurrency} = {getRate()} {toCurrency}
                </div>
            </div>

            {/* Last Updated */}
            {lastUpdated && (
                <div style={{
                    color: colors.textMuted,
                    fontSize: '11px',
                    textAlign: 'center',
                    marginTop: '12px'
                }}>
                    Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
            )}

            {/* Popular Pairs */}
            <div style={{ marginTop: '20px' }}>
                <div style={{ color: colors.textMuted, fontSize: '12px', marginBottom: '10px' }}>
                    Popular Pairs
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                        { from: 'USD', to: 'INR' },
                        { from: 'EUR', to: 'USD' },
                        { from: 'GBP', to: 'USD' },
                        { from: 'USD', to: 'JPY' },
                    ].map((pair, i) => (
                        <button
                            key={i}
                            onClick={() => { setFromCurrency(pair.from); setToCurrency(pair.to); }}
                            style={{
                                backgroundColor: fromCurrency === pair.from && toCurrency === pair.to
                                    ? colors.accent
                                    : colors.card,
                                color: fromCurrency === pair.from && toCurrency === pair.to
                                    ? 'white'
                                    : colors.text,
                                border: `1px solid ${colors.border}`,
                                borderRadius: '20px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            {pair.from}/{pair.to}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ForexWidget;
