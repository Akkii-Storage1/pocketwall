import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budget from './pages/Budget';
import Investments from './pages/Investments';
import Recurring from './pages/Recurring';
import Goals from './pages/Goals';
import Payees from './pages/Payees';
import Accounts from './pages/Accounts';
import Reconcile from './pages/Reconcile';
import Reports from './pages/Reports';
import Portfolio from './pages/Portfolio';
import Insights from './pages/Insights';
import DataGallery from './pages/DataGallery';
import Notifications from './pages/Notifications';
import Achievements from './pages/Achievements';
import Settings from './pages/Settings';
import TaxReport from './components/TaxReport';
import InvestmentReport from './components/InvestmentReport';
import SharedExpenses from './pages/SharedExpenses';
import BottomNav from './components/BottomNav';
import DataAdapter, { initRealtimeListeners } from './utils/dataAdapter';
import MigrationModal from './components/MigrationModal';
import MigrationManager from './utils/MigrationManager';
import { detectRecurringBills } from './utils/insights';
import NotificationManager from './utils/NotificationManager';
import PinLock from './components/PinLock';
import { useFeature } from './context/FeatureContext';
import SubscriptionModal from './components/SubscriptionModal';
import FeatureGate from './components/FeatureGate';
import AdminDashboard from './pages/AdminDashboard';
import MutualFunds from './pages/MutualFunds';
// Crypto is now part of Markets page
import Calculators from './pages/Calculators';
import Reminders from './pages/Reminders';
import Loans from './pages/Loans';
import Assets from './pages/Assets';
import Charity from './pages/Charity';
import Markets from './pages/Markets';
import Watchlist from './pages/Watchlist';
import FinancialHealth from './pages/FinancialHealth';
import CalculatorWidget from './components/CalculatorWidget';

import { useToast } from './components/Toast';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';

// Auth Imports
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { TrialExpiredOverlay } from './components/FeatureGate';
import Celebration from './components/Celebration';
import AIAssistant from './components/AIAssistant';
import SIPManager from './components/SIPManager';
import SIPDueModal from './components/SIPDueModal';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { currentUser } = useAuth();
    if (!currentUser) {
        return <Navigate to="/login" />;
    }
    return children;
};



