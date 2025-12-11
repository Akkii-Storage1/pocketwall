import React, { useState, useEffect } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import CurrencyConverter from '../utils/CurrencyConverter';

const BarChart = ({ data, isDark, keys = ['income', 'expense'], onClick, isPrivacyMode = false, currency = 'INR' }) => {
    const textColor = isDark ? '#ffffff' : '#000000';
    const [colors, setColors] = useState({
        income: isDark ? '#90EE90' : '#008000',
        expense: isDark ? '#FF6B6B' : '#ff0000'
    });
    const borderColor = isDark ? '#3e3e42' : '#d4d4d8';

    useEffect(() => {
        const updateColors = () => {
            const root = getComputedStyle(document.documentElement);
            const pos = root.getPropertyValue('--positive-color').trim();
            const neg = root.getPropertyValue('--negative-color').trim();

            setColors({
                income: pos || (isDark ? '#90EE90' : '#008000'),
                expense: neg || (isDark ? '#FF6B6B' : '#ff0000')
            });
        };

        updateColors();
        // Listen for settings changes
        document.addEventListener('settingsChanged', updateColors);
        return () => document.removeEventListener('settingsChanged', updateColors);
    }, [isDark]);

    // Custom theme for dark/light mode
    const theme = {
        background: 'transparent',
        text: {
            fontSize: 12,
            fill: textColor,
            fontFamily: 'Inter, sans-serif',
        },
        tooltip: {
            container: {
                background: isDark ? '#1e1e1e' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                color: textColor,
                fontSize: 12,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '8px 12px',
                border: `1px solid ${borderColor}`,
            },
        },
    };

    const formatCurrency = (value) => {
        return CurrencyConverter.format(value, currency);
    };

    const CustomTooltip = ({ id, value, color }) => (
        <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${borderColor}`,
            backgroundColor: isDark ? '#1e1e1e' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            }}>
                <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    backgroundColor: color,
                }} />
                <span style={{ color: textColor, fontSize: '12px', fontWeight: '500' }}>
                    {id === 'income' ? 'Income' : 'Expense'}:
                    <span style={{ filter: isPrivacyMode ? 'blur(5px)' : 'none', marginLeft: '4px' }}>
                        {formatCurrency(value)}
                    </span>
                </span>
            </div>
        </div>
    );

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <ResponsiveBar
                data={data}
                keys={keys}
                onClick={onClick}
                indexBy="label"
                theme={theme}
                margin={{ top: 5, right: 10, bottom: 20, left: 50 }}
                padding={0.3}
                groupMode="grouped"
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors={({ id }) => id === 'income' ? colors.income : colors.expense}
                borderRadius={4}
                borderWidth={0}
                enableLabel={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 8,
                    tickRotation: 0,
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 10,
                    tickRotation: 0,
                    format: (value) => {
                        if (isPrivacyMode) return '****'; // Hide values in axis
                        if (currency === 'INR') {
                            if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
                            if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        } else {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        }
                        return value;
                    }
                }}
                enableGridX={false}
                enableGridY={true}
                tooltip={CustomTooltip}
                animate={true}
                motionConfig="gentle"
                role="application"
                ariaLabel="Income vs Expense bar chart"
            />
        </div>
    );
};

export default BarChart;
