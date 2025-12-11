import React from 'react';

const BottomNav = ({ activeTab, setActiveTab, isDark }) => {
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const borderColor = isDark ? '#333' : '#e0e0e0';
    const activeColor = isDark ? '#007acc' : '#0078d4';
    const inactiveColor = isDark ? '#888' : '#666';

    const navItems = [
        { id: 'dashboard', label: 'Home', icon: '🏠' },
        { id: 'transactions', label: 'Trans', icon: '📝' },
        { id: 'add', label: 'Add', icon: '➕', isAction: true },
        { id: 'notifications', label: 'Alerts', icon: '🔔' },
        { id: 'more', label: 'More', icon: '⋯' }
    ];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 border-t flex justify-around items-center pb-safe"
            style={{
                backgroundColor: bgColor,
                borderColor: borderColor,
                height: '60px',
                zIndex: 50
            }}
        >
            {navItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => {
                        if (item.id === 'add') {
                            // Trigger "New Transaction" shortcut or action
                            // For now, switch to transactions and maybe open modal?
                            // Or we can pass a specific prop to open modal
                            setActiveTab('transactions');
                            // We might need a way to signal "Open New"
                        } else if (item.id === 'more') {
                            // Toggle a "More" menu (to be implemented)
                            // For now, let's just go to Settings or show a simple list
                            setActiveTab('settings');
                        } else {
                            setActiveTab(item.id);
                        }
                    }}
                    className="flex flex-col items-center justify-center w-full h-full"
                    style={{
                        color: activeTab === item.id ? activeColor : inactiveColor
                    }}
                >
                    <span className={`text-xl ${item.isAction ? 'bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center -mt-4 shadow-lg' : ''}`}>
                        {item.icon}
                    </span>
                    {!item.isAction && <span className="text-[10px] mt-1">{item.label}</span>}
                </button>
            ))}
        </div>
    );
};

export default BottomNav;
