import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
    const { currentUser, userPlan, trialDaysLeft, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const getPlanBadge = () => {
        switch (userPlan) {
            case 'pro':
                return (
                    <span className="px-3 py-1 bg-gradient-to-r from-violet-600 to-cyan-500 text-white text-sm font-semibold rounded-full">
                        PRO
                    </span>
                );
            case 'trial':
                return (
                    <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-sm font-semibold rounded-full border border-yellow-500/30">
                        ⏱️ Trial: {trialDaysLeft} days left
                    </span>
                );
            default:
                return (
                    <span className="px-3 py-1 bg-gray-500/20 text-gray-300 text-sm font-semibold rounded-full">
                        FREE
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                            <p className="text-gray-400">Manage your PocketWall account</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Account Card */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-full flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">
                                    {currentUser?.email?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium">{currentUser?.email}</p>
                                <div className="mt-1">{getPlanBadge()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Plan Card */}
                    <div className="glass rounded-2xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Your Plan</h2>

                        {userPlan === 'pro' ? (
                            <div className="text-center py-4">
                                <div className="text-4xl mb-2">🎉</div>
                                <p className="text-white font-semibold">You're on the Pro Plan!</p>
                                <p className="text-gray-400 text-sm mt-1">Enjoy all premium features</p>
                            </div>
                        ) : (
                            <>
                                {userPlan === 'trial' && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                                        <p className="text-yellow-300">
                                            ⏱️ Your trial expires in <strong>{trialDaysLeft} days</strong>.
                                            Upgrade now to keep Pro features!
                                        </p>
                                    </div>
                                )}

                                {userPlan === 'free' && (
                                    <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4 mb-4">
                                        <p className="text-gray-300">
                                            You're on the Free plan. Upgrade to Pro to unlock all features!
                                        </p>
                                    </div>
                                )}

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-xl p-4">
                                        <p className="text-gray-400 text-sm">Monthly</p>
                                        <p className="text-2xl font-bold text-white">$4.99<span className="text-sm text-gray-400">/mo</span></p>
                                    </div>
                                    <div className="bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border border-violet-500/30 rounded-xl p-4">
                                        <p className="text-violet-300 text-sm">Yearly (Save 17%)</p>
                                        <p className="text-2xl font-bold text-white">$49<span className="text-sm text-gray-400">/year</span></p>
                                    </div>
                                </div>

                                <button className="w-full mt-4 bg-gradient-to-r from-violet-600 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:opacity-90 transition-all">
                                    Upgrade to Pro
                                </button>
                            </>
                        )}
                    </div>

                    {/* Download Card */}
                    <div className="glass rounded-2xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Download App</h2>
                        <p className="text-gray-400 mb-4">
                            Get the desktop app to start tracking your finances. Your account will sync automatically.
                        </p>
                        <a
                            href="https://github.com/Akkii-Storage1/pocketwall/releases/download/v1.2.3/PocketWall.Setup.1.2.3.exe"
                            className="inline-flex items-center gap-3 bg-white text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                            </svg>
                            Download for Windows
                        </a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
