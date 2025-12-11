import React from 'react';

const KeyboardShortcutsModal = ({ onClose, isDark }) => {
    const bgColor = isDark ? '#2d2d30' : '#f0f0f0';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';
    const menuBg = isDark ? '#3e3e42' : '#f0f0f0';

    const shortcuts = {
        navigation: [
            { keys: ['Ctrl', 'D'], label: 'Dashboard' },
            { keys: ['Ctrl', 'T'], label: 'Transactions' },
            { keys: ['Ctrl', '3'], label: 'Budget' },
            { keys: ['Ctrl', 'I'], label: 'Investments' },
            { keys: ['Ctrl', 'S'], label: 'Settings' },
            { keys: ['Ctrl', 'P'], label: 'Portfolio' },
        ],
        actions: [
            { keys: ['Ctrl', 'N'], label: 'New Transaction' },
            { keys: ['Ctrl', '+'], label: 'Zoom In' },
            { keys: ['Ctrl', '-'], label: 'Zoom Out' },
            { keys: ['Ctrl', '0'], label: 'Reset Zoom' },
            { keys: ['Ctrl', 'Shift', 'A'], label: 'Admin Panel' },
        ]
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-200"
                style={{ backgroundColor: panelBg, borderColor, borderWidth: '1px' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b flex justify-between items-center" style={{ borderColor, backgroundColor: menuBg }}>
                    <h3 className="font-bold text-lg" style={{ color: textColor }}>⌨️ Keyboard Shortcuts</h3>
                    <button onClick={onClose} className="text-xl opacity-60 hover:opacity-100 transition-opacity" style={{ color: textColor }}>×</button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-semibold mb-4 text-xs uppercase tracking-wider opacity-70" style={{ color: textColor }}>Navigation</h4>
                        <div className="space-y-3">
                            {shortcuts.navigation.map((item, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-sm" style={{ color: textColor }}>{item.label}</span>
                                    <div className="flex gap-1">
                                        {item.keys.map(k => (
                                            <kbd key={k} className="px-2 py-1 text-xs font-semibold rounded border shadow-sm min-w-[24px] text-center" style={{ backgroundColor: isDark ? '#3e3e42' : '#f3f4f6', borderColor: isDark ? '#555' : '#d1d5db', color: textColor }}>
                                                {k}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-4 text-xs uppercase tracking-wider opacity-70" style={{ color: textColor }}>Actions & View</h4>
                        <div className="space-y-3">
                            {shortcuts.actions.map((item, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <span className="text-sm" style={{ color: textColor }}>{item.label}</span>
                                    <div className="flex gap-1">
                                        {item.keys.map(k => (
                                            <kbd key={k} className="px-2 py-1 text-xs font-semibold rounded border shadow-sm min-w-[24px] text-center" style={{ backgroundColor: isDark ? '#3e3e42' : '#f3f4f6', borderColor: isDark ? '#555' : '#d1d5db', color: textColor }}>
                                                {k}
                                            </kbd>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t text-center text-xs opacity-50" style={{ borderColor, color: textColor }}>
                    Press <kbd className="px-1 border rounded mx-1">Esc</kbd> to close
                </div>
            </div>
        </div>
    );
};

export default KeyboardShortcutsModal;
