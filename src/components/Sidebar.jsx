import React from 'react';
import { Home, PieChart, DollarSign, TrendingUp, Settings, LogOut } from 'lucide-react';

const Sidebar = () => {
    const menuItems = [
        { icon: Home, label: 'Dashboard', active: true },
        { icon: DollarSign, label: 'Transactions', active: false },
        { icon: PieChart, label: 'Budget', active: false },
        { icon: TrendingUp, label: 'Investments', active: false },
    ];

    return (
        <div className="h-screen w-64 bg-gray-900/50 backdrop-blur-xl border-r border-white/10 flex flex-col text-white">
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <span className="font-bold text-lg">P</span>
                </div>
                <span className="font-bold text-xl tracking-tight">PocketWall</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${item.active
                                ? 'bg-blue-600/20 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.1)] border border-blue-500/10'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <item.icon size={20} className={`transition-transform group-hover:scale-110 ${item.active ? 'text-blue-400' : ''}`} />
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-white/5">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all">
                    <Settings size={20} />
                    <span className="font-medium">Settings</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
