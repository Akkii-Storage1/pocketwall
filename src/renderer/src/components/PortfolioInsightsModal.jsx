import React, { useState, useMemo } from 'react';
import { X, PieChart, TrendingUp, BarChart2, Activity, DollarSign, Calendar, Layers, Target, Shield, Zap } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, LineChart, Line } from 'recharts';
import CurrencyConverter from '../utils/CurrencyConverter';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const PortfolioInsightsModal = ({ isOpen, onClose, holdings, currency, isDark }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [projectionYears, setProjectionYears] = useState(5);
    const [monthlyContribution, setMonthlyContribution] = useState(5000);

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#333' : '#e0e0e0';
    const cardBg = isDark ? '#252526' : '#f8f9fa';

    // --- Data Processing ---

    const toDisplay = (val, exchange) => CurrencyConverter.convert(val, exchange === 'US' ? 'USD' : 'INR', currency);

    const totalValue = holdings.reduce((acc, h) => acc + toDisplay(parseFloat(h.currentValue) || 0, h.exchange), 0);
    const totalInvested = holdings.reduce((acc, h) => {
        // Use totalInvested from parent if available, otherwise calculate fallback
        const invested = parseFloat(h.totalInvested) || (parseFloat(h.averagePrice || 0) * parseFloat(h.quantity || 0));
        return acc + toDisplay(invested, h.exchange);
    }, 0);
    const totalPnL = totalValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    // Asset Allocation
    const allocationData = useMemo(() => {
        const data = {};
        holdings.forEach(h => {
            const type = h.assetClass || 'Other';
            const val = toDisplay(h.currentValue, h.exchange);
            data[type] = (data[type] || 0) + val;
        });
        return Object.keys(data).map(key => ({ name: key, value: data[key] })).sort((a, b) => b.value - a.value);
    }, [holdings, currency]);

    // Sector/Type Allocation (Simulated for now if not available)
    const sectorData = useMemo(() => {
        const data = {};
        holdings.forEach(h => {
            // Try to infer sector or use exchange/assetClass as proxy
            let sector = h.sector || h.assetClass;
            if (!sector) {
                sector = h.exchange === 'Crypto' ? 'Crypto' :
                    h.exchange === 'US' ? 'US Tech' :
                        h.exchange === 'Forex' ? 'Forex' :
                            h.exchange === 'Commodity' ? 'Commodities' : 'India Corp';
            }
            const val = toDisplay(h.currentValue, h.exchange);
            data[sector] = (data[sector] || 0) + val;
        });
        return Object.keys(data).map(key => ({ name: key, value: data[key] })).sort((a, b) => b.value - a.value).slice(0, 8);
    }, [holdings, currency]);

    // Performance Data
    const performanceData = useMemo(() => {
        const data = { 'Stocks': 0, 'Crypto': 0, 'Forex': 0, 'Commodity': 0, 'MF': 0, 'Assets': 0 };
        holdings.forEach(h => {
            let cat = 'Stocks';
            if (h.assetClass === 'Crypto') cat = 'Crypto';
            else if (h.assetClass === 'Forex') cat = 'Forex';
            else if (h.assetClass === 'Commodity') cat = 'Commodity';
            else if (h.assetClass === 'Mutual Fund') cat = 'MF';
            else if (h.assetClass === 'Fixed Asset') cat = 'Assets';

            const pnl = toDisplay(h.profitLoss, h.exchange);
            data[cat] += pnl;
        });
        return Object.keys(data).filter(k => Math.abs(data[k]) > 1).map(k => ({ name: k, value: data[k] }));
    }, [holdings, currency]);

    // Health Score Calculation
    const healthScore = useMemo(() => {
        let score = 100;
        // Penalty for lack of diversification
        if (allocationData.length < 3) score -= 20;
        // Penalty for high crypto exposure (>40%)
        const crypto = allocationData.find(a => a.name === 'Crypto');
        if (crypto && (crypto.value / totalValue) > 0.4) score -= 15;
        // Penalty for negative P&L
        if (totalPnL < 0) score -= 10;

        return Math.max(0, score);
    }, [allocationData, totalValue, totalPnL]);

    // Projections
    const projectionData = useMemo(() => {
        const data = [];
        const growthRates = { conservative: 0.06, moderate: 0.12, aggressive: 0.18 };
        let currentConservative = totalValue;
        let currentModerate = totalValue;
        let currentAggressive = totalValue;

        for (let i = 0; i <= projectionYears; i++) {
            data.push({
                year: `Year ${i}`,
                Conservative: Math.round(currentConservative),
                Moderate: Math.round(currentModerate),
                Aggressive: Math.round(currentAggressive)
            });
            // Compound interest + monthly contribution
            currentConservative = (currentConservative + (monthlyContribution * 12)) * (1 + growthRates.conservative);
            currentModerate = (currentModerate + (monthlyContribution * 12)) * (1 + growthRates.moderate);
            currentAggressive = (currentAggressive + (monthlyContribution * 12)) * (1 + growthRates.aggressive);
        }
        return data;
    }, [totalValue, projectionYears, monthlyContribution]);


    const formatMoney = (val) => CurrencyConverter.format(val, currency);

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'}`}
            style={{ color: activeTab === id ? '#fff' : textColor }}
        >
            <Icon size={16} />
            <span className="font-medium">{label}</span>
        </button>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300" style={{ backgroundColor: bgColor }}>

                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold" style={{ color: textColor }}>Portfolio Insights</h2>
                            <p className="text-xs opacity-60" style={{ color: textColor }}>Deep dive into your wealth analytics</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                        <X size={20} style={{ color: textColor }} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 p-4 border-b overflow-x-auto" style={{ borderColor }}>
                    <TabButton id="overview" label="Overview" icon={Layers} />
                    <TabButton id="performance" label="Performance" icon={TrendingUp} />
                    <TabButton id="allocation" label="Allocation" icon={PieChart} />
                    <TabButton id="projections" label="Time Machine" icon={Target} />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                    <div className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: textColor }}>Net Worth</div>
                                    <div className="text-2xl font-bold text-blue-500">{formatMoney(totalValue)}</div>
                                </div>
                                <div className="p-4 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                    <div className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: textColor }}>Total Invested</div>
                                    <div className="text-2xl font-bold" style={{ color: textColor }}>{formatMoney(totalInvested)}</div>
                                </div>
                                <div className="p-4 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                    <div className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: textColor }}>Total Profit/Loss</div>
                                    <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL)}
                                    </div>
                                    <div className={`text-xs font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {totalPnLPercent.toFixed(2)}%
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl border relative overflow-hidden" style={{ backgroundColor: cardBg, borderColor }}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="text-xs font-bold uppercase opacity-60 mb-1" style={{ color: textColor }}>Health Score</div>
                                            <div className={`text-3xl font-bold ${healthScore > 80 ? 'text-green-500' : healthScore > 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                {healthScore}/100
                                            </div>
                                        </div>
                                        <Shield size={32} className="opacity-20" style={{ color: textColor }} />
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 mt-3 rounded-full overflow-hidden">
                                        <div className="h-full transition-all duration-1000" style={{ width: `${healthScore}%`, backgroundColor: healthScore > 80 ? '#10b981' : healthScore > 50 ? '#eab308' : '#ef4444' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Quick Charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                    <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: textColor }}>
                                        <PieChart size={18} /> Asset Mix
                                    </h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RePieChart>
                                                <Pie
                                                    data={allocationData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {allocationData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value) => formatMoney(value)}
                                                    contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }}
                                                />
                                                <Legend />
                                            </RePieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                    <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: textColor }}>
                                        <TrendingUp size={18} /> Performance by Category
                                    </h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={performanceData}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                                <XAxis dataKey="name" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke={textColor} fontSize={12} tickFormatter={(val) => `${val / 1000}k`} tickLine={false} axisLine={false} />
                                                <Tooltip
                                                    formatter={(value) => formatMoney(value)}
                                                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                                                    contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }}
                                                />
                                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                    {performanceData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PERFORMANCE TAB */}
                    {activeTab === 'performance' && (
                        <div className="space-y-6">
                            <div className="p-6 rounded-xl border text-center" style={{ backgroundColor: cardBg, borderColor }}>
                                <h3 className="text-lg font-semibold mb-2" style={{ color: textColor }}>Total Profit/Loss Analysis</h3>
                                <div className="text-4xl font-bold mb-2" style={{ color: totalPnL >= 0 ? '#10b981' : '#ef4444' }}>
                                    {totalPnL >= 0 ? '+' : ''}{formatMoney(totalPnL)}
                                </div>
                                <div className="text-sm opacity-60" style={{ color: textColor }}>
                                    You have generated a {totalPnLPercent.toFixed(2)}% return on your investment.
                                </div>
                            </div>

                            <div className="p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                <h3 className="font-bold mb-4" style={{ color: textColor }}>Detailed Breakdown</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={performanceData} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} horizontal={false} />
                                            <XAxis type="number" stroke={textColor} fontSize={12} tickFormatter={(val) => `${val / 1000}k`} />
                                            <YAxis dataKey="name" type="category" stroke={textColor} fontSize={12} width={100} />
                                            <Tooltip
                                                formatter={(value) => formatMoney(value)}
                                                contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }}
                                            />
                                            <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                                                {performanceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ALLOCATION TAB */}
                    {activeTab === 'allocation' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                <h3 className="font-bold mb-4 text-center" style={{ color: textColor }}>By Asset Class</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={allocationData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={0}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {allocationData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }} />
                                            <Legend />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                <h3 className="font-bold mb-4 text-center" style={{ color: textColor }}>By Sector / Type</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RePieChart>
                                            <Pie
                                                data={sectorData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {sectorData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }} />
                                            <Legend />
                                        </RePieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROJECTIONS TAB (TIME MACHINE) */}
                    {activeTab === 'projections' && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Controls */}
                                <div className="w-full md:w-1/3 space-y-4 p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                    <h3 className="font-bold flex items-center gap-2" style={{ color: textColor }}>
                                        <Zap size={18} className="text-yellow-500" /> Simulation Settings
                                    </h3>

                                    <div>
                                        <label className="text-xs font-semibold uppercase opacity-60 block mb-2" style={{ color: textColor }}>Projection Period</label>
                                        <input
                                            type="range" min="1" max="20" step="1"
                                            value={projectionYears}
                                            onChange={(e) => setProjectionYears(parseInt(e.target.value))}
                                            className="w-full accent-blue-600"
                                        />
                                        <div className="flex justify-between text-xs opacity-60" style={{ color: textColor }}>
                                            <span>1 Year</span>
                                            <span className="font-bold text-blue-500">{projectionYears} Years</span>
                                            <span>20 Years</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold uppercase opacity-60 block mb-2" style={{ color: textColor }}>Monthly Contribution ({currency})</label>
                                        <div className="flex items-center gap-2 border rounded p-2" style={{ borderColor }}>
                                            <span className="opacity-50 font-bold" style={{ color: textColor }}>
                                                {currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                                            </span>
                                            <input
                                                type="number"
                                                value={monthlyContribution}
                                                onChange={(e) => setMonthlyContribution(parseInt(e.target.value) || 0)}
                                                className="bg-transparent w-full outline-none font-semibold"
                                                style={{ color: textColor }}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/40 text-xs text-blue-800 dark:text-blue-100 border border-blue-100 dark:border-blue-800">
                                        <p className="font-semibold mb-1">Projections assume:</p>
                                        <ul className="list-disc ml-4 space-y-1 opacity-90">
                                            <li>Conservative: 6% annual return</li>
                                            <li>Moderate: 12% annual return</li>
                                            <li>Aggressive: 18% annual return</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="w-full md:w-2/3 p-5 rounded-xl border" style={{ backgroundColor: cardBg, borderColor }}>
                                    <h3 className="font-bold mb-4" style={{ color: textColor }}>Wealth Projection</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={projectionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorAggressive" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorModerate" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="year" stroke={textColor} fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke={textColor} fontSize={12} tickFormatter={(val) => `${val / 1000}k`} tickLine={false} axisLine={false} />
                                                <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }} />
                                                <Area type="monotone" dataKey="Aggressive" stroke="#10b981" fillOpacity={1} fill="url(#colorAggressive)" />
                                                <Area type="monotone" dataKey="Moderate" stroke="#3b82f6" fillOpacity={1} fill="url(#colorModerate)" />
                                                <Area type="monotone" dataKey="Conservative" stroke="#6b7280" fillOpacity={0.1} fill="#6b7280" />
                                                <Legend />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default PortfolioInsightsModal;
