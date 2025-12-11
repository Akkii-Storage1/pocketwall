import React from 'react';

const EmptyState = ({ title, message, isDark }) => {
    const textColor = isDark ? '#999' : '#666';

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center opacity-70">
            <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isDark ? '#555' : '#ccc'}
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4"
            >
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
                <line x1="9" y1="14" x2="15" y2="14"></line>
            </svg>
            <h3 className="text-lg font-semibold mb-1" style={{ color: isDark ? '#eee' : '#333' }}>{title}</h3>
            <p className="text-sm max-w-xs" style={{ color: textColor }}>{message}</p>
        </div>
    );
};

export default EmptyState;
