import React from 'react';

/**
 * LoadingScreen Component
 * Lightweight loading screen for lazy-loaded pages
 * Used as Suspense fallback
 */

const LoadingScreen = ({ isDark = false }) => {
    const bgColor = isDark ? '#1e1e1e' : '#f5f5f5';
    const textColor = isDark ? '#ffffff' : '#000000';

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: bgColor,
            color: textColor
        }}>
            {/* Simple spinner */}
            <div style={{
                width: '40px',
                height: '40px',
                border: `4px solid ${isDark ? '#3e3e42' : '#e0e0e0'}`,
                borderTop: `4px solid #4CAF50`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />

            <p style={{
                marginTop: '16px',
                fontSize: '14px',
                opacity: 0.7
            }}>
                Loading...
            </p>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
