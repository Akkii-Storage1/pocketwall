import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Activity } from 'lucide-react';

const Card = ({ title, amount, trend, trendUp, icon: Icon, color }) => (
    <div className="bg-gray-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${color} bg-opacity-20 text-white`}>
                <Icon size={24} className="text-white" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${trendUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {trend}
            </div>
        </div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <h2 className="text-3xl font-bold text-white tracking-tight group-hover:scale-105 transition-transform origin-left">{amount}</h2>
    </div>
);

const Dashboard = () => {
    return (
        <div className="p-8 w-full h-full overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome back, User</h1>
                    <p className="text-gray-400">Here's what's happening with your finance today.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/25">
                        + Add Transaction
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card
                    title="Total Balance"
                    amount="$124,500.00"
                    trend="+12.5%"
                    trendUp={true}
                    icon={Wallet}
                    color="bg-blue-500"
                />
                <Card
                    title="Monthly Expenses"
                    amount="$2,450.00"
                    trend="-4.2%"
                    trendUp={false}
                    icon={CreditCard}
                    color="bg-purple-500"
                />
                <Card
                    title="Investment Portfolio"
                    amount="$85,200.00"
                    trend="+8.1%"
                    trendUp={true}
                    icon={Activity}
                    color="bg-emerald-500"
                />
            </div>

            {/* Main Content Area - Placeholder for Charts */}
            <div className="grid grid-cols-3 gap-6 h-96">
                <div className="col-span-2 bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/5 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Cash Flow</h3>
                    <div className="w-full h-full flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-700 rounded-xl">
                        Chart Area (Recharts will go here)
                    </div>
                </div>
                <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl border border-white/5 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                        <DollarSign size={20} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">Grocery Store</p>
                                        <p className="text-xs text-gray-500">Today, 10:23 AM</p>
                                    </div>
                                </div>
                                <span className="text-red-400 font-medium">-$120.50</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
