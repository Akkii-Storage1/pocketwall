import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useToast } from '../components/Toast';
import ChartModal from '../components/ChartModal';
import { fetchPrices, smartSearch, ASSET_TYPES, QUICK_PICKS } from '../utils/watchlistAPI';

/**
 * Universal Watchlist Page
 * Track all asset types with category-wise display, filters, and TradingView charts
 */

// Sparkline Chart Component
const SparklineChart = memo(({ data, width = 80, height = 32, isUp = true }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!data || data.length < 2) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const points = data;
        const min = Math.min(...points);
        const max = Math.max(...points);
        const range = max - min || 1;

        ctx.clearRect(0, 0, width, height);

        // Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, isUp ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(0, height);
        points.forEach((point, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - ((point - min) / range) * (height - 4);
            ctx.lineTo(x, y);
        });
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Line
        ctx.beginPath();
        points.forEach((point, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - ((point - min) / range) * (height - 4);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = isUp ? '#26a69a' : '#ef5350';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }, [data, width, height, isUp]);

    if (!data || data.length < 2) return null;
    return <canvas ref={canvasRef} style={{ width, height }} />;
});

const Watchlist = ({ isDark, isPrivacyMode }) => {
    const toast = useToast();

    // Watchlist state
    const [watchlist, setWatchlist] = useState(() => {
        const saved = localStorage.getItem('pocketwall_universal_watchlist');
        return saved ? JSON.parse(saved) : [];
    });

    const [prices, setPrices] = useState({});
    const [sparklines, setSparklines] = useState({});
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const intervalRef = useRef(null);

    // Filters
    const [typeFilter, setTypeFilter] = useState('All');
    const [directionFilter, setDirectionFilter] = useState('All'); // All, Gainers, Losers
    const [percentFilter, setPercentFilter] = useState(0); // 0 = no filter, 1, 2, 5, etc.
    const [searchQuery, setSearchQuery] = useState('');

    // Add modal
    const [showAddModal, setShowAddModal] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [addResults, setAddResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Chart modal
    const [chartModal, setChartModal] = useState({ open: false, asset: null });

    // Collapsed sections
    const [collapsedSections, setCollapsedSections] = useState({});

    // Colors
    const colors = {
        bg: isDark ? '#1e1e1e' : '#f5f5f5',
        card: isDark ? '#252526' : '#ffffff',
        border: isDark ? '#3e3e42' : '#e0e0e0',
        text: isDark ? '#ffffff' : '#1a1a1a',
        textSecondary: isDark ? '#a0a0a0' : '#666666',
        up: '#26a69a',
        down: '#ef5350',
    };

    // Save watchlist
    useEffect(() => {
        localStorage.setItem('pocketwall_universal_watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    // Initial load
    useEffect(() => {
        if (watchlist.length > 0) {
            loadPrices();
        }
    }, []);

    // Auto refresh
    useEffect(() => {
        if (autoRefresh && watchlist.length > 0) {
            intervalRef.current = setInterval(loadPrices, 30000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [autoRefresh, watchlist]);

    // Load prices
    const loadPrices = useCallback(async () => {
        if (watchlist.length === 0) return;
        setLoading(true);
        try {
            const result = await fetchPrices(watchlist);
            setPrices(result);
            setLastUpdated(new Date());

            // Generate mock sparklines
            const newSparklines = {};
            watchlist.forEach(item => {
                const key = `${item.type}-${item.id}`;
                const price = result[key]?.price || 100;
                const points = [];
                let p = price * 0.95;
                for (let i = 0; i < 20; i++) {
                    p = p * (1 + (Math.random() - 0.48) * 0.02);
                    points.push(p);
                }
                points.push(price);
                newSparklines[key] = points;
            });
            setSparklines(newSparklines);
        } catch (e) {
            console.error('Failed to load prices');
        }
        setLoading(false);
    }, [watchlist]);

    // Smart search (auto-detects type like Investments tab)
    const handleSearch = async () => {
        if (!addSearch || addSearch.length < 2) return;
        setSearching(true);
        try {
            const results = await smartSearch(addSearch);
            setAddResults(results);
        } catch (e) {
            console.error('Search error:', e);
        }
        setSearching(false);
    };

    // Debounced auto-search
    useEffect(() => {
        if (addSearch.length >= 2) {
            const timer = setTimeout(handleSearch, 400);
            return () => clearTimeout(timer);
        } else {
            setAddResults([]);
        }
    }, [addSearch]);

    // Add to watchlist
    const addItem = async (asset) => {
        const exists = watchlist.find(w => w.type === asset.type && w.id === asset.id);
        if (exists) {
            toast.info('Already in watchlist');
            return;
        }
        const typeConfig = ASSET_TYPES[asset.type] || { emoji: '📊' };
        const newItem = {
            type: asset.type,
            id: asset.id,
            symbol: asset.symbol,
            name: asset.name,
            emoji: asset.emoji || typeConfig.emoji,
            addedAt: Date.now()
        };

        setWatchlist(prev => [...prev, newItem]);
        toast.success(`${asset.symbol} added`);
        setAddSearch('');
        setAddResults([]);

        // Immediately fetch price for new item
        try {
            const { fetchPrice } = await import('../utils/watchlistAPI');
            const priceData = await fetchPrice(asset.type, asset.id);
            if (priceData) {
                setPrices(prev => ({
                    ...prev,
                    [`${asset.type}-${asset.id}`]: priceData
                }));
            }
        } catch (e) {
            console.error('Failed to fetch price for new item:', e);
        }
    };

    // Remove from watchlist
    const removeItem = (type, id) => {
        setWatchlist(prev => prev.filter(w => !(w.type === type && w.id === id)));
        toast.success('Removed');
    };

    // Check if in watchlist
    const isInWatchlist = (type, id) => watchlist.some(w => w.type === type && w.id === id);

    // Get filtered items
    const getFilteredItems = () => {
        let items = [...watchlist];

        // Type filter
        if (typeFilter !== 'All') {
            items = items.filter(i => i.type === typeFilter);
        }

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            items = items.filter(i =>
                i.symbol.toLowerCase().includes(q) ||
                i.name.toLowerCase().includes(q)
            );
        }

        // Direction filter
        if (directionFilter !== 'All') {
            items = items.filter(i => {
                const change = prices[`${i.type}-${i.id}`]?.changePercent || 0;
                if (directionFilter === 'Gainers') return change > 0;
                if (directionFilter === 'Losers') return change < 0;
                return true;
            });
        }

        // Percent filter
        if (percentFilter > 0) {
            items = items.filter(i => {
                const change = Math.abs(prices[`${i.type}-${i.id}`]?.changePercent || 0);
                return change >= percentFilter;
            });
        }

        return items;
    };

    // Group items by type
    const getGroupedItems = () => {
        const items = getFilteredItems();
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.type]) grouped[item.type] = [];
            grouped[item.type].push(item);
        });
        return grouped;
    };

    // Toggle section
    const toggleSection = (type) => {
        setCollapsedSections(prev => ({ ...prev, [type]: !prev[type] }));
    };

    // Format money
    const formatMoney = (a) => `₹${(a || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const formatChange = (c) => `${c >= 0 ? '+' : ''}${(c || 0).toFixed(2)}%`;

    const groupedItems = getGroupedItems();
    const filteredCount = getFilteredItems().length;

    return (
        <div style={{ height: '100%', overflow: 'auto', backgroundColor: colors.bg, fontFamily: 'Segoe UI, sans-serif' }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.card,
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 600, color: colors.text, margin: 0 }}>
                        👁️ Universal Watchlist
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Live indicator */}
                        {autoRefresh && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: colors.up, animation: 'pulse 1.5s infinite' }}></span>
                                <span style={{ fontSize: '12px', color: colors.up }}>LIVE</span>
                            </div>
                        )}
                        {lastUpdated && (
                            <span style={{ fontSize: '11px', color: colors.textSecondary }}>
                                Last: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        <button onClick={() => setAutoRefresh(!autoRefresh)}
                            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${colors.border}`, backgroundColor: autoRefresh ? colors.up : 'transparent', color: autoRefresh ? '#fff' : colors.text }}>
                            {autoRefresh ? '⏸ Pause' : '▶ Auto'}
                        </button>
                        <button onClick={loadPrices} disabled={loading}
                            style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: 'none', backgroundColor: '#0078d4', color: '#fff' }}>
                            {loading ? '⏳' : '🔄'} Refresh
                        </button>
                        <button onClick={() => setShowAddModal(true)}
                            style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: 'none', backgroundColor: '#26a69a', color: '#fff', fontWeight: 600 }}>
                            ➕ Add Asset
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="🔍 Search watchlist..."
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, width: '180px' }}
                    />

                    {/* Type Filter */}
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text }}>
                        <option value="All">All Types</option>
                        {Object.entries(ASSET_TYPES).map(([key, val]) => (
                            <option key={key} value={key}>{val.emoji} {val.label}</option>
                        ))}
                    </select>

                    {/* Direction Filter */}
                    <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)}
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text }}>
                        <option value="All">All</option>
                        <option value="Gainers">📈 Gainers Only</option>
                        <option value="Losers">📉 Losers Only</option>
                    </select>

                    {/* Percent Filter */}
                    <select value={percentFilter} onChange={(e) => setPercentFilter(Number(e.target.value))}
                        style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text }}>
                        <option value={0}>Any %</option>
                        <option value={1}>&gt; 1%</option>
                        <option value={2}>&gt; 2%</option>
                        <option value={5}>&gt; 5%</option>
                        <option value={10}>&gt; 10%</option>
                    </select>

                    <span style={{ fontSize: '12px', color: colors.textSecondary }}>
                        Showing {filteredCount} of {watchlist.length}
                    </span>
                </div>
            </div>

            {/* CSS */}
            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                .watchlist-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
            `}</style>

            {/* Content */}
            <div style={{ padding: '16px 20px' }}>
                {watchlist.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>👁️</div>
                        <h3 style={{ color: colors.text, marginBottom: '8px' }}>Your Watchlist is Empty</h3>
                        <p style={{ color: colors.textSecondary, marginBottom: '20px' }}>
                            Add stocks, crypto, forex, and more to track live prices
                        </p>
                        <button onClick={() => setShowAddModal(true)}
                            style={{ padding: '10px 24px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', border: 'none', backgroundColor: '#26a69a', color: '#fff', fontWeight: 600 }}>
                            ➕ Add Your First Asset
                        </button>
                    </div>
                ) : filteredCount === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>
                        No items match your filters
                    </div>
                ) : (
                    Object.entries(groupedItems).map(([type, items]) => {
                        const config = ASSET_TYPES[type] || { emoji: '📊', color: '#666', label: type };
                        const isCollapsed = collapsedSections[type];
                        const sectionChange = items.reduce((sum, i) => sum + (prices[`${i.type}-${i.id}`]?.changePercent || 0), 0) / items.length;

                        return (
                            <div key={type} style={{ marginBottom: '20px' }}>
                                {/* Section Header */}
                                <div
                                    onClick={() => toggleSection(type)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px 16px',
                                        backgroundColor: colors.card,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        marginBottom: isCollapsed ? 0 : '12px',
                                        border: `1px solid ${colors.border}`,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '20px' }}>{config.emoji}</span>
                                        <span style={{ fontWeight: 600, color: colors.text }}>{config.label}</span>
                                        <span style={{ fontSize: '12px', color: colors.textSecondary, backgroundColor: colors.bg, padding: '2px 8px', borderRadius: '10px' }}>
                                            {items.length}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: sectionChange >= 0 ? colors.up : colors.down }}>
                                            Avg: {formatChange(sectionChange)}
                                        </span>
                                        <span style={{ fontSize: '16px', color: colors.textSecondary }}>{isCollapsed ? '▶' : '▼'}</span>
                                    </div>
                                </div>

                                {/* Items Grid */}
                                {!isCollapsed && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                        {items.map(item => {
                                            const key = `${item.type}-${item.id}`;
                                            const priceData = prices[key] || {};
                                            const sparkline = sparklines[key] || [];
                                            const isUp = (priceData.changePercent || 0) >= 0;

                                            return (
                                                <div
                                                    key={key}
                                                    className="watchlist-card"
                                                    onClick={() => setChartModal({ open: true, asset: item })}
                                                    style={{
                                                        padding: '14px',
                                                        backgroundColor: colors.card,
                                                        borderRadius: '10px',
                                                        border: `1px solid ${colors.border}`,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        borderLeft: `4px solid ${config.color}`,
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                            <span style={{ fontSize: '24px' }}>{item.emoji}</span>
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: config.color, fontSize: '14px' }}>{item.symbol}</div>
                                                                <div style={{ fontSize: '11px', color: colors.textSecondary, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                                            </div>
                                                        </div>
                                                        <SparklineChart data={sparkline} width={70} height={28} isUp={isUp} />
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
                                                        <div>
                                                            <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text }} className={isPrivacyMode ? 'privacy-blur' : ''}>
                                                                {formatMoney(priceData.price)}
                                                            </div>
                                                            <div style={{ fontSize: '12px', fontWeight: 600, color: isUp ? colors.up : colors.down }}>
                                                                {formatChange(priceData.changePercent)}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeItem(item.type, item.id); }}
                                                            style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '4px', border: `1px solid ${colors.down}`, backgroundColor: 'transparent', color: colors.down, cursor: 'pointer' }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Modal - Unified Smart Search */}
            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ width: '90%', maxWidth: '450px', maxHeight: '80vh', backgroundColor: colors.card, borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, color: colors.text }}>➕ Add to Watchlist</h3>
                            <button onClick={() => { setShowAddModal(false); setAddSearch(''); setAddResults([]); }}
                                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: colors.text }}>✕</button>
                        </div>

                        <div style={{ padding: '16px 20px' }}>
                            {/* Unified Search */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '6px', display: 'block' }}>
                                    Search stocks, crypto, forex...
                                </label>
                                <input
                                    type="text"
                                    value={addSearch}
                                    onChange={(e) => setAddSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="e.g. Reliance, AAPL, Bitcoin, USD..."
                                    autoFocus
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, fontSize: '14px', boxSizing: 'border-box' }}
                                />
                                {searching && <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px' }}>🔍 Searching...</div>}
                            </div>

                            {/* Search Results with Type Badges */}
                            {addResults.length > 0 && (
                                <div style={{ marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {addResults.map((r, i) => {
                                        const config = ASSET_TYPES[r.type] || { emoji: '📊', color: '#666' };
                                        const inList = isInWatchlist(r.type, r.id);
                                        return (
                                            <button key={`${r.type}-${r.id}-${i}`} onClick={() => addItem(r)}
                                                disabled={inList}
                                                style={{
                                                    width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: '4px',
                                                    borderRadius: '6px', border: `1px solid ${colors.border}`, cursor: inList ? 'not-allowed' : 'pointer',
                                                    backgroundColor: inList ? colors.bg : 'transparent',
                                                    color: colors.text, opacity: inList ? 0.5 : 1,
                                                    display: 'flex', alignItems: 'center', gap: '10px'
                                                }}>
                                                <span style={{ fontSize: '18px' }}>{r.emoji || config.emoji}</span>
                                                <div style={{ flex: 1 }}>
                                                    <strong>{r.symbol}</strong>
                                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: colors.textSecondary }}>{r.name}</span>
                                                </div>
                                                <span style={{
                                                    fontSize: '9px', padding: '2px 6px', borderRadius: '4px',
                                                    backgroundColor: `${config.color}20`, color: config.color
                                                }}>{r.type}</span>
                                                {inList && <span style={{ fontSize: '11px', color: colors.up }}>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Quick Picks */}
                            {addSearch.length < 2 && (
                                <div>
                                    <label style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '8px', display: 'block' }}>Quick Add</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {Object.entries(QUICK_PICKS).flatMap(([type, assets]) =>
                                            assets.map(a => {
                                                const config = ASSET_TYPES[type] || { color: '#666' };
                                                const inList = isInWatchlist(type, a.id);
                                                return (
                                                    <button key={`${type}-${a.id}`} onClick={() => addItem({ ...a, type })}
                                                        disabled={inList}
                                                        style={{
                                                            padding: '6px 10px', fontSize: '11px', borderRadius: '6px', cursor: inList ? 'not-allowed' : 'pointer',
                                                            border: `1px solid ${config.color}`, backgroundColor: 'transparent',
                                                            color: config.color, opacity: inList ? 0.4 : 1,
                                                            display: 'flex', alignItems: 'center', gap: '4px'
                                                        }}>
                                                        {a.emoji || ASSET_TYPES[type]?.emoji} {a.symbol}
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Chart Modal */}
            <ChartModal
                isOpen={chartModal.open}
                onClose={() => setChartModal({ open: false, asset: null })}
                asset={chartModal.asset}
                price={chartModal.asset ? prices[`${chartModal.asset.type}-${chartModal.asset.id}`]?.price : 0}
                changePercent={chartModal.asset ? prices[`${chartModal.asset.type}-${chartModal.asset.id}`]?.changePercent : 0}
                isDark={isDark}
            />
        </div>
    );
};

export default Watchlist;
