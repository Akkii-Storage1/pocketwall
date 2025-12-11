import React from 'react';
import { ResponsiveBar } from '@nivo/bar';

const PayeeChart = ({ transactions, isDark, currency, onPayeeClick }) => {
    // Process data: Group by payee and sum amounts
    const payeeData = (transactions || []).reduce((acc, t) => {
        try {
            if (t.type === 'expense' && t.payee) {
                const amount = parseFloat(t.amount);
                if (!isNaN(amount)) {
                    acc[t.payee] = (acc[t.payee] || 0) + amount;
                }
            }
        } catch (e) {
            console.warn('Error processing transaction for payee chart:', t, e);
        }
        return acc;
    }, {});

    // Convert to array and sort by amount (descending)
    const avgAmount = Object.values(payeeData).reduce((a, b) => a + b, 0) / Object.values(payeeData).length;
    const data = Object.entries(payeeData)
        .map(([name, value]) => ({
            payee: name,
            amount: value,
            color: value > avgAmount
                ? (isDark ? '#FF8C42' : '#ff8042')  // Brighter orange for dark mode
                : (isDark ? '#5B9BD5' : '#0088FE')  // Brighter blue for dark mode
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10); // Top 10 payees

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

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 border rounded-lg" style={{ backgroundColor: bgColor, borderColor, color: textColor }}>
                <p className="opacity-50">No payee data available for this period</p>
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
    const CustomTooltip = ({ id, value, color }) => (
        <div style={{
            background: isDark ? '#2a2a2a' : '#ffffff',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            border: `1px solid ${borderColor}`,
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
                    borderRadius: '2px',
                    backgroundColor: color,
                }} />
                <strong style={{ color: textColor }}>{id}</strong>
            </div>
            <div style={{ color: textColor, fontSize: '14px', fontWeight: '600' }}>
                {formatMoney(value)}
            </div>
        </div>
    );

    return (
        <div className="p-4 border rounded-lg h-full flex flex-col" style={{ backgroundColor: bgColor, borderColor }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: textColor }}>Top Payees</h3>

            <div className="flex-1 min-h-[300px]">
                <ResponsiveBar
                    data={data}
                    keys={['amount']}
                    indexBy="payee"
                    theme={theme}
                    layout="horizontal"
                    margin={{ top: 10, right: 30, bottom: 50, left: 120 }}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    indexScale={{ type: 'band', round: true }}
                    colors={({ data }) => data.color}
                    borderRadius={4}
                    borderWidth={1}
                    borderColor={{
                        from: 'color',
                        modifiers: [['darker', 0.2]]
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Amount Spent',
                        legendPosition: 'middle',
                        legendOffset: 40,
                        format: (value) => {
                            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                            if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                            return `₹${value}`;
                        }
                    }}
                    axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: '',
                        legendPosition: 'middle',
                        legendOffset: 0,
                    }}
                    enableGridX={true}
                    enableGridY={false}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{
                        from: 'color',
                        modifiers: [['darker', 2]]
                    }}
                    label={(d) => formatMoney(d.value)}
                    tooltip={CustomTooltip}
                    onClick={(bar) => {
                        if (onPayeeClick) {
                            onPayeeClick(bar.data.payee);
                        }
                    }}
                    animate={true}
                    motionConfig="gentle"
                    role="application"
                    ariaLabel="Top payees bar chart"
                    barAriaLabel={e => `${e.id}: ${formatMoney(e.value)}`}
                />
            </div>

            <div className="mt-4 space-y-2 overflow-y-auto max-h-40 pr-2 custom-scrollbar">
                {data.map((item, index) => (
                    <div
                        key={index}
                        className="flex justify-between items-center text-sm cursor-pointer hover:bg-opacity-10 hover:bg-blue-500 p-1 rounded transition-colors"
                        style={{ color: textColor }}
                        onClick={() => onPayeeClick && onPayeeClick(item.payee)}
                    >
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs opacity-50 w-4">{index + 1}.</span>
                            <div
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '2px',
                                    backgroundColor: item.color,
                                }}
                            />
                            <span className="truncate max-w-[150px]">{item.payee}</span>
                        </div>
                        <span className="font-medium">{formatMoney(item.amount)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PayeeChart;
