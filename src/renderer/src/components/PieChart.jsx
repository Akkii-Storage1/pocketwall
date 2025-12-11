import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import CurrencyConverter from '../utils/CurrencyConverter';

const PieChart = ({ data, isDark, size = 200, onClick, isPrivacyMode = false, currency = 'INR' }) => {
    const textColor = isDark ? '#ffffff' : '#000000';

    // Enhanced color scheme - optimized for both light and dark mode
    const colors = isDark ? [
        '#5B9BD5', '#FF8C42', '#C4C4C4', '#FFD700', '#7ED4FF',
        '#90EE90', '#4A90E2', '#FF6B6B', '#9B9B9B', '#FFA500',
        '#D87093', '#20B2AA', '#778899'
    ] : [
        '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5',
        '#70AD47', '#264478', '#9E480E', '#636363', '#997300',
        '#C71585', '#008B8B', '#708090'
    ];

    // Transform data for Nivo format
    const nivoData = data.map((item, index) => ({
        id: item.label,
        label: item.label,
        value: item.value,
        color: colors[index % colors.length]
    }));

    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    const formatCurrency = (value) => {
        return CurrencyConverter.format(value, currency);
    };

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-full text-xs" style={{ color: isDark ? '#999' : '#666' }}>
                No data to display
            </div>
        );
    }

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
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                color: textColor,
                fontSize: 12,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '8px 12px',
                border: `1px solid ${isDark ? '#444' : '#ddd'}`,
            },
        },
    };

    // Custom tooltip with Glassmorphism
    const CustomTooltip = ({ datum }) => (
        <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#444' : '#ddd'}`,
            backgroundColor: isDark ? '#1e1e1e' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px'
            }}>
                <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    backgroundColor: datum.color,
                }} />
                <strong style={{ color: textColor, fontSize: '12px' }}>{datum.label}</strong>
            </div>
            <div style={{ color: textColor, fontSize: '11px', opacity: 0.8 }}>
                <div style={{ filter: isPrivacyMode ? 'blur(4px)' : 'none' }}>
                    {formatCurrency(datum.value)}
                </div>
                <div>{((datum.value / total) * 100).toFixed(1)}%</div>
            </div>
        </div>
    );

    return (
        <div className="flex items-center h-full w-full">
            {/* Chart Area */}
            <div className="flex-1 h-full relative" style={{ minWidth: '60%' }}>
                <ResponsivePie
                    data={nivoData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    innerRadius={0.6}
                    padAngle={0.7}
                    cornerRadius={4}
                    activeOuterRadiusOffset={8}
                    colors={{ datum: 'data.color' }}
                    borderWidth={0}
                    enableArcLinkLabels={false} // Disable lines, use legend instead
                    enableArcLabels={false} // Disable labels on slices for cleaner look
                    theme={theme}
                    tooltip={CustomTooltip}
                    onClick={onClick}
                    animate={true}
                    motionConfig="gentle"
                    transitionMode="centerRadius"
                />
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}>
                    <div style={{ fontSize: '10px', opacity: 0.6, color: textColor, marginBottom: '-2px' }}>Total Value</div>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: textColor,
                        filter: isPrivacyMode ? 'blur(6px)' : 'none'
                    }}>
                        {formatCurrency(total)}
                    </div>
                </div>
            </div>

            {/* Legend Area */}
            <div className="w-40 h-full overflow-y-auto custom-scrollbar pl-2 flex flex-col justify-center">
                <div className="space-y-1">
                    {nivoData.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-xs">
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: item.color, flexShrink: 0 }}></div>
                            <div className="flex-1 truncate" style={{ color: textColor }} title={item.label}>{item.label}</div>
                            <div style={{ color: textColor, opacity: 0.7 }}>{((item.value / total) * 100).toFixed(0)}%</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PieChart;
