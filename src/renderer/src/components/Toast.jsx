import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'success', options = {}) => {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type, ...options }]);

        if (!options.duration || options.duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(toast => toast.id !== id));
            }, options.duration || 4000);
        }
    };

    const success = (message, options) => addToast(message, 'success', options);
    const error = (message, options) => addToast(message, 'error', options);
    const info = (message, options) => addToast(message, 'info', options);

    return (
        <ToastContext.Provider value={{ success, error, info }}>
            {children}
            <div className="fixed bottom-4 right-4 z-50 space-y-2 flex flex-col items-end pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="px-4 py-2 shadow-lg min-w-[200px] flex items-center justify-between gap-4 pointer-events-auto"
                        style={{
                            backgroundColor: '#ffffe1', // Classic tooltip yellow
                            border: '1px solid #767676',
                            color: '#000000',
                            fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif',
                            fontSize: '12px'
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <span style={{
                                color: toast.type === 'error' ? '#cc0000' : toast.type === 'success' ? '#008000' : '#000080',
                                fontWeight: 'bold'
                            }}>
                                {toast.type === 'success' ? '(i)' : toast.type === 'error' ? '(!)' : '(?)'}
                            </span>
                            <span>{toast.message}</span>
                        </div>

                        {toast.action && (
                            <button
                                onClick={() => {
                                    toast.action.onClick();
                                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                                }}
                                className="px-2 py-0.5 border border-gray-400 bg-white hover:bg-gray-100 text-xs font-semibold"
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
