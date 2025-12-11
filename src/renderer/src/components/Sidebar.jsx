import React from 'react';

const Sidebar = ({ activeTab, setActiveTab, isDark }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'transactions', label: 'Transactions' },
        { id: 'budget', label: 'Budget' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'goals', label: 'Goals' },
        { id: 'investments', label: 'Investments' },
        { id: 'reports', label: 'Reports' },
        { id: 'taxreport', label: 'Tax Report' },
        { id: 'investmentreport', label: 'Inv. Report' },
        { id: 'shared', label: 'Shared Exp.' },
    ];

    const bgColor = isDark ? 'bg-[#3c3c3c]' : 'bg-[#c0c0c0]';
    const borderColor = isDark ? 'border-[#1a1a1a]' : 'border-[#808080]';
    const textColor = isDark ? 'text-white' : 'text-black';
    const selectedBg = isDark ? 'bg-[#0078d7]' : 'bg-[#000080]';

    return (
        <div className={`h-screen w-48 ${bgColor} border-r-2 ${borderColor} flex flex-col`}>
            {/* Title Bar */}
            <div className={`${isDark ? 'bg-[#0078d7]' : 'bg-gradient-to-r from-[#0055aa] to-[#0088dd]'} p-2 border-b-2 ${isDark ? 'border-[#005a9e]' : 'border-[#000080]'}`}>
                <h1 className="text-white font-bold text-sm">PocketWall</h1>
                <p className="text-white text-[10px]">Finance Manager v1.0</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full text-left px-3 py-2 text-xs font-bold border transition-all ${activeTab === item.id
                            ? `${selectedBg} text-white ${isDark ? 'border-[#0078d7]' : 'border-[#000080]'} shadow-inner`
                            : `${bgColor} ${textColor} ${isDark ? 'border-[#5a5a5a]' : 'border-t border-l border-white border-r-2 border-b-2 border-[#808080]'} hover:brightness-110`
                            }`}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Settings */}
            <div className={`p-2 border-t-2 ${isDark ? 'border-[#5a5a5a]' : 'border-white'}`}>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full text-left px-3 py-2 text-xs font-bold border transition-all ${activeTab === 'settings'
                        ? `${selectedBg} text-white ${isDark ? 'border-[#0078d7]' : 'border-[#000080]'} shadow-inner`
                        : `${bgColor} ${textColor} ${isDark ? 'border-[#5a5a5a]' : 'border-t border-l border-white border-r-2 border-b-2 border-[#808080]'} hover:brightness-110`
                        }`}
                >
                    Settings
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
