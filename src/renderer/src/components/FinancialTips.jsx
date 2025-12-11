import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { getTipOfTheDay, getRandomTip } from '../utils/FinancialTipsData';

/**
 * Financial Tips Widget
 * Shows daily financial tips  on the Dashboard
 */

const FinancialTips = ({ isDark }) => {
    const [currentTip, setCurrentTip] = useState(getTipOfTheDay());

    const handleNextTip = () => {
        setCurrentTip(getRandomTip());
    };

    const bgColor = isDark ? '#2d2d30' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#ddd';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💡</span>
                    Tip of the Day
                </h3>
                <span style={{
                    padding: '4px 10px',
                    backgroundColor: getCategoryColor(currentTip.category),
                    color: '#ffffff',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500
                }}>
                    {currentTip.category}
                </span>
            </div>

            <motion.div
                key={currentTip.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '16px'
                }}
            >
                <span style={{ fontSize: '32px', flexShrink: 0 }}>
                    {currentTip.icon}
                </span>
                <p style={{
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: '1.6',
                    opacity: 0.9
                }}>
                    {currentTip.tip}
                </p>
            </motion.div>

            <button
                onClick={handleNextTip}
                style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: isDark ? '#4CAF50' : '#2e7d32',
                    border: `1px solid ${isDark ? '#4CAF50' : '#2e7d32'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    width: '100%'
                }}
                onMouseEnter={(e) => {
                    e.target.style.backgroundColor = isDark ? 'rgba(76, 175, 80, 0.1)' : 'rgba(46, 125, 50, 0.1)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                }}
            >
                Show Another Tip
            </button>
        </motion.div>
    );
};

/**
 * Get color for category badge
 */
function getCategoryColor(category) {
    const colors = {
        'Saving': '#4CAF50',
        'Budgeting': '#2196F3',
        'Investing': '#9C27B0',
        'Debt': '#F44336',
        'Tax': '#FF9800',
        'Mindset': '#00BCD4'
    };
    return colors[category] || '#757575';
}

export default FinancialTips;
