import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { CURRENCIES } from '../constants';
import DataAdapter from '../utils/dataAdapter';
import NotificationManager from '../utils/NotificationManager';
import BackupManager from '../utils/BackupManager';
import PinLock from '../components/PinLock';
import ActivationModal from '../components/ActivationModal';
import { useFeature } from '../context/FeatureContext';
import { useAuth } from '../context/AuthContext';

const Settings = ({ isDark, theme, setTheme }) => {
    const toast = useToast();
    const navigate = useNavigate();
    const { tier, config, isTrial, trialInfo, optionalFeatures, updateOptionalFeature, OPTIONAL_FEATURE_INFO } = useFeature();
    const { currentUser, logout, resetPassword } = useAuth();

    const [activeTab, setActiveTab] = useState('account');
    const [userSettings, setUserSettings] = useState({
        name: '',
        defaultCurrency: 'INR',
        fontSize: 'medium',
        animations: true,
        positiveColor: '#10b981',
        negativeColor: '#ef4444'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [pinSetupMode, setPinSetupMode] = useState(false);
    const [showActivation, setShowActivation] = useState(false);
    const [encryptBackup, setEncryptBackup] = useState(false);
    const [backupPassword, setBackupPassword] = useState('');

    useEffect(() => {
        loadUserSettings();
    }, []);

    const loadUserSettings = async () => {
        const data = await DataAdapter.getUserSettings();
        setUserSettings(data);
    };

    const handleSaveUserSettings = async () => {
        setIsSaving(true);
        try {
            await DataAdapter.updateUserSettings(userSettings);
            // Notify App to update state immediately
            const event = new CustomEvent('settingsChanged', { detail: userSettings });
            document.dispatchEvent(event);
            toast.success('Profile settings saved');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleThemeChange = (e) => {
        setTheme(e.target.value);
    };

    const handleLogout = async () => {
        if (confirm('Are you sure you want to sign out?')) {
            try {
                await logout();
                toast.success('Signed out successfully');
                navigate('/login');
            } catch (error) {
                toast.error('Failed to sign out');
            }
        }
    };

    const handlePasswordReset = async () => {
        if (!currentUser?.email) {
            toast.error('No email found');
            return;
        }
        try {
            await resetPassword(currentUser.email);
            toast.success('Password reset email sent! Check your inbox.');
        } catch (error) {
            toast.error('Failed to send reset email');
        }
    };

    const generatePersonaData = async () => {
        if (!confirm("This will add sample transactions for October 2024. Proceed?")) return;

        const transactions = [
            // Income
            { date: '2024-10-01', type: 'income', category: 'Salary', amount: 85000, description: 'October Salary' },

            // Fixed Expenses
            { date: '2024-10-01', type: 'expense', category: 'Rent', amount: 25000, description: 'Apartment Rent' },
            { date: '2024-10-02', type: 'expense', category: 'Utilities', amount: 1200, description: 'Broadband Bill' },
            { date: '2024-10-05', type: 'expense', category: 'Utilities', amount: 3500, description: 'Electricity Bill' },

            // Daily Life - Groceries & Food
            { date: '2024-10-03', type: 'expense', category: 'Food', amount: 450, description: 'Groceries - Milk, Bread, Eggs' },
            { date: '2024-10-04', type: 'expense', category: 'Food', amount: 850, description: 'Lunch with Colleagues' },
            { date: '2024-10-07', type: 'expense', category: 'Food', amount: 1200, description: 'Weekly Veggies & Fruits' },
            { date: '2024-10-10', type: 'expense', category: 'Food', amount: 300, description: 'Snacks' },
            { date: '2024-10-12', type: 'expense', category: 'Food', amount: 2100, description: 'Dinner at Italian Place' },

            // Personal Care
            { date: '2024-10-06', type: 'expense', category: 'Personal', amount: 600, description: 'Haircut & Shave' },
            { date: '2024-10-20', type: 'expense', category: 'Personal', amount: 1500, description: 'Spa & Massage' },

            // Commute
            { date: '2024-10-01', type: 'expense', category: 'Transport', amount: 200, description: 'Uber to Office' },
            { date: '2024-10-02', type: 'expense', category: 'Transport', amount: 180, description: 'Uber from Office' },
            { date: '2024-10-03', type: 'expense', category: 'Transport', amount: 400, description: 'Fuel Refill' },

            // The Malaysia Trip (The "Event")
            { date: '2024-10-14', type: 'expense', category: 'Travel', amount: 25000, description: 'Flight to Kuala Lumpur' },
            { date: '2024-10-15', type: 'expense', category: 'Travel', amount: 4000, description: 'Hotel Booking - KL' },
            { date: '2024-10-15', type: 'expense', category: 'Food', amount: 1500, description: 'Dinner at Jalan Alor (Street Food)' },
            { date: '2024-10-16', type: 'expense', category: 'Entertainment', amount: 3000, description: 'Petronas Towers Tickets' },
            { date: '2024-10-16', type: 'expense', category: 'Shopping', amount: 5000, description: 'Souvenirs at Central Market' },
            { date: '2024-10-17', type: 'expense', category: 'Transport', amount: 800, description: 'Grab Taxi to Batu Caves' },
            { date: '2024-10-18', type: 'expense', category: 'Travel', amount: 12000, description: 'Flight back home' },

            // Post-Trip
            { date: '2024-10-25', type: 'expense', category: 'Shopping', amount: 3500, description: 'Diwali Shopping - Clothes' },
            { date: '2024-10-28', type: 'expense', category: 'Medical', amount: 1200, description: 'Dentist Checkup' }
        ];

        try {
            for (const t of transactions) {
                await DataAdapter.addTransaction(t);
            }
            toast.success('User Persona Data Generated!');
        } catch (error) {
            toast.error('Failed to generate data');
        }
    };

    const handleBackup = async () => {
        try {
            let password = '';

            // If encryption is enabled, prompt for password
            if (encryptBackup) {
                password = backupPassword || prompt("Enter a password to encrypt the backup:");
                if (!password) {
                    toast.error('Password is required for encrypted backup');
                    return;
                }
            }

            const userId = currentUser?.email || 'anonymous';
            const success = await BackupManager.createBackup(encryptBackup, password, userId);

            if (success) {
                toast.success(encryptBackup ? 'Encrypted backup created!' : 'Backup created');
                setBackupPassword(''); // Clear password
            } else {
                toast.error('Failed to create backup');
            }
        } catch (error) {
            console.error('Backup error:', error);
            toast.error('Failed to create backup');
        }
    };

    const handleRestore = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await BackupManager.restoreBackup(file);
            toast.success('Data restored successfully');
            // Reload user settings
            loadUserSettings();
        } catch (error) {
            console.error(error);
            toast.error('Invalid backup file or wrong format');
        }
        e.target.value = '';
    };

    const handleFactoryReset = async () => {
        // First confirmation
        if (!confirm('⚠️ WARNING: Factory Reset will DELETE ALL your data including:\n\n• All transactions\n• All investments\n• All goals\n• Crypto holdings\n• Settings and PIN\n• Everything!\n\nThis action CANNOT be undone. Continue?')) {
            return;
        }

        // Second confirmation - require typing
        const confirmText = prompt('To confirm, type "DELETE" (all caps):');
        if (confirmText !== 'DELETE') {
            toast.info('Factory reset cancelled');
            return;
        }

        try {
            // Clear all app data
            await DataAdapter.resetApp();

            // Also logout if logged in
            if (currentUser) {
                try {
                    await logout();
                } catch (e) {
                    console.warn('Logout failed during reset:', e);
                }
            }

            toast.success('All data cleared. Reloading app...');

            // Reload the app
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Factory reset failed:', error);
            toast.error('Factory reset failed: ' + error.message);
        }
    };

    const handleEmailSupport = () => {
        const subject = encodeURIComponent("PocketWall Support / Feedback");
        const body = encodeURIComponent("Hi PocketWall Team,\n\nI have some feedback/questions:\n\n");
        window.open(`mailto:support@pocketwall.app?subject=${subject}&body=${body}`);
    };

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const textColor = isDark ? '#ffffff' : '#000000';
    const activeTabBg = isDark ? '#3e3e42' : '#e0e0e0';

    const tabs = [
        { id: 'account', label: 'Account', icon: '👤' },
        { id: 'general', label: 'General', icon: '⚙️' },
        { id: 'categories', label: 'Categories', icon: '🏷️' },
        { id: 'features', label: 'Features', icon: '✨' },
        { id: 'security', label: 'Security', icon: '🔒' },
        { id: 'privacy', label: 'Privacy', icon: '👁️' },
        { id: 'data', label: 'Data', icon: '💾' },
        { id: 'subscription', label: 'Subscription', icon: '💎' },
        { id: 'support', label: 'Support', icon: '❓' }
    ];

    return (
        <div className="h-full flex flex-col" style={{ backgroundColor: bgColor, fontFamily: 'Segoe UI' }}>
            <div className="p-4 border-b" style={{ borderColor }}>
                <h2 className="text-xl font-semibold" style={{ color: textColor }}>Settings</h2>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Tabs */}
                <div className="w-48 border-r overflow-y-auto" style={{ borderColor, backgroundColor: panelBg }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors"
                            style={{
                                backgroundColor: activeTab === tab.id ? activeTabBg : 'transparent',
                                color: textColor,
                                borderLeft: activeTab === tab.id ? '3px solid #0078d4' : '3px solid transparent'
                            }}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Account Tab - NEW */}
                    {activeTab === 'account' && (
                        <div className="max-w-2xl space-y-6">
                            {/* Profile Card */}
                            <div className="border p-6 rounded-lg" style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                                        {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg" style={{ color: textColor }}>
                                            {userSettings.name || 'PocketWall User'}
                                        </h3>
                                        <p className="text-sm opacity-70" style={{ color: textColor }}>
                                            {currentUser?.email || 'Not signed in'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded ${isTrial ? 'bg-orange-500/20 text-orange-500' : tier === 'starter' ? 'bg-gray-500/20 text-gray-500' : 'bg-green-500/20 text-green-500'}`}>
                                                {isTrial ? `Trial: ${Math.ceil(trialInfo?.remainingHours / 24 || 0)} days left` : config?.label || 'Free'}
                                            </span>
                                            {currentUser?.emailVerified && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-500">✓ Verified</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setActiveTab('general')}
                                        className="p-3 rounded border text-left hover:bg-opacity-80 transition-colors"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5', borderColor }}
                                    >
                                        <div className="text-lg mb-1">✏️</div>
                                        <div className="text-sm font-medium" style={{ color: textColor }}>Edit Profile</div>
                                        <div className="text-xs opacity-50" style={{ color: textColor }}>Name, Currency</div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('subscription')}
                                        className="p-3 rounded border text-left hover:bg-opacity-80 transition-colors"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5', borderColor }}
                                    >
                                        <div className="text-lg mb-1">💎</div>
                                        <div className="text-sm font-medium" style={{ color: textColor }}>Subscription</div>
                                        <div className="text-xs opacity-50" style={{ color: textColor }}>Manage your plan</div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('security')}
                                        className="p-3 rounded border text-left hover:bg-opacity-80 transition-colors"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5', borderColor }}
                                    >
                                        <div className="text-lg mb-1">🔒</div>
                                        <div className="text-sm font-medium" style={{ color: textColor }}>Security</div>
                                        <div className="text-xs opacity-50" style={{ color: textColor }}>PIN Lock, Password</div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('data')}
                                        className="p-3 rounded border text-left hover:bg-opacity-80 transition-colors"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5', borderColor }}
                                    >
                                        <div className="text-lg mb-1">💾</div>
                                        <div className="text-sm font-medium" style={{ color: textColor }}>Data</div>
                                        <div className="text-xs opacity-50" style={{ color: textColor }}>Backup & Restore</div>
                                    </button>
                                </div>
                            </div>

                            {/* Session Info */}
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Session Info</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="opacity-70" style={{ color: textColor }}>Signed in as</span>
                                        <span style={{ color: textColor }}>{currentUser?.email || 'Not signed in'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-70" style={{ color: textColor }}>Auth Provider</span>
                                        <span style={{ color: textColor }}>
                                            {currentUser?.providerData?.[0]?.providerId === 'google.com' ? '🔵 Google' : '📧 Email'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-70" style={{ color: textColor }}>Account Created</span>
                                        <span style={{ color: textColor }}>
                                            {currentUser?.metadata?.creationTime
                                                ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="opacity-70" style={{ color: textColor }}>Last Sign In</span>
                                        <span style={{ color: textColor }}>
                                            {currentUser?.metadata?.lastSignInTime
                                                ? new Date(currentUser.metadata.lastSignInTime).toLocaleString()
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Account Actions */}
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Account Actions</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={handlePasswordReset}
                                        className="w-full px-4 py-3 text-sm border font-medium rounded flex items-center gap-3 hover:bg-opacity-80 transition-colors"
                                        style={{ backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5', borderColor, color: textColor }}
                                    >
                                        <span>🔑</span>
                                        <div className="text-left">
                                            <div>Change Password</div>
                                            <div className="text-xs opacity-50">Send password reset email</div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-3 text-sm border font-medium rounded flex items-center gap-3 hover:bg-red-500/10 transition-colors border-red-500/30"
                                        style={{ color: '#ef4444' }}
                                    >
                                        <span>🚪</span>
                                        <div className="text-left">
                                            <div>Sign Out</div>
                                            <div className="text-xs opacity-70">Log out of this device</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Devices & Sessions (Coming Soon) */}
                            <div className="border p-4 rounded opacity-50" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-2 text-lg" style={{ color: textColor }}>Active Sessions</h3>
                                <p className="text-sm opacity-70" style={{ color: textColor }}>
                                    View and manage all devices where you're signed in.
                                </p>
                                <div className="mt-3 text-xs px-2 py-1 bg-gray-500/20 rounded inline-block">
                                    Coming Soon
                                </div>
                            </div>
                        </div>
                    )}

                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>User Profile</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm mb-1" style={{ color: textColor }}>Name</label>
                                        <input
                                            type="text"
                                            value={userSettings.name}
                                            onChange={(e) => setUserSettings({ ...userSettings, name: e.target.value })}
                                            placeholder="Enter your name"
                                            className="w-full px-3 py-2 text-sm border rounded"
                                            style={{
                                                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                color: textColor,
                                                borderColor: isDark ? '#555' : '#adadad'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1" style={{ color: textColor }}>Default Currency</label>
                                        <select
                                            value={userSettings.defaultCurrency}
                                            onChange={(e) => setUserSettings({ ...userSettings, defaultCurrency: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border rounded"
                                            style={{
                                                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                color: textColor,
                                                borderColor: isDark ? '#555' : '#adadad'
                                            }}
                                        >
                                            {CURRENCIES.map(curr => (
                                                <option
                                                    key={curr.code}
                                                    value={curr.code}
                                                    disabled={!['USD', 'INR'].includes(curr.code)}
                                                >
                                                    {curr.label} {(!['USD', 'INR'].includes(curr.code)) ? '(Coming Soon)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleSaveUserSettings}
                                        disabled={isSaving}
                                        className="px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90"
                                        style={{
                                            backgroundColor: '#0078d4',
                                            color: 'white',
                                            borderColor: '#005a9e',
                                            opacity: isSaving ? 0.6 : 1
                                        }}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </div>

                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Appearance</h3>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm mb-2" style={{ color: textColor }}>Theme</label>
                                        <div className="flex items-center gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer" style={{ color: textColor }}>
                                                <input
                                                    type="radio"
                                                    name="theme"
                                                    value="light"
                                                    checked={theme === 'light'}
                                                    onChange={handleThemeChange}
                                                />
                                                Light Mode
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer" style={{ color: textColor }}>
                                                <input
                                                    type="radio"
                                                    name="theme"
                                                    value="dark"
                                                    checked={theme === 'dark'}
                                                    onChange={handleThemeChange}
                                                />
                                                Dark Mode
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm mb-2" style={{ color: textColor }}>Font Size</label>
                                        <select
                                            value={userSettings.fontSize || 'medium'}
                                            onChange={(e) => setUserSettings({ ...userSettings, fontSize: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border rounded"
                                            style={{
                                                backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                color: textColor,
                                                borderColor: isDark ? '#555' : '#adadad'
                                            }}
                                        >
                                            <option value="small">Small</option>
                                            <option value="medium">Medium</option>
                                            <option value="large">Large</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer" style={{ color: textColor }}>
                                            <input
                                                type="checkbox"
                                                checked={userSettings.animations !== false}
                                                onChange={(e) => setUserSettings({ ...userSettings, animations: e.target.checked })}
                                            />
                                            Enable Animations
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm mb-1" style={{ color: textColor }}>Positive Color</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={userSettings.positiveColor || '#10b981'}
                                                    onChange={(e) => setUserSettings({ ...userSettings, positiveColor: e.target.value })}
                                                    className="h-8 w-8 p-0 border-0 rounded cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={userSettings.positiveColor || '#10b981'}
                                                    onChange={(e) => setUserSettings({ ...userSettings, positiveColor: e.target.value })}
                                                    className="flex-1 px-2 text-sm border rounded"
                                                    style={{
                                                        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                        color: textColor,
                                                        borderColor: isDark ? '#555' : '#adadad'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1" style={{ color: textColor }}>Negative Color</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={userSettings.negativeColor || '#ef4444'}
                                                    onChange={(e) => setUserSettings({ ...userSettings, negativeColor: e.target.value })}
                                                    className="h-8 w-8 p-0 border-0 rounded cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={userSettings.negativeColor || '#ef4444'}
                                                    onChange={(e) => setUserSettings({ ...userSettings, negativeColor: e.target.value })}
                                                    className="flex-1 px-2 text-sm border rounded"
                                                    style={{
                                                        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                        color: textColor,
                                                        borderColor: isDark ? '#555' : '#adadad'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Categories Tab - Custom Categories Management */}
                    {activeTab === 'categories' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-2 text-lg" style={{ color: textColor }}>🏷️ Custom Categories</h3>
                                <p className="text-sm opacity-70 mb-4" style={{ color: textColor }}>
                                    Add your own income and expense categories. Default categories cannot be removed.
                                </p>

                                {/* Expense Categories */}
                                <div className="mb-6">
                                    <h4 className="font-medium mb-2" style={{ color: textColor }}>📤 Expense Categories</h4>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Education', 'Travel', 'Insurance', 'Other'].map(cat => (
                                            <span key={cat} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: isDark ? '#3e3e42' : '#e0e0e0', color: textColor }}>
                                                {cat}
                                            </span>
                                        ))}
                                        {(userSettings.customExpenseCategories || []).map(cat => (
                                            <span key={cat} className="px-2 py-1 rounded text-xs flex items-center gap-1" style={{ backgroundColor: '#0078d4', color: '#fff' }}>
                                                {cat}
                                                <button
                                                    onClick={() => {
                                                        const updated = (userSettings.customExpenseCategories || []).filter(c => c !== cat);
                                                        setUserSettings({ ...userSettings, customExpenseCategories: updated });
                                                    }}
                                                    className="hover:text-red-300"
                                                >×</button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="New expense category..."
                                            id="newExpenseCategory"
                                            className="flex-1 px-3 py-2 text-sm border rounded"
                                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = e.target.value.trim();
                                                    if (val && !(userSettings.customExpenseCategories || []).includes(val)) {
                                                        setUserSettings({
                                                            ...userSettings,
                                                            customExpenseCategories: [...(userSettings.customExpenseCategories || []), val]
                                                        });
                                                        e.target.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const input = document.getElementById('newExpenseCategory');
                                                const val = input.value.trim();
                                                if (val && !(userSettings.customExpenseCategories || []).includes(val)) {
                                                    setUserSettings({
                                                        ...userSettings,
                                                        customExpenseCategories: [...(userSettings.customExpenseCategories || []), val]
                                                    });
                                                    input.value = '';
                                                }
                                            }}
                                            className="px-3 py-2 text-sm rounded"
                                            style={{ backgroundColor: '#0078d4', color: '#fff' }}
                                        >+ Add</button>
                                    </div>
                                </div>

                                {/* Income Categories */}
                                <div className="mb-4">
                                    <h4 className="font-medium mb-2" style={{ color: textColor }}>📥 Income Categories</h4>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {['Salary', 'Business', 'Freelance', 'Investment', 'Gift', 'Rental', 'Refund', 'Other'].map(cat => (
                                            <span key={cat} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: isDark ? '#3e3e42' : '#e0e0e0', color: textColor }}>
                                                {cat}
                                            </span>
                                        ))}
                                        {(userSettings.customIncomeCategories || []).map(cat => (
                                            <span key={cat} className="px-2 py-1 rounded text-xs flex items-center gap-1" style={{ backgroundColor: '#10b981', color: '#fff' }}>
                                                {cat}
                                                <button
                                                    onClick={() => {
                                                        const updated = (userSettings.customIncomeCategories || []).filter(c => c !== cat);
                                                        setUserSettings({ ...userSettings, customIncomeCategories: updated });
                                                    }}
                                                    className="hover:text-red-300"
                                                >×</button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="New income category..."
                                            id="newIncomeCategory"
                                            className="flex-1 px-3 py-2 text-sm border rounded"
                                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', color: textColor, borderColor }}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    const val = e.target.value.trim();
                                                    if (val && !(userSettings.customIncomeCategories || []).includes(val)) {
                                                        setUserSettings({
                                                            ...userSettings,
                                                            customIncomeCategories: [...(userSettings.customIncomeCategories || []), val]
                                                        });
                                                        e.target.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const input = document.getElementById('newIncomeCategory');
                                                const val = input.value.trim();
                                                if (val && !(userSettings.customIncomeCategories || []).includes(val)) {
                                                    setUserSettings({
                                                        ...userSettings,
                                                        customIncomeCategories: [...(userSettings.customIncomeCategories || []), val]
                                                    });
                                                    input.value = '';
                                                }
                                            }}
                                            className="px-3 py-2 text-sm rounded"
                                            style={{ backgroundColor: '#10b981', color: '#fff' }}
                                        >+ Add</button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveUserSettings}
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm rounded font-semibold"
                                    style={{ backgroundColor: '#0078d4', color: '#fff', opacity: isSaving ? 0.6 : 1 }}
                                >
                                    {isSaving ? 'Saving...' : 'Save Categories'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Features Tab - Optional Feature Configuration */}
                    {activeTab === 'features' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-2 text-lg" style={{ color: textColor }}>✨ Feature Settings</h3>
                                <p className="text-sm opacity-70 mb-4" style={{ color: textColor }}>
                                    Customize your PocketWall experience. Some features require Pro plan.
                                </p>
                            </div>

                            {/* Budgeting Features - All Free */}
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>💰 Budgeting Options</h3>
                                <div className="space-y-4">
                                    {Object.entries(OPTIONAL_FEATURE_INFO?.budgeting || {}).map(([key, info]) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium flex items-center gap-2" style={{ color: textColor }}>
                                                    <span>{info.icon}</span> {info.label}
                                                </div>
                                                <div className="text-sm opacity-70" style={{ color: textColor }}>{info.description}</div>
                                            </div>
                                            {info.type === 'select' ? (
                                                <select
                                                    value={optionalFeatures?.budgeting?.[key] || 'monthly'}
                                                    onChange={(e) => updateOptionalFeature('budgeting', key, e.target.value)}
                                                    className="px-3 py-1 text-sm border rounded"
                                                    style={{
                                                        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                        color: textColor,
                                                        borderColor: isDark ? '#555' : '#adadad'
                                                    }}
                                                >
                                                    {info.options.map(opt => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <button
                                                    onClick={() => updateOptionalFeature('budgeting', key, !optionalFeatures?.budgeting?.[key])}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${optionalFeatures?.budgeting?.[key] ? 'bg-green-500' : 'bg-gray-400'}`}
                                                >
                                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${optionalFeatures?.budgeting?.[key] ? 'left-7' : 'left-1'}`}></span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Goals Features - Free */}
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>🎯 Goals Options</h3>
                                <div className="space-y-4">
                                    {Object.entries(OPTIONAL_FEATURE_INFO?.goals || {}).filter(([key, info]) => !info.dependsOn || optionalFeatures?.goals?.autoDeposit).map(([key, info]) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium flex items-center gap-2" style={{ color: textColor }}>
                                                    <span>{info.icon}</span> {info.label}
                                                </div>
                                                <div className="text-sm opacity-70" style={{ color: textColor }}>{info.description}</div>
                                            </div>
                                            {info.type === 'number' ? (
                                                <input
                                                    type="number"
                                                    min={info.min}
                                                    max={info.max}
                                                    value={optionalFeatures?.goals?.[key] || 10}
                                                    onChange={(e) => updateOptionalFeature('goals', key, parseInt(e.target.value))}
                                                    className="w-20 px-2 py-1 text-sm border rounded text-center"
                                                    style={{
                                                        backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                        color: textColor,
                                                        borderColor: isDark ? '#555' : '#adadad'
                                                    }}
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => updateOptionalFeature('goals', key, !optionalFeatures?.goals?.[key])}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${optionalFeatures?.goals?.[key] ? 'bg-green-500' : 'bg-gray-400'}`}
                                                >
                                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${optionalFeatures?.goals?.[key] ? 'left-7' : 'left-1'}`}></span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Transaction Features - Has Pro Gate */}
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>📝 Transaction Options</h3>
                                <div className="space-y-4">
                                    {Object.entries(OPTIONAL_FEATURE_INFO?.transactions || {}).map(([key, info]) => {
                                        const isPro = info.requiredPlan === 'pro';
                                        const hasAccess = !isPro || tier !== 'starter';
                                        return (
                                            <div key={key} className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium flex items-center gap-2" style={{ color: textColor }}>
                                                        <span>{info.icon}</span> {info.label}
                                                        {isPro && (
                                                            <span className={`text-xs px-2 py-0.5 rounded ${hasAccess ? 'bg-green-500/20 text-green-500' : 'bg-violet-500/20 text-violet-400'}`}>
                                                                {hasAccess ? '✓ Pro' : '🔒 Pro'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm opacity-70" style={{ color: textColor }}>{info.description}</div>
                                                </div>
                                                <button
                                                    onClick={() => hasAccess && updateOptionalFeature('transactions', key, !optionalFeatures?.transactions?.[key])}
                                                    disabled={!hasAccess}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${optionalFeatures?.transactions?.[key] && hasAccess ? 'bg-green-500' : 'bg-gray-400'} ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${optionalFeatures?.transactions?.[key] && hasAccess ? 'left-7' : 'left-1'}`}></span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Export Features - Has Pro Gate */}
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>📤 Export Options</h3>
                                <div className="space-y-4">
                                    {Object.entries(OPTIONAL_FEATURE_INFO?.exports || {}).map(([key, info]) => {
                                        const isPro = info.requiredPlan === 'pro';
                                        const hasAccess = !isPro || tier !== 'starter';
                                        return (
                                            <div key={key} className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium flex items-center gap-2" style={{ color: textColor }}>
                                                        <span>{info.icon}</span> {info.label}
                                                        {isPro && (
                                                            <span className={`text-xs px-2 py-0.5 rounded ${hasAccess ? 'bg-green-500/20 text-green-500' : 'bg-violet-500/20 text-violet-400'}`}>
                                                                {hasAccess ? '✓ Pro' : '🔒 Pro'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm opacity-70" style={{ color: textColor }}>{info.description}</div>
                                                </div>
                                                {info.type === 'select' ? (
                                                    <select
                                                        value={optionalFeatures?.exports?.[key] || 'DD/MM/YYYY'}
                                                        onChange={(e) => updateOptionalFeature('exports', key, e.target.value)}
                                                        className="px-3 py-1 text-sm border rounded"
                                                        style={{
                                                            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                                                            color: textColor,
                                                            borderColor: isDark ? '#555' : '#adadad'
                                                        }}
                                                    >
                                                        {info.options.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <button
                                                        onClick={() => hasAccess && updateOptionalFeature('exports', key, !optionalFeatures?.exports?.[key])}
                                                        disabled={!hasAccess}
                                                        className={`w-12 h-6 rounded-full transition-colors relative ${optionalFeatures?.exports?.[key] && hasAccess ? 'bg-green-500' : 'bg-gray-400'} ${!hasAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${optionalFeatures?.exports?.[key] && hasAccess ? 'left-7' : 'left-1'}`}></span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>App Security</h3>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium" style={{ color: textColor }}>PIN Lock</div>
                                        <div className="text-sm opacity-70" style={{ color: textColor }}>Require a 4-digit PIN to open the app</div>
                                    </div>
                                    <button
                                        onClick={() => setPinSetupMode(true)}
                                        className={`px-4 py-2 text-sm border font-semibold rounded transition-colors ${localStorage.getItem('pocketwall_pin')
                                            ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                                            : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                            }`}
                                    >
                                        {localStorage.getItem('pocketwall_pin') ? 'Disable PIN' : 'Enable PIN'}
                                    </button>
                                </div>
                            </div>

                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Password</h3>
                                <p className="text-sm opacity-70 mb-4" style={{ color: textColor }}>
                                    Change your account password via email reset.
                                </p>
                                <button
                                    onClick={handlePasswordReset}
                                    className="px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90"
                                    style={{
                                        backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                        color: textColor,
                                        borderColor: isDark ? '#555' : '#adadad'
                                    }}
                                >
                                    🔑 Send Password Reset Email
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Privacy Tab */}
                    {activeTab === 'privacy' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Privacy Settings</h3>
                                <p className="text-sm opacity-70 mb-4" style={{ color: textColor }}>
                                    Manage how your data is displayed and shared.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                                        <div>
                                            <div className="font-medium" style={{ color: textColor }}>Screen Privacy Mode</div>
                                            <div className="text-sm opacity-70" style={{ color: textColor }}>Blur sensitive numbers (Coming Soon)</div>
                                        </div>
                                        <div className="w-10 h-5 bg-gray-300 rounded-full relative">
                                            <div className="w-5 h-5 bg-white rounded-full shadow absolute left-0"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Tab */}
                    {activeTab === 'data' && (
                        <div className="max-w-2xl space-y-6">
                            {/* Cloud Sync Section */}
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg flex items-center gap-2" style={{ color: textColor }}>
                                    ☁️ Cloud Sync
                                    {currentUser && (
                                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full">
                                            Connected
                                        </span>
                                    )}
                                </h3>
                                {currentUser ? (
                                    <>
                                        <p className="text-sm mb-4 opacity-70" style={{ color: textColor }}>
                                            Your data syncs automatically to the cloud when you make changes.
                                            Login on another device to access your data anywhere.
                                        </p>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="text-sm" style={{ color: textColor }}>
                                                <span className="opacity-70">Last synced: </span>
                                                <span className="font-medium">
                                                    {(() => {
                                                        const lastSync = localStorage.getItem('pocketwall_last_sync');
                                                        if (!lastSync) return 'Never';
                                                        const date = new Date(lastSync);
                                                        return date.toLocaleString();
                                                    })()}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    toast.info('Syncing...');
                                                    const result = await DataAdapter.syncFromCloud();
                                                    if (result.success) {
                                                        toast.success('Data synced from cloud!');
                                                        window.location.reload();
                                                    } else {
                                                        toast.error('Sync failed: ' + result.message);
                                                    }
                                                } catch (error) {
                                                    toast.error('Sync failed: ' + error.message);
                                                }
                                            }}
                                            className="px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90"
                                            style={{
                                                backgroundColor: '#0078d4',
                                                color: 'white',
                                                borderColor: '#005a9e'
                                            }}
                                        >
                                            🔄 Sync Now
                                        </button>
                                    </>
                                ) : (
                                    <div className="text-sm p-4 border rounded" style={{ borderColor, backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5' }}>
                                        <p className="mb-3" style={{ color: textColor }}>
                                            ⚠️ Sign in to enable cloud sync. Your data will be automatically backed up and accessible across devices.
                                        </p>
                                        <a href="#" onClick={() => navigate('/login')} className="text-blue-500 hover:underline">
                                            Sign in to enable →
                                        </a>
                                    </div>
                                )}
                            </div>

                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Backup & Restore</h3>
                                <p className="text-sm mb-4 opacity-70" style={{ color: textColor }}>
                                    Securely backup your data to a local file.
                                </p>

                                {/* Encryption Toggle */}
                                <div className="mb-4 p-3 border rounded" style={{ borderColor, backgroundColor: isDark ? '#1e1e1e' : '#f5f5f5' }}>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={encryptBackup}
                                            onChange={(e) => setEncryptBackup(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <div>
                                            <span className="font-medium" style={{ color: textColor }}>🔐 Encrypt Backup</span>
                                            <p className="text-xs opacity-60" style={{ color: textColor }}>
                                                Protect backup with AES-256 encryption (requires password to restore)
                                            </p>
                                        </div>
                                    </label>

                                    {encryptBackup && (
                                        <input
                                            type="password"
                                            placeholder="Enter backup password"
                                            value={backupPassword}
                                            onChange={(e) => setBackupPassword(e.target.value)}
                                            className="mt-3 w-full px-3 py-2 text-sm border rounded"
                                            style={{
                                                backgroundColor: isDark ? '#252526' : '#fff',
                                                color: textColor,
                                                borderColor: isDark ? '#555' : '#adadad'
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleBackup}
                                        className="px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90"
                                        style={{
                                            backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                            color: textColor,
                                            borderColor: isDark ? '#555' : '#adadad'
                                        }}
                                    >
                                        Backup Data
                                    </button>
                                    <label className="px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90 cursor-pointer"
                                        style={{
                                            backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                            color: textColor,
                                            borderColor: isDark ? '#555' : '#adadad'
                                        }}
                                    >
                                        Restore Data
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onChange={handleRestore}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Developer Tools</h3>
                                <p className="text-sm mb-4 opacity-70" style={{ color: textColor }}>
                                    Generate sample data for testing purposes.
                                </p>
                                <button
                                    onClick={generatePersonaData}
                                    className="px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90"
                                    style={{
                                        backgroundColor: '#0078d4',
                                        color: 'white',
                                        borderColor: '#005a9e'
                                    }}
                                >
                                    Generate Sample Data
                                </button>
                            </div>

                            <div className="border p-4 rounded border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900 dark:bg-opacity-10">
                                <h3 className="font-semibold mb-4 text-lg text-red-600 dark:text-red-400">Danger Zone</h3>

                                <div className="mb-6 pb-6 border-b border-red-200 dark:border-red-800">
                                    <p className="text-sm mb-2 font-semibold" style={{ color: textColor }}>Clear User Data</p>
                                    <p className="text-sm mb-4 opacity-70" style={{ color: textColor }}>
                                        Delete all transactions, investments, and app data. Your settings (Name, Currency, Theme) will be preserved.
                                    </p>
                                    <button
                                        onClick={async () => {
                                            if (confirm('Are you sure you want to delete all user data? Settings will be kept.')) {
                                                try {
                                                    await DataAdapter.clearAllData();
                                                    toast.success('User data cleared successfully');
                                                    window.location.reload();
                                                } catch (error) {
                                                    toast.error('Failed to clear data');
                                                }
                                            }
                                        }}
                                        className="px-4 py-2 text-sm border font-semibold rounded hover:bg-red-700 transition-colors"
                                        style={{
                                            backgroundColor: '#dc2626',
                                            color: 'white',
                                            borderColor: '#b91c1c'
                                        }}
                                    >
                                        Clear Data (Keep Settings)
                                    </button>
                                </div>

                                <div>
                                    <p className="text-sm mb-2 font-semibold" style={{ color: textColor }}>Factory Reset</p>
                                    <p className="text-sm mb-4 opacity-70" style={{ color: textColor }}>
                                        Completely wipe EVERYTHING including settings, profile, and license. The app will return to its initial state.
                                    </p>
                                    <button
                                        onClick={async () => {
                                            if (confirm('FACTORY RESET: This will wipe EVERYTHING including your settings and license. Are you absolutely sure?')) {
                                                if (confirm('Final Warning: This action cannot be undone.')) {
                                                    try {
                                                        await DataAdapter.resetApp();
                                                        toast.success('App reset successfully');
                                                        window.location.reload();
                                                    } catch (error) {
                                                        toast.error('Failed to reset app');
                                                    }
                                                }
                                            }
                                        }}
                                        className="px-4 py-2 text-sm border font-semibold rounded hover:bg-red-900 transition-colors"
                                        style={{
                                            backgroundColor: '#7f1d1d',
                                            color: 'white',
                                            borderColor: '#450a0a'
                                        }}
                                    >
                                        Factory Reset (Wipe All)
                                    </button>
                                </div>
                            </div>

                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Admin Console</h3>
                                <p className="text-sm mb-4 opacity-70" style={{ color: textColor }}>
                                    Manage feature flags and application settings.
                                </p>
                                <a
                                    href="#/admin/console"
                                    className="inline-block px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90"
                                    style={{
                                        backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                        color: textColor,
                                        borderColor: isDark ? '#555' : '#adadad',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Open Admin Console
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Subscription Tab */}
                    {activeTab === 'subscription' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="border p-8 rounded text-center" style={{ backgroundColor: panelBg, borderColor }}>
                                <div className="text-4xl mb-4">💎</div>
                                <h3 className="font-semibold mb-2 text-xl" style={{ color: textColor }}>{config?.label || 'PocketWall'}</h3>
                                <p className="text-sm opacity-70 mb-6" style={{ color: textColor }}>
                                    {tier === 'starter' && !isTrial
                                        ? 'Upgrade to unlock unlimited accounts and advanced insights.'
                                        : 'You have full access to all premium features.'}
                                </p>
                                <div className="inline-block px-4 py-2 rounded bg-gray-100 text-gray-600 text-sm font-medium mb-6">
                                    Current Plan: {config?.label}
                                </div>

                                {/* Plan Timer / Expiry Info */}
                                {userSettings.licenseExpiresAt && (
                                    <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 rounded border border-blue-100 dark:border-blue-800">
                                        <div className="text-xs font-bold uppercase text-blue-500 mb-1">Plan Validity</div>
                                        <div className="text-sm font-medium" style={{ color: textColor }}>
                                            Expires on: {new Date(userSettings.licenseExpiresAt).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs opacity-70 mt-1">
                                            ({Math.ceil((new Date(userSettings.licenseExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))} days remaining)
                                        </div>
                                    </div>
                                )}

                                {/* Activation Section */}
                                {(tier === 'starter' || isTrial) && (
                                    <div>
                                        <button
                                            onClick={() => setShowActivation(true)}
                                            className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors"
                                        >
                                            Activate License
                                        </button>
                                        <p className="mt-4 text-xs opacity-50">
                                            Don't have a key? <a href="#" className="underline hover:text-blue-500">Get one here</a>
                                        </p>
                                    </div>
                                )}

                                {(!isTrial && tier !== 'starter') && (
                                    <div className="text-green-500 font-bold flex items-center justify-center gap-2">
                                        <span>✅</span> License Active
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Support Tab */}
                    {activeTab === 'support' && (
                        <div className="max-w-2xl space-y-6">
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Contact Support</h3>
                                <p className="text-sm mb-4 opacity-70" style={{ color: textColor }}>
                                    Have questions or feedback? We'd love to hear from you.
                                </p>
                                <button
                                    onClick={handleEmailSupport}
                                    className="px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90"
                                    style={{
                                        backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                        color: textColor,
                                        borderColor: isDark ? '#555' : '#adadad'
                                    }}
                                >
                                    📧 Email Support
                                </button>
                            </div>
                            <div className="border p-4 rounded" style={{ backgroundColor: panelBg, borderColor }}>
                                <h3 className="font-semibold mb-4 text-lg" style={{ color: textColor }}>Notifications</h3>
                                <button
                                    onClick={() => {
                                        NotificationManager.requestPermission().then(granted => {
                                            if (granted) {
                                                toast.success('Notifications enabled');
                                                NotificationManager.sendNotification('Test Notification', 'Notifications are working!');
                                            } else {
                                                toast.error('Permission denied');
                                            }
                                        });
                                    }}
                                    className="px-4 py-2 text-sm border font-semibold rounded hover:bg-opacity-90"
                                    style={{
                                        backgroundColor: isDark ? '#3e3e42' : '#e0e0e0',
                                        color: textColor,
                                        borderColor: isDark ? '#555' : '#adadad'
                                    }}
                                >
                                    Test Notifications
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="text-xs p-4 border-t text-center opacity-50" style={{ borderColor, color: textColor }}>
                PocketWall v1.1.0 | Build 2024.10.25
            </div>

            {pinSetupMode && (
                <PinLock
                    isDark={isDark}
                    mode={localStorage.getItem('pocketwall_pin') ? 'unlock' : 'setup'}
                    onClose={() => setPinSetupMode(false)}
                    onUnlock={() => {
                        if (confirm('Disable PIN Lock?')) {
                            localStorage.removeItem('pocketwall_pin');
                            toast.success('PIN Lock disabled');
                            setPinSetupMode(false);
                        }
                    }}
                    onSetPin={(pin) => {
                        localStorage.setItem('pocketwall_pin', pin);
                        toast.success('PIN Lock enabled');
                        setPinSetupMode(false);
                    }}
                />
            )}

            {showActivation && (
                <ActivationModal
                    isDark={isDark}
                    onClose={() => setShowActivation(false)}
                />
            )}
        </div>
    );
};

export default Settings;
