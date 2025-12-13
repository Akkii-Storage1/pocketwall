import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Home = () => {
    // Dynamic download URL from GitHub releases
    const [downloadUrl, setDownloadUrl] = useState('https://github.com/Akkii-Storage1/pocketwall/releases/latest');
    const [latestVersion, setLatestVersion] = useState('');

    useEffect(() => {
        // Fetch latest release from GitHub API
        fetch('https://api.github.com/repos/Akkii-Storage1/pocketwall/releases/latest')
            .then(res => res.json())
            .then(data => {
                if (data.assets && data.assets.length > 0) {
                    // Find the Windows EXE file
                    const exeAsset = data.assets.find(a => a.name.endsWith('.exe'));
                    if (exeAsset) {
                        setDownloadUrl(exeAsset.browser_download_url);
                    }
                }
                if (data.tag_name) {
                    setLatestVersion(data.tag_name);
                }
            })
            .catch(err => {
                console.warn('Failed to fetch latest release:', err);
                // Keep fallback URL
            });
    }, []);
    const features = [
        {
            icon: '💰',
            title: 'Smart Expense Tracking',
            description: 'Automatically categorize expenses with intelligent detection. Add transactions in seconds with our inline calculator. Track every penny across multiple accounts.',
            highlights: ['Auto-categorization', 'Inline Calculator', 'Multi-account Support']
        },
        {
            icon: '📊',
            title: 'Intelligent Budgets',
            description: 'Create monthly budgets per category with smart alerts. Get notified when you\'re close to limits. Visualize spending patterns with beautiful charts.',
            highlights: ['Category Budgets', 'Overspending Alerts', 'Progress Tracking']
        },
        {
            icon: '📈',
            title: 'Investment Portfolio',
            description: 'Track stocks from NSE/BSE with real-time prices. Monitor mutual fund NAVs automatically. See daily P&L and portfolio performance at a glance.',
            highlights: ['Real-time Prices', 'NSE/BSE Support', 'Mutual Funds']
        },
        {
            icon: '🎯',
            title: 'Financial Goals',
            description: 'Set savings goals with target dates. Track progress visually as you save. Celebrate milestones on your journey to financial freedom.',
            highlights: ['Goal Tracking', 'Visual Progress', 'Deadline Reminders']
        },
        {
            icon: '🔄',
            title: 'Bills & Subscriptions',
            description: 'Never miss a payment again. Track all recurring bills in one place. Get reminders before due dates and manage your subscriptions effortlessly.',
            highlights: ['Auto Bill Detection', 'Due Date Reminders', 'Subscription Manager']
        },
        {
            icon: '🏠',
            title: 'Net Worth & Assets',
            description: 'Track your complete wealth including real estate, vehicles, gold, and more. See your net worth grow over time with monthly insights.',
            highlights: ['Fixed Assets', 'Real Estate', 'Net Worth Tracking']
        },
        {
            icon: '📝',
            title: 'Notes & Reminders',
            description: 'Keep financial notes, set reminders, and track important dates. Never forget about that pending payment or upcoming renewal.',
            highlights: ['Quick Notes', 'Task Reminders', 'Due Date Alerts']
        },
        {
            icon: '💳',
            title: 'Debt & Loan Tracking',
            description: 'Manage money you owe and money owed to you. Track EMIs, payables, and receivables with clear due dates and payment history.',
            highlights: ['Payables', 'Receivables', 'EMI Tracking']
        },
        {
            icon: '🎁',
            title: 'Charity & Donations',
            description: 'Track your charitable contributions throughout the year. Get 80G tax benefit summaries and make a positive impact while saving taxes.',
            highlights: ['80G Tracking', 'Tax Benefits', 'Annual Summary']
        }
    ];

    const pricingPlans = [
        {
            name: 'Basic',
            price: 'Free',
            period: 'forever',
            description: 'Perfect for getting started with personal finance tracking',
            features: [
                'Unlimited Transactions',
                'Up to 3 Accounts',
                'Basic Budget Tracking',
                'Manual Categories',
                'Financial Goals',
                'Recurring Bills Tracking',
                'Local Data Storage',
                'Dark & Light Mode'
            ],
            notIncluded: ['Investment Portfolio', 'Real-time Stock Prices', 'Cloud Sync', 'Export Reports'],
            cta: 'Start Free',
            popular: false
        },
        {
            name: 'Pro',
            price: '$4.99',
            altPrice: '₹199',
            period: '/month',
            yearlyPrice: '$49/year',
            yearlyAltPrice: '₹1,499/year',
            description: 'Full power for serious money management',
            features: [
                'Everything in Basic',
                'Unlimited Accounts',
                'Investment Portfolio',
                'Real-time Stock Prices (NSE/BSE)',
                'Mutual Fund NAV Tracking',
                'Fixed Assets Management',
                'Debt & Loan Tracking',
                'Charity/80G Tracking',
                'Cloud Sync (Coming Soon)',
                'Export PDF Reports',
                'Priority Support'
            ],
            notIncluded: [],
            cta: 'Start 7-Day Free Trial',
            popular: true
        }
    ];

    return (
        <div className="overflow-hidden">
            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center relative pt-20">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-300">
                            ✨ Your finances, simplified
                        </span>

                        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                            Take Control of Your
                            <span className="block gradient-text">Financial Future</span>
                        </h1>

                        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
                            Track expenses, manage budgets, and grow your wealth with PocketWall —
                            the ultimate personal finance companion for Windows.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <a href="#download" className="btn-primary text-lg inline-flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Free
                            </a>
                            <a href="#features" className="btn-secondary text-lg inline-flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                See Features
                            </a>
                        </div>

                        {/* Trust Badges */}
                        <div className="mt-10 flex items-center justify-center gap-6 text-gray-500 text-sm">
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                100% Secure
                            </span>
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                                </svg>
                                Offline First
                            </span>
                            <span className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                7-Day Free Trial
                            </span>
                        </div>
                    </motion.div>

                    {/* App Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="mt-16"
                    >
                        <div className="relative max-w-4xl mx-auto">
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl blur-2xl opacity-30"></div>
                            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-2 border border-white/10">
                                <div className="bg-slate-900 rounded-xl overflow-hidden">
                                    {/* Mock App Screenshot */}
                                    <div className="h-[400px] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                                                <span className="text-4xl font-bold text-white">P</span>
                                            </div>
                                            <p className="text-gray-400">App Preview Coming Soon</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Everything You Need to
                            <span className="gradient-text"> Master Your Money</span>
                        </h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                            Powerful features designed to give you complete control over your finances.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/50 transition-all duration-300 hover:bg-white/[0.08]"
                            >
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                                <p className="text-gray-400 text-sm mb-4">{feature.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {feature.highlights.map((highlight) => (
                                        <span
                                            key={highlight}
                                            className="px-2 py-1 text-xs bg-violet-500/10 text-violet-300 rounded-md border border-violet-500/20"
                                        >
                                            {highlight}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 relative">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            Simple, <span className="gradient-text">Transparent Pricing</span>
                        </h2>
                        <p className="text-xl text-gray-400">
                            Start free. Upgrade when you're ready for more.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {pricingPlans.map((plan, index) => (
                            <motion.div
                                key={plan.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className={`relative p-8 rounded-2xl ${plan.popular
                                    ? 'bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border-2 border-violet-500/50'
                                    : 'bg-white/5 border border-white/10'
                                    }`}
                            >
                                {plan.popular && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-xs font-semibold rounded-full">
                                        RECOMMENDED
                                    </span>
                                )}

                                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>

                                <div className="mb-4">
                                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                                    <span className="text-gray-400">{plan.period}</span>
                                    {plan.altPrice && (
                                        <span className="block text-sm text-gray-500 mt-1">
                                            ({plan.altPrice}{plan.period})
                                        </span>
                                    )}
                                </div>

                                {plan.yearlyPrice && (
                                    <div className="mb-6 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                        <span className="text-green-400 text-sm">
                                            💰 Save 17% with yearly: {plan.yearlyPrice}
                                        </span>
                                    </div>
                                )}

                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start text-gray-300 text-sm">
                                            <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                    {plan.notIncluded.map((feature) => (
                                        <li key={feature} className="flex items-start text-gray-500 text-sm">
                                            <svg className="w-5 h-5 text-gray-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Link
                                    to={plan.popular ? "/signup" : "#download"}
                                    className={`block text-center py-3 px-6 rounded-xl font-semibold transition-all ${plan.popular
                                        ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white hover:opacity-90 hover:scale-105'
                                        : 'bg-white/10 text-white hover:bg-white/20'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    {/* FAQ/Trust */}
                    <div className="mt-12 text-center text-gray-400 text-sm">
                        <p>🔒 No credit card required for trial • Cancel anytime • 100% secure payments</p>
                    </div>
                </div>
            </section>

            {/* Download Section */}
            <section id="download" className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="relative p-12 md:p-16 rounded-3xl overflow-hidden"
                    >
                        {/* Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/30 to-cyan-600/30"></div>
                        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"></div>

                        <div className="relative text-center">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                Ready to Take Control?
                            </h2>
                            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10">
                                Download PocketWall for free and start your journey to financial freedom today.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <a
                                    href={downloadUrl}
                                    className="inline-flex items-center justify-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all transform hover:scale-105"
                                >
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
                                    </svg>
                                    Download for Windows {latestVersion && `(${latestVersion})`}
                                </a>
                                <Link
                                    to="/signup"
                                    className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Create Account
                                </Link>
                            </div>

                            <p className="mt-6 text-sm text-gray-400">
                                Windows 10+ • ~100MB • Free forever with Pro upgrade option
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default Home;
