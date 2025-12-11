import React, { useState } from 'react';
import { useFeature } from '../context/FeatureContext';
import LicenseManager from '../utils/LicenseManager';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const AdminDashboard = ({ isDark }) => {
    const { config, featureFlags, updateFeatureFlag, resetTrial, upgradeTier } = useFeature();
    const toast = useToast();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [generatedKey, setGeneratedKey] = useState('');
    const [selectedTier, setSelectedTier] = useState('pro');

    // Mock Data for Analytics
    const mrrData = [
        { name: 'Jan', mrr: 4000 },
        { name: 'Feb', mrr: 4500 },
        { name: 'Mar', mrr: 5200 },
        { name: 'Apr', mrr: 6100 },
        { name: 'May', mrr: 7800 },
        { name: 'Jun', mrr: 9500 },
    ];

    const userGrowthData = [
        { name: 'Jan', users: 120 },
        { name: 'Feb', users: 180 },
        { name: 'Mar', users: 250 },
        { name: 'Apr', users: 380 },
        { name: 'May', users: 520 },
        { name: 'Jun', users: 750 },
    ];

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'admin123') {
            setIsAuthenticated(true);
            toast.success('Welcome back, Commander.');
        } else {
            toast.error('Access Denied');
        }
    };

    const handleGenerateKey = () => {
        try {
            const key = LicenseManager.generateLicenseKey(selectedTier);
            setGeneratedKey(key);
            navigator.clipboard.writeText(key);
            toast.success('Key generated and copied to clipboard!');
        } catch (error) {
            toast.error('Failed to generate key');
        }
    };

    const bgColor = isDark ? '#1e1e1e' : '#f8f9fa';
    const cardBg = isDark ? '#2d2d30' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#e9ecef';

    if (!isAuthenticated) {
        return (
            <div className="h-full flex items-center justify-center flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
                <div className="p-8 rounded-xl shadow-2xl text-center max-w-md w-full" style={{ backgroundColor: cardBg }}>
                    <div className="text-6xl mb-4">🛡️</div>
                    <h2 className="text-2xl font-bold mb-2">Restricted Access</h2>
                    <p className="opacity-70 mb-6">Enter Admin Command Key</p>
                    <form onSubmit={handleLogin}>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded border mb-4 text-center tracking-widest"
                            placeholder="••••••••"
                            autoFocus
                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#f0f0f0', color: textColor, borderColor }}
                        />
                        <button
                            type="submit"
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors"
                        >
                            Authenticate
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto p-6" style={{ backgroundColor: bgColor, color: textColor }}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <span className="text-red-500">⚡</span> Admin Command Center
                    </h1>
                    <p className="opacity-70">System Status: Operational | Version: 1.1.0-alpha</p>
                </div>
                <button
                    onClick={() => setIsAuthenticated(false)}
                    className="px-4 py-2 border rounded hover:bg-opacity-10 hover:bg-red-500"
                    style={{ borderColor }}
                >
                    Logout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* License Generator */}
                <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: cardBg }}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        🔑 License Generator
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm opacity-70 mb-1">Tier</label>
                            <select
                                value={selectedTier}
                                onChange={(e) => setSelectedTier(e.target.value)}
                                className="w-full p-2 rounded border"
                                style={{ backgroundColor: bgColor, color: textColor, borderColor }}
                            >
                                <option value="starter">Starter</option>
                                <option value="pro">Pro</option>
                                <option value="elite">Elite</option>
                            </select>
                        </div>
                        <button
                            onClick={handleGenerateKey}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded"
                        >
                            Generate Key
                        </button>
                        {generatedKey && (
                            <div className="p-3 rounded border text-center font-mono text-lg break-all cursor-pointer hover:opacity-80"
                                onClick={() => {
                                    navigator.clipboard.writeText(generatedKey);
                                    toast.success('Copied!');
                                }}
                                style={{ backgroundColor: bgColor, borderColor }}
                            >
                                {generatedKey}
                            </div>
                        )}
                    </div>
                </div>

                {/* Support Tools */}
                <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: cardBg }}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        🛠️ Support Tools
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 border rounded" style={{ borderColor }}>
                            <span>Reset Trial</span>
                            <button
                                onClick={() => {
                                    if (confirm('Reset trial for current user?')) {
                                        resetTrial();
                                        toast.success('Trial Reset');
                                    }
                                }}
                                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded"
                            >
                                Execute
                            </button>
                        </div>
                        <div className="flex justify-between items-center p-2 border rounded" style={{ borderColor }}>
                            <span>Force Upgrade (Pro)</span>
                            <button
                                onClick={async () => {
                                    try {
                                        const key = LicenseManager.generateLicenseKey('pro');
                                        await upgradeTier('pro', key);
                                        toast.success('Forced Upgrade to Pro');
                                    } catch (e) {
                                        toast.error('Upgrade failed: ' + e.message);
                                    }
                                }}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded"
                            >
                                Execute
                            </button>
                        </div>
                        <div className="flex justify-between items-center p-2 border rounded" style={{ borderColor }}>
                            <span>Force Downgrade</span>
                            <button
                                onClick={async () => {
                                    await DataAdapter.saveUserSettings({ licenseKey: null, licenseTier: null });
                                    await resetTrial(); // Triggers status check
                                    toast.success('Downgraded to Starter');
                                }}
                                className="px-3 py-1 text-sm bg-gray-600 text-white rounded"
                            >
                                Execute
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feature Flags */}
                <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: cardBg }}>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        🚩 Feature Flags
                    </h3>
                    <div className="space-y-3">
                        {Object.entries(featureFlags || {}).map(([flag, enabled]) => (
                            <div key={flag} className="flex justify-between items-center p-2 border rounded" style={{ borderColor }}>
                                <span className="capitalize">{flag.replace(/_/g, ' ')}</span>
                                <button
                                    onClick={() => updateFeatureFlag(flag, !enabled)}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-400'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${enabled ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        ))}
                        {(!featureFlags || Object.keys(featureFlags).length === 0) && (
                            <div className="text-center opacity-50 py-4">No flags configured</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analytics Section */}
            <h3 className="text-2xl font-bold mb-6">Business Intelligence (Simulated)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: cardBg }}>
                    <h4 className="text-lg font-bold mb-4">Monthly Recurring Revenue (MRR)</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mrrData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                                <XAxis dataKey="name" stroke={textColor} />
                                <YAxis stroke={textColor} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: textColor }}
                                />
                                <Bar dataKey="mrr" fill="#8884d8" name="MRR ($)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="p-6 rounded-xl shadow-lg" style={{ backgroundColor: cardBg }}>
                    <h4 className="text-lg font-bold mb-4">User Growth</h4>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={userGrowthData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                                <XAxis dataKey="name" stroke={textColor} />
                                <YAxis stroke={textColor} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: cardBg, borderColor: borderColor, color: textColor }}
                                />
                                <Line type="monotone" dataKey="users" stroke="#82ca9d" strokeWidth={3} name="Active Users" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