const MainLayout = () => {
    const { currentUser, logout } = useAuth(); // Get currentUser and logout from AuthContext
    const { tier, isTrial, trialInfo, config, featureFlags } = useFeature();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem('pocketwall_pin'));
    const [isPrivacyMode, setIsPrivacyMode] = useState(() => localStorage.getItem('privacy_mode') === 'true');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [showShortcutsModal, setShowShortcutsModal] = useState(false);
    const [showMigrationModal, setShowMigrationModal] = useState(false); // New State
    const [currency, setCurrency] = useState('INR');

    // SIP System State
    const [showSIPManager, setShowSIPManager] = useState(false);
    const [showSIPDueModal, setShowSIPDueModal] = useState(false);
    const [dueSIPs, setDueSIPs] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [appearance, setAppearance] = useState({
        fontSize: 'medium',
        animations: true,
        positiveColor: '#10b981',
        negativeColor: '#ef4444'
    });
    const toast = useToast();

    // Check Migration Status & Init Listeners
    useEffect(() => {
        const checkMigration = async () => {
            if (currentUser) {
                const isMigrated = await MigrationManager.checkMigrationStatus(currentUser.uid);
                // If NOT migrated, show the modal
                if (!isMigrated) {
                    setShowMigrationModal(true);
                } else {
                    // If migrated, start listening for real-time updates
                    initRealtimeListeners(currentUser.uid);
                }
            }
        };
        checkMigration();
    }, [currentUser]);

    // Global Data Persistence Notification
    useEffect(() => {
        const handleDataSaved = (e) => {
            if (e.detail && e.detail.message) {
                toast.success(e.detail.message);
            }
        };
        document.addEventListener('dataSaved', handleDataSaved);
        return () => document.removeEventListener('dataSaved', handleDataSaved);
    }, [toast]);

    useEffect(() => {
        localStorage.setItem('privacy_mode', isPrivacyMode);
    }, [isPrivacyMode]);

    // Load User Settings (Currency) & Listen for Changes
    useEffect(() => {
        const loadSettings = async () => {
            const settings = await DataAdapter.getUserSettings();
            if (settings.defaultCurrency) {
                setCurrency(settings.defaultCurrency);
            }
            setAppearance({
                fontSize: settings.fontSize || 'medium',
                animations: settings.animations !== false,
                positiveColor: settings.positiveColor || '#10b981',
                negativeColor: settings.negativeColor || '#ef4444'
            });
        };
        loadSettings();

        const handleSettingsChanged = (e) => {
            const settings = e.detail;
            if (settings) {
                if (settings.defaultCurrency) setCurrency(settings.defaultCurrency);
                setAppearance({
                    fontSize: settings.fontSize || 'medium',
                    animations: settings.animations !== false,
                    positiveColor: settings.positiveColor || '#10b981',
                    negativeColor: settings.negativeColor || '#ef4444'
                });
            }
        };

        document.addEventListener('settingsChanged', handleSettingsChanged);
        return () => document.removeEventListener('settingsChanged', handleSettingsChanged);
    }, []);

    // FIX: Global focus restoration for Electron input blocking issue
    useEffect(() => {
        const handleWindowFocus = () => {
            // Force repaint to fix input focus issues
            document.body.style.display = 'none';
            document.body.offsetHeight; // Force reflow
            document.body.style.display = '';

            // If there's an active input, blur and refocus it
            if (document.activeElement && document.activeElement.tagName === 'INPUT') {
                const active = document.activeElement;
                active.blur();
                requestAnimationFrame(() => active.focus());
            }
        };

        // Listen for Electron window focus events
        if (window.api && window.api.onWindowFocus) {
            window.api.onWindowFocus(handleWindowFocus);
        }

        // Also listen for native focus events
        window.addEventListener('focus', handleWindowFocus);

        return () => {
            window.removeEventListener('focus', handleWindowFocus);
            if (window.api && window.api.removeWindowFocusListener) {
                window.api.removeWindowFocusListener();
            }
        };
    }, []);

    // Sync URL with Active Tab
    useEffect(() => {
        const path = location.pathname.substring(1); // Remove leading /
        if (path && path !== activeTab) {
            setActiveTab(path);
        } else if (!path && activeTab !== 'dashboard') {
            // Default route
            setActiveTab('dashboard');
        }
    }, [location]);

    // Menu State
    const [activeMenu, setActiveMenu] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Notifications
    useEffect(() => {
        NotificationManager.runChecks();

        // Check for due SIPs on app start
        const checkDueSIPs = async () => {
            try {
                const sips = await DataAdapter.getDueSIPs();
                if (sips && sips.length > 0) {
                    setDueSIPs(sips);
                    setShowSIPDueModal(true);
                }
                // Also load accounts for SIP source selection
                const txns = await DataAdapter.getTransactions();
                const uniqueAccounts = [...new Set(txns.map(t => t.account).filter(Boolean))].map(name => ({ name }));
                setAccounts(uniqueAccounts);
            } catch (error) {
                console.error('Error checking due SIPs:', error);
            }
        };
        checkDueSIPs();

        // Event listener for opening SIP Manager from other pages
        const handleOpenSIPManager = () => setShowSIPManager(true);
        window.addEventListener('openSIPManager', handleOpenSIPManager);

        const interval = setInterval(() => {
            NotificationManager.runChecks();
        }, 5 * 60 * 1000); // Check every 5 minutes
        return () => {
            clearInterval(interval);
            window.removeEventListener('openSIPManager', handleOpenSIPManager);
        };
    }, []);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Calculator Shortcut (Alt+C)
            if (e.altKey && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                setShowCalculator(prev => !prev);
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1': handleNav('dashboard'); break;
                    case '2': handleNav('transactions'); break;
                    case '3': handleNav('budget'); break;
                    case '4': handleNav('recurring'); break;
                    case '5': handleNav('investments'); break;
                    case '6': handleNav('settings'); break;
                    case '7': handleNav('goals'); break;
                    case '8': handleNav('reports'); break;
                    case '9': handleNav('portfolio'); break;
                    // Mnemonic Shortcuts
                    case 'd': case 'D': handleNav('dashboard'); break;
                    case 't': case 'T': handleNav('transactions'); break;
                    case 'r': case 'R': handleNav('recurring'); break;
                    case 'i': case 'I': handleNav('investments'); break;
                    case 'g': case 'G': handleNav('goals'); break;
                    case 'e': case 'E': handleNav('reports'); break;
                    case 'p': case 'P': handleNav('portfolio'); break;
                    case 'a': case 'A': handleNav('achievements'); break;
                    case 's': case 'S':
                        e.preventDefault();
                        handleNav('settings');
                        break;
                    case 'n':
                    case 'N':
                        e.preventDefault();
                        handleNav('transactions');
                        // Dispatch event to open modal after navigation
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('openNewTransaction'));
                        }, 100);
                        break;
                    case '=':
                    case '+':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            const currentZoom = parseFloat(document.body.style.zoom || '100') / 100;
                            document.body.style.zoom = `${Math.min(currentZoom + 0.1, 2) * 100}%`;
                        }
                        break;
                    case '-':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            const currentZoom = parseFloat(document.body.style.zoom || '100') / 100;
                            document.body.style.zoom = `${Math.max(currentZoom - 0.1, 0.5) * 100}%`;
                        }
                        break;
                    case '0':
                        if (e.ctrlKey) {
                            e.preventDefault();
                            document.body.style.zoom = '100%';
                        }
                        break;
                    default: break;
                }
            }
            // Admin Shortcut (Ctrl + Shift + A)
            if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
                e.preventDefault();
                e.preventDefault();
                handleNav('admin');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isDark = theme === 'dark';

    const renderPage = () => {
        const commonProps = {
            isDark,
            isPrivacyMode,
            animationsEnabled: appearance.animations,
            currency
        };

        switch (activeTab) {
            case 'dashboard': return <Dashboard {...commonProps} />;
            case 'transactions': return <Transactions {...commonProps} />;
            case 'budget': return <Budget {...commonProps} />;
            case 'recurring': return <Recurring {...commonProps} />;
            case 'investments': return <FeatureGate feature="investments"><Investments {...commonProps} /></FeatureGate>;
            case 'mutualfunds': return <FeatureGate feature="investments"><MutualFunds {...commonProps} /></FeatureGate>;
            // crypto removed - now in Markets page
            case 'settings': return <Settings {...commonProps} theme={theme} setTheme={setTheme} />;
            case 'shared': return <SharedExpenses {...commonProps} />;
            case 'admin': return <AdminDashboard isDark={isDark} />;
            case 'goals': return <Goals {...commonProps} />;
            case 'reports': return <Reports {...commonProps} setActiveTab={setActiveTab} />;
            case 'taxreport': return <Reports {...commonProps} setActiveTab={setActiveTab} view="taxreport" />;
            case 'investmentreport': return <Reports {...commonProps} setActiveTab={setActiveTab} view="investmentreport" />;
            case 'portfolio': return <FeatureGate feature="investments"><Portfolio {...commonProps} /></FeatureGate>;
            case 'gallery': return <DataGallery {...commonProps} />;
            case 'insights': return <Insights {...commonProps} />;
            case 'achievements': return <Achievements {...commonProps} />;
            case 'notifications': return <Notifications {...commonProps} />;
            case 'payees': return <Payees {...commonProps} />;
            case 'accounts': return <Accounts {...commonProps} />;
            case 'reconcile': return <Reconcile {...commonProps} />;
            case 'calculators': return <Calculators isDark={isDark} currency={currency} />;
            case 'reminders': return <Reminders isDark={isDark} />;
            case 'loans': return <FeatureGate feature="investments"><Loans isDark={isDark} /></FeatureGate>;
            case 'assets': return <FeatureGate feature="investments"><Assets isDark={isDark} /></FeatureGate>;
            case 'charity': return <Charity isDark={isDark} />;
            case 'markets': return <Markets isDark={isDark} isPrivacyMode={isPrivacyMode} setActiveTab={setActiveTab} />;
            case 'watchlist': return <Watchlist isDark={isDark} isPrivacyMode={isPrivacyMode} />;
            case 'financialhealth': return <FinancialHealth {...commonProps} />;
            default: return <Dashboard {...commonProps} />;
        }
    };
    const handleMenuClick = (menuName) => {
        setActiveMenu(activeMenu === menuName ? null : menuName);
    };

    const handleMenuAction = (action) => {
        setActiveMenu(null);
        switch (action) {
            case 'exit':
                if (confirm('Exit PocketWall?')) window.close();
                break;
            case 'logout':
                if (confirm('Are you sure you want to sign out?')) {
                    logout();
                    navigate('/login');
                }
                break;
            case 'toggleTheme':
                setTheme(prev => prev === 'light' ? 'dark' : 'light');
                break;
            case 'zoomIn':
                document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) + 0.1);
                break;
            case 'zoomOut':
                document.body.style.zoom = (parseFloat(document.body.style.zoom || 1) - 0.1);
                break;
            case 'resetZoom':
                document.body.style.zoom = 1;
                break;
            case 'shortcuts':
                setShowShortcutsModal(true);
                break;
            case 'about':
                alert('PocketWall v1.1 (Pro)\\n\\nThe Ultimate Personal Finance Tool.\\n\\n(c) 2024 PocketWall Inc.');
                break;
            case 'export':
                if (activeTab !== 'transactions') {
                    setActiveTab('transactions');
                    setTimeout(() => alert('Please use the "Export CSV" button in the Transactions tab.'), 100);
                } else {
                    alert('Please use the "Export CSV" button in the toolbar.');
                }
                break;
            default: break;
        }
    };

    const handleNav = (tab) => {
        setActiveTab(tab);
        navigate(`/${tab}`);
        setActiveMenu(null);
    };

    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const menuBg = isDark ? '#3e3e42' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const dropdownBg = isDark ? '#1e1e1e' : '#ffffff';
    const dropdownBorder = isDark ? '#555' : '#a0a0a0';

    const MenuButton = ({ label, name }) => (
        <div className="relative">
            <button
                onClick={() => handleMenuClick(name)}
                className={`px-3 py-1 hover:bg-opacity-10 hover:bg-blue-500 ${activeMenu === name ? 'bg-blue-200 text-black' : ''}`}
                style={{ color: activeMenu === name ? '#000' : textColor }}
            >
                {label}
            </button>
            {activeMenu === name && (
                <div
                    className="absolute left-0 top-full shadow-xl border min-w-[150px] z-50 flex flex-col py-1"
                    style={{ backgroundColor: dropdownBg, borderColor: dropdownBorder }}
                >
                    {name === 'file' && (
                        <>
                            {currentUser && (
                                <>
                                    <div className="px-4 py-1 text-xs opacity-50" style={{ color: textColor }}>
                                        👤 {currentUser.email}
                                    </div>
                                    <div className="border-b my-1" style={{ borderColor: dropdownBorder }}></div>
                                </>
                            )}
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('export')}>Export Data...</button>
                            <div className="border-b my-1" style={{ borderColor: dropdownBorder }}></div>
                            <button className="px-4 py-1 text-left hover:bg-red-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('logout')}>🚪 Sign Out</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('exit')}>Exit</button>
                        </>
                    )}
                    {name === 'edit' && (
                        <>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs opacity-50 cursor-not-allowed" style={{ color: textColor }}>Undo (Ctrl+Z)</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs opacity-50 cursor-not-allowed" style={{ color: textColor }}>Redo (Ctrl+Y)</button>
                            <div className="border-b my-1" style={{ borderColor: dropdownBorder }}></div>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs opacity-50 cursor-not-allowed" style={{ color: textColor }}>Cut</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs opacity-50 cursor-not-allowed" style={{ color: textColor }}>Copy</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs opacity-50 cursor-not-allowed" style={{ color: textColor }}>Paste</button>
                        </>
                    )}
                    {name === 'view' && (
                        <>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('toggleTheme')}>Toggle Theme</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => setIsPrivacyMode(!isPrivacyMode)}>
                                {isPrivacyMode ? 'Disable Screen Privacy' : 'Enable Screen Privacy'}
                            </button>
                            <div className="border-b my-1" style={{ borderColor: dropdownBorder }}></div>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('zoomIn')}>Zoom In</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('zoomOut')}>Zoom Out</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('resetZoom')}>Reset Zoom</button>
                        </>
                    )}
                    {name === 'tools' && (
                        <>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('accounts')}>Accounts</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('reconcile')}>Reconciliation</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('payees')}>Payee Manager</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('reminders')}>Notes & Reminders</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('loans')}>Debt & Loans</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('charity')}>Charity & Impact</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('financialhealth')}>💚 Financial Health</button>
                            <div className="border-b my-1" style={{ borderColor: dropdownBorder }}></div>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('insights')}>🤖 Insights</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('achievements')}>🏆 Achievements</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('notifications')}>🔔 Alerts</button>
                            <div className="border-b my-1" style={{ borderColor: dropdownBorder }}></div>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => setShowCalculator(!showCalculator)}>Floating Calculator</button>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleNav('settings')}>Options...</button>
                        </>
                    )}
                    {name === 'help' && (
                        <>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('shortcuts')}>Keyboard Shortcuts</button>
                            <div className="border-b my-1" style={{ borderColor: dropdownBorder }}></div>
                            <button className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }} onClick={() => handleMenuAction('about')}>About PocketWall</button>
                        </>
                    )}
                    {name === 'investments' && (
                        <>
                            <button onClick={() => handleNav('investments')} className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }}>Stocks & ETFs</button>
                            <button onClick={() => handleNav('mutualfunds')} className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }}>Mutual Funds</button>
                            <button onClick={() => { setActiveMenu(null); setShowSIPManager(true); }} className="px-4 py-1 text-left hover:bg-green-500 hover:text-white text-xs font-medium" style={{ color: textColor }}>🔄 SIP Manager</button>
                            <div className="border-b my-1" style={{ borderColor: dropdownBorder }}></div>
                            <button onClick={() => handleNav('markets')} className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }}>Markets</button>
                            <button onClick={() => handleNav('watchlist')} className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }}>👁️ Watchlist</button>
                            <button onClick={() => handleNav('assets')} className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }}>Fixed Assets</button>
                            <button onClick={() => handleNav('portfolio')} className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }}>My Portfolio</button>
                        </>
                    )}
                    {name === 'mutualfunds' && (
                        <>
                            <button onClick={() => handleNav('mutualfunds')} className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }}>Search Funds</button>
                            <button onClick={() => handleNav('mutualfunds')} className="px-4 py-1 text-left hover:bg-blue-500 hover:text-white text-xs" style={{ color: textColor }}>SIP Calculator</button>
                        </>
                    )}
                </div>
            )}
        </div>
    );

    // Apply Font Size to Root for REM scaling
    useEffect(() => {
        const root = document.documentElement;
        switch (appearance.fontSize) {
            case 'small': root.style.fontSize = '14px'; break;
            case 'large': root.style.fontSize = '18px'; break;
            default: root.style.fontSize = '16px'; break;
        }
    }, [appearance.fontSize]);

    const getFontSize = () => {
        // This is now handled by root font size, but we can keep this for inline styles if needed
        // or just return undefined to let inheritance work
        return undefined;
    };

    return (
        <div className={`flex flex-col h-screen ${isPrivacyMode ? 'privacy-mode' : ''} ${isDark ? 'dark' : ''}`}
            style={{
                fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif',
                backgroundColor: bgColor,
                fontSize: getFontSize(),
                '--positive-color': appearance.positiveColor,
                '--negative-color': appearance.negativeColor,
                '--transition-speed': appearance.animations ? '0.3s' : '0s',
                color: textColor
            }}>
            {isLocked && (
                <PinLock
                    isDark={isDark}
                    mode="unlock"
                    onUnlock={() => setIsLocked(false)}
                />
            )}
            {/* Menu Bar */}
            <div
                ref={menuRef}
                className="flex items-center border-b px-1 select-none"
                style={{
                    backgroundColor: menuBg,
                    borderColor: isDark ? '#1e1e1e' : '#d4d4d4',
                    height: '24px',
                    fontSize: '11px'
                }}
            >
                <MenuButton label="File" name="file" />
                <MenuButton label="Edit" name="edit" />
                <MenuButton label="View" name="view" />
                <MenuButton label="Tools" name="tools" />
                <MenuButton label="Help" name="help" />
                <MenuButton label="Investments" name="investments" />
                {isTrial && (
                    <span className="ml-auto mr-4 text-orange-400 font-bold animate-pulse text-[10px] bg-orange-500/20 px-2 py-0.5 rounded">
                        ⏱️ Trial: {trialInfo.remainingHours > 24
                            ? `${Math.ceil(trialInfo.remainingHours / 24)} days`
                            : `${Math.ceil(trialInfo.remainingHours)}h`} left
                    </span>
                )}
                {!isTrial && <div className="ml-auto" />} {/* Spacer when no trial */}
                <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="mr-4 px-2 py-0.5 text-[10px] bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold rounded shadow hover:shadow-md transition-all"
                >
                    ⭐ Upgrade
                </button>
                <span className="mr-2 text-[10px] opacity-50" style={{ color: textColor }}>Ctrl+1..8 to Navigate</span>
            </div>

            {/* Toolbar (Desktop Only) */}
            <div
                className="hidden md:flex items-center gap-1 px-2 py-1 border-b overflow-x-auto"
                style={{
                    backgroundColor: menuBg,
                    borderColor: isDark ? '#1e1e1e' : '#d4d4d4'
                }}
            >
                {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'transactions', label: 'Transactions' },
                    { id: 'budget', label: 'Budget' },
                    { id: 'recurring', label: 'Bills & Recurring' },
                    { id: 'investments', label: 'Investments' },
                    { id: 'mutualfunds', label: 'Mutual Funds', feature: 'mutual_funds' },

                    { id: 'markets', label: '📊 Markets' },
                    { id: 'goals', label: 'Goals' },
                    { id: 'shared', label: '👥 Shared' },
                    { id: 'reports', label: 'Reports' },
                    { id: 'portfolio', label: '💰 Portfolio' },
                    { id: 'gallery', label: '📊 Gallery' },
                    { id: 'calculators', label: '🧮 Calculators' },
                    { id: 'settings', label: '⚙️ Settings' },
                ].filter(item => !item.feature || featureFlags[item.feature]).map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleNav(tab.id)}
                            className="relative px-3 py-1 text-xs rounded-md transition-colors"
                            style={{
                                color: isActive ? '#ffffff' : textColor,
                            }}
                        >
                            {isActive && (
                                <>
                                    {appearance.animations ? (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 rounded-md"
                                            style={{
                                                backgroundColor: isDark ? '#007acc' : '#2563eb',
                                                zIndex: 0
                                            }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        />
                                    ) : (
                                        <div
                                            className="absolute inset-0 rounded-md"
                                            style={{
                                                backgroundColor: isDark ? '#007acc' : '#2563eb',
                                                zIndex: 0
                                            }}
                                        />
                                    )}
                                </>
                            )}
                            <span className="relative z-10 font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto pb-[60px] md:pb-0">
                {renderPage()}
            </div>

            {/* Bottom Nav (Mobile Only) */}
            <div className="md:hidden">
                <BottomNav activeTab={activeTab} setActiveTab={handleNav} isDark={isDark} />
            </div>

            {/* Status Bar */}
            <div
                className="hidden md:flex gap-4 px-2 py-1 border-t text-[10px] opacity-70 items-center justify-between"
                style={{
                    backgroundColor: menuBg,
                    borderColor: isDark ? '#1e1e1e' : '#d4d4d4',
                    color: textColor
                }}
            >
                <div className="flex gap-4">
                    <span>Ready</span>
                    <span>PocketWall v1.1 ({config?.label || 'Loading...'})</span>
                </div>
                <div className="flex gap-4">
                    {isPrivacyMode && <span className="text-red-500 font-bold">PRIVACY MODE ON</span>}
                    <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                    <span className="opacity-50">|</span>
                    <span className="block sm:hidden">Mobile (XS)</span>
                    <span className="hidden sm:block md:hidden">Tablet (SM)</span>
                    <span className="hidden md:block lg:hidden">Laptop (MD)</span>
                    <span className="hidden lg:block xl:hidden">Desktop (LG)</span>
                    <span className="hidden xl:block">Large (XL)</span>
                </div>
            </div>

            {/* Trial Expired Overlay */}
            <TrialExpiredOverlay isDark={isDark} />

            {/* Celebration on Pro Activation */}
            <Celebration />

            {/* AI Assistant - Smart Command Wizard */}
            <AIAssistant isDark={isDark} />

            {showUpgradeModal && <SubscriptionModal onClose={() => setShowUpgradeModal(false)} isDark={isDark} />}
            {showMigrationModal && <MigrationModal onClose={() => setShowMigrationModal(false)} />}
            <CalculatorWidget isOpen={showCalculator} onClose={() => setShowCalculator(false)} isDark={isDark} />

            {/* Keyboard Shortcuts Modal */}
            {showShortcutsModal && (
                <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} isDark={isDark} />
            )}

            {/* SIP Manager Modal */}
            <SIPManager
                isOpen={showSIPManager}
                onClose={() => setShowSIPManager(false)}
                isDark={isDark}
                currency={currency}
                accounts={accounts}
            />

            {/* SIP Due Modal (shows on app start if SIPs are due) */}
            <SIPDueModal
                isOpen={showSIPDueModal}
                onClose={() => setShowSIPDueModal(false)}
                dueSIPs={dueSIPs}
                onUpdate={async () => {
                    const sips = await DataAdapter.getDueSIPs();
                    setDueSIPs(sips);
                }}
                isDark={isDark}
                accounts={accounts}
            />
        </div>
    );
}

const App = () => {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </AuthProvider>
    );
};

export default App;
