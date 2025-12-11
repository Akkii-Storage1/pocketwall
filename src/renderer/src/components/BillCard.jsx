import React from 'react';
import CurrencyConverter from '../utils/CurrencyConverter';

const BillCard = ({ bill, isDark, currency = 'INR' }) => {
    const textColor = isDark ? '#ffffff' : '#000000';
    const panelBg = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';

    const getStatusColor = (days) => {
        if (days < 0) return '#ef4444'; // Overdue (Red)
        if (days <= 3) return '#eab308'; // Due soon (Yellow)
        return '#10b981'; // Safe (Green)
    };

    const getStatusText = (days) => {
        if (days < 0) return `Overdue by ${Math.abs(days)} days`;
        if (days === 0) return 'Due Today';
        if (days === 1) return 'Due Tomorrow';
        return `Due in ${days} days`;
    };

    const formatMoney = (amount) => {
        return CurrencyConverter.format(CurrencyConverter.convert(amount, 'INR', currency), currency);
    };

    return (
        <div className="border rounded-lg p-4 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: panelBg, borderColor }}>
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{ backgroundColor: isDark ? '#3e3e42' : '#f3f4f6' }}>
                    📅
                </div>
                <div>
                    <h4 className="font-semibold text-lg" style={{ color: textColor }}>{bill.payee}</h4>
                    <div className="text-sm opacity-70" style={{ color: textColor }}>
                        {bill.frequency} • {bill.category}
                    </div>
                </div>
            </div>

            <div className="text-right">
                <div className="text-xl font-bold mb-1" style={{ color: textColor }}>
                    {formatMoney(bill.avgAmount)}
                </div>
                <div className="text-sm font-medium px-2 py-1 rounded-full inline-block"
                    style={{
                        color: '#fff',
                        backgroundColor: getStatusColor(bill.daysUntilDue),
                        fontSize: '0.75rem'
                    }}>
                    {getStatusText(bill.daysUntilDue)}
                </div>
                <div className="text-xs mt-1 opacity-60" style={{ color: textColor }}>
                    Est: {new Date(bill.nextDate).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

export default BillCard;
