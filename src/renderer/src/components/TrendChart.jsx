import React, { useMemo, useState } from 'react';
import { ResponsiveLine } from '@nivo/line';

const TrendChart = ({ transactions, isDark, currency, dateRange }) => {
    const [groupBy, setGroupBy] = useState('daily'); // 'daily' or 'monthly'

    const textColor = isDark ? '#e0e0e0' : '#333333';
    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const borderColor = isDark ? '#444444' : '#cccccc';

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency || 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const chartData = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];

        const expenses = transactions.filter(t => t.type === 'expense');
        const grouped = {};

        expenses.forEach(t => {
            try {
                const date = new Date(t.date);
                if (isNaN(date.getTime())) return; // Skip invalid dates

                let key;
                if (groupBy === 'monthly') {
                    key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
                } else {
                    key = date.toISOString().split('T')[0]; // YYYY-MM-DD
                }

                const amount = parseFloat(t.amount);
                if (!isNaN(amount)) {
                    grouped[key] = (grouped[key] || 0) + amount;
                }
            } catch (e) {
                console.warn('Error processing transaction for chart:', t, e);
            }
        });

        let data = Object.entries(grouped)
            .map(([date, amount]) => ({ x: date, y: amount }))
            .sort((a, b) => {
                if (groupBy === 'monthly') {
                    const [monthA, yearA] = a.x.split(' ');
                    const [monthB, yearB] = b.x.split(' ');
                    return new Date(`1 ${monthA} 20${yearA}`) - new Date(`1 ${monthB} 20${yearB}`);
                }
                return new Date(a.x) - new Date(b.x);
            });

        return [
            {
                id: 'spending',
                data: data
            }
        ];
    }, [transactions, groupBy]);

    if (!chartData[0] || chartData[0].data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 border rounded-lg" style={{ backgroundColor: bgColor, borderColor, color: textColor }}>
                <p className="opacity-50">No trend data available for this period</p>
            </div>
        );
    }

    // Nivo theme configuration
    const theme = {
        background: 'transparent',
        text: {
            fontSize: 11,
            fill: textColor,
        },
        axis: {
            domain: {
                line: {
                    stroke: borderColor,
                    strokeWidth: 1,
                },
            },
            legend: {
                text: {
                    fontSize: 12,
                    fill: textColor,
                },
            },
            ticks: {
                line: {
                    stroke: borderColor,
                    strokeWidth: 1,
                },
                text: {
                    fontSize: 11,
                    fill: textColor,
                },
            },
        },
        grid: {
            line: {
                stroke: isDark ? '#333' : '#e0e0e0',
                strokeWidth: 1,
                strokeDasharray: '4 4',
            },
        },
        crosshair: {
            line: {
                stroke: isDark ? '#666' : '#999',
                strokeWidth: 1,
                strokeOpacity: 0.75,
                strokeDasharray: '6 6',
            },
        },
        tooltip: {
            container: {
                background: isDark ? '#2a2a2a' : '#ffffff',
                color: textColor,
                fontSize: 12,
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                padding: '12px 16px',
                border: `1px solid ${borderColor}`,
            },
        },
    };

    // Custom tooltip
    const CustomTooltip = ({ point }) => (
        <div style={{
            background: isDark ? '#2a2a2a' : '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            border: `1px solid ${borderColor}`,
        }}>
            <div style={{ color: textColor, fontWeight: 'bold', marginBottom: '4px' }}>
                {point.data.xFormatted}
            </div>
            <div style={{
                color: point.serieColor,
                fontSize: '14px',
                fontWeight: '600'
            }}>
                {formatMoney(point.data.yFormatted)}
            </div>
        </div>
    );

    return (
        <div className="p-4 border rounded-lg h-full flex flex-col" style={{ backgroundColor: bgColor, borderColor }}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold" style={{ color: textColor }}>Spending Trends</h3>
                <div className="flex rounded border overflow-hidden" style={{ borderColor }}>
                    <button
                        onClick={() => setGroupBy('daily')}
                        className={`px-3 py-1 text-xs transition-colors ${groupBy === 'daily' ? 'font-bold' : ''}`}
                        style={{
                            backgroundColor: groupBy === 'daily' ? (isDark ? '#3e3e42' : '#e0e0e0') : 'transparent',
                            color: textColor
                        }}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setGroupBy('monthly')}
                        className={`px-3 py-1 text-xs transition-colors ${groupBy === 'monthly' ? 'font-bold' : ''}`}
                        style={{
                            backgroundColor: groupBy === 'monthly' ? (isDark ? '#3e3e42' : '#e0e0e0') : 'transparent',
                            color: textColor,
                            borderLeft: `1px solid ${borderColor}`
                        }}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-[300px]">
                <ResponsiveLine
                    data={chartData}
                    theme={theme}
                    margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
                    xScale={{ type: 'point' }}
                    yScale={{
                        type: 'linear',
                        min: 'auto',
                        max: 'auto',
                        stacked: false,
                        reverse: false
                    }}
                    yFormat={value => formatMoney(value)}
                    curve="catmullRom"
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: groupBy === 'daily' ? 'Date' : 'Month',
                        legendOffset: 45,
                        legendPosition: 'middle',
                        format: (value) => {
                            if (groupBy === 'daily') {
                                return new Date(value).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric'
                                });
                            }
                            return value;
                        }
                    }}
                    axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Amount',
                        legendOffset: -50,
                        legendPosition: 'middle',
                        format: (value) => {
                            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                            if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                            return `₹${value}`;
                        }
                    }}
                    colors={isDark ? ['#5B9BD5'] : ['#8884d8']}
                    lineWidth={3}
                    pointSize={8}
                    pointColor={{ theme: 'background' }}
                    pointBorderWidth={2}
                    pointBorderColor={{ from: 'serieColor' }}
                    pointLabelYOffset={-12}
                    enableArea={true}
                    areaOpacity={0.2}
                    areaBaselineValue={0}
                    enableGridX={false}
                    enableGridY={true}
                    enableCrosshair={true}
                    crosshairType="cross"
                    useMesh={true}
                    tooltip={CustomTooltip}
                    animate={true}
                    motionConfig="gentle"
                    legends={[]}
                />
            </div>
        </div>
    );
};

export default TrendChart;
