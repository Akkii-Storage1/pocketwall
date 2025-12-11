import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import CurrencyConverter from '../utils/CurrencyConverter';

const LineChart = ({ data, isDark, isPrivacyMode = false, currency = 'INR' }) => {
    const textColor = isDark ? '#ffffff' : '#000000';
    const lineColor = isDark ? '#5B9BD5' : '#4472C4';
    const pointColor = isDark ? '#1e1e1e' : '#ffffff';

    // Transform data for Nivo Line Chart
    const nivoData = [
        {
            id: 'Net Worth',
            color: lineColor,
            data: data.map(item => ({
                x: item.label,
                y: item.value
            }))
        }
    ];

    const formatCurrency = (value) => {
        return CurrencyConverter.format(value, currency);
    };

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
                border: `1px solid ${isDark ? '#3e3e42' : '#d4d4d4'}`,
            },
        },
    };

    const CustomTooltip = ({ point }) => (
        <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#3e3e42' : '#d4d4d4'}`,
            backgroundColor: isDark ? '#1e1e1e' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
        }}>
            <div style={{ color: textColor, fontSize: '12px', marginBottom: '4px' }}>
                {point.data.xFormatted}
            </div>
            <div style={{ color: lineColor, fontWeight: '600', fontSize: '13px', filter: isPrivacyMode ? 'blur(5px)' : 'none' }}>
                {formatCurrency(point.data.yFormatted)}
            </div>
        </div>
    );

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <ResponsiveLine
                data={nivoData}
                theme={theme}
                margin={{ top: 10, right: 20, bottom: 30, left: 50 }}
                xScale={{ type: 'point' }}
                yScale={{
                    type: 'linear',
                    min: 'auto',
                    max: 'auto',
                    stacked: false,
                    reverse: false
                }}
                yFormat=" >-.2f"
                curve="monotoneX"
                axisTop={null}
                axisRight={null}
                axisBottom={{
                    tickSize: 0,
                    tickPadding: 10,
                    tickRotation: 0,
                }}
                axisLeft={{
                    tickSize: 0,
                    tickPadding: 10,
                    tickRotation: 0,
                    format: (value) => {
                        if (isPrivacyMode) return '****'; // Hide values in axis
                        if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
                        if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value;
                    }
                }}
                enableGridX={false}
                enableGridY={true}
                colors={[lineColor]}
                lineWidth={3}
                pointSize={8}
                pointColor={pointColor}
                pointBorderWidth={2}
                pointBorderColor={{ from: 'serieColor' }}
                pointLabelYOffset={-12}
                useMesh={true}
                enableCrosshair={true}
                tooltip={CustomTooltip}
                animate={true}
                motionConfig="gentle"
            />
        </div>
    );
};

export default LineChart;
