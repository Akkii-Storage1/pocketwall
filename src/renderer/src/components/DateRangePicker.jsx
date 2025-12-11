import React, { useState, useEffect } from 'react';

const DateRangePicker = ({ onChange, isDark }) => {
    const [rangeType, setRangeType] = useState('30days');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const textColor = isDark ? '#e0e0e0' : '#333333';
    const bgColor = isDark ? '#2d2d2d' : '#ffffff';
    const borderColor = isDark ? '#444444' : '#cccccc';

    useEffect(() => {
        calculateDateRange(rangeType);
    }, [rangeType]);

    const calculateDateRange = (type) => {
        const end = new Date();
        let start = new Date();

        switch (type) {
            case '7days':
                start.setDate(end.getDate() - 7);
                break;
            case '30days':
                start.setDate(end.getDate() - 30);
                break;
            case 'thisMonth':
                start.setDate(1);
                break;
            case 'lastMonth':
                start.setMonth(start.getMonth() - 1);
                start.setDate(1);
                end.setDate(0); // Last day of previous month
                break;
            case 'thisYear':
                start.setMonth(0, 1);
                break;
            case 'custom':
                return; // Don't update dates automatically
            default:
                start.setDate(end.getDate() - 30);
        }

        const formatDate = (d) => d.toISOString().split('T')[0];
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));

        if (type !== 'custom') {
            onChange({ start: formatDate(start), end: formatDate(end) });
        }
    };

    const handleCustomChange = (start, end) => {
        setStartDate(start);
        setEndDate(end);
        if (start && end) {
            onChange({ start, end });
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg border" style={{ backgroundColor: bgColor, borderColor }}>
            <select
                value={rangeType}
                onChange={(e) => setRangeType(e.target.value)}
                className="px-3 py-1.5 rounded border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: isDark ? '#3e3e42' : '#f8f9fa', color: textColor, borderColor }}
            >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="custom">Custom Range</option>
            </select>

            {rangeType === 'custom' && (
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => handleCustomChange(e.target.value, endDate)}
                        className="px-2 py-1 rounded border text-sm"
                        style={{ backgroundColor: isDark ? '#3e3e42' : '#ffffff', color: textColor, borderColor }}
                    />
                    <span style={{ color: textColor }}>to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => handleCustomChange(startDate, e.target.value)}
                        className="px-2 py-1 rounded border text-sm"
                        style={{ backgroundColor: isDark ? '#3e3e42' : '#ffffff', color: textColor, borderColor }}
                    />
                </div>
            )}

            {rangeType !== 'custom' && (
                <div className="text-xs opacity-70" style={{ color: textColor }}>
                    {startDate} — {endDate}
                </div>
            )}
        </div>
    );
};

export default DateRangePicker;
