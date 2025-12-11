import React from 'react';

const FinancialHealthScore = ({ score, rating, color, breakdown, isDark }) => {
    const textColor = isDark ? '#ffffff' : '#000000';
    const bgColor = isDark ? '#252526' : '#ffffff';
    const borderColor = isDark ? '#3e3e42' : '#d4d4d4';

    // Prepare data for radial chart
    const chartData = breakdown ? [
        {
            id: 'Savings',
            data: [{ x: 'Score', y: breakdown.savingsRate?.score || 0 }]
        },
        {
            id: 'Budget',
            data: [{ x: 'Score', y: breakdown.budgetAdherence?.score || 0 }]
        },
        {
            id: 'Expense',
            data: [{ x: 'Score', y: breakdown.expenseControl?.score || 0 }]
        },
        {
            id: 'Investment',
            data: [{ x: 'Score', y: breakdown.investment?.score || 0 }]
        }
    ] : [];

    return (
        <div className="border rounded-lg p-6" style={{ backgroundColor: bgColor, borderColor }}>
            {/* Main Score Display */}
            <div className="text-center mb-6">
                <div className="text-6xl font-bold mb-2" style={{ color }}>
                    {score}
                </div>
                <div className="text-2xl font-semibold mb-1" style={{ color }}>
                    {rating}
                </div>
                <div className="text-sm opacity-60" style={{ color: textColor }}>
                    Financial Health Score
                </div>
            </div>

            {/* Score Breakdown */}
            {breakdown && (
                <div className="grid grid-cols-2 gap-4 mt-6">
                    {/* Savings Rate */}
                    <div className="border rounded p-3" style={{ borderColor }}>
                        <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>
                            Savings Rate
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold" style={{ color: textColor }}>
                                {breakdown.savingsRate?.score || 0}
                            </span>
                            <span className="text-sm opacity-60" style={{ color: textColor }}>
                                / {breakdown.savingsRate?.max || 25}
                            </span>
                        </div>
                        {breakdown.savingsRate?.value !== undefined && (
                            <div className="text-xs mt-1" style={{ color: textColor, opacity: 0.7 }}>
                                {Math.round(breakdown.savingsRate.value)}% of income
                            </div>
                        )}
                    </div>

                    {/* Budget Adherence */}
                    <div className="border rounded p-3" style={{ borderColor }}>
                        <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>
                            Budget Adherence
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold" style={{ color: textColor }}>
                                {breakdown.budgetAdherence?.score || 0}
                            </span>
                            <span className="text-sm opacity-60" style={{ color: textColor }}>
                                / {breakdown.budgetAdherence?.max || 25}
                            </span>
                        </div>
                        {breakdown.budgetAdherence?.value !== undefined && (
                            <div className="text-xs mt-1" style={{ color: textColor, opacity: 0.7 }}>
                                {Math.round(breakdown.budgetAdherence.value)}% within budget
                            </div>
                        )}
                    </div>

                    {/* Expense Control */}
                    <div className="border rounded p-3" style={{ borderColor }}>
                        <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>
                            Expense Control
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold" style={{ color: textColor }}>
                                {breakdown.expenseControl?.score || 0}
                            </span>
                            <span className="text-sm opacity-60" style={{ color: textColor }}>
                                / {breakdown.expenseControl?.max || 25}
                            </span>
                        </div>
                        {breakdown.expenseControl?.value !== undefined && (
                            <div className="text-xs mt-1" style={{ color: textColor, opacity: 0.7 }}>
                                {breakdown.expenseControl.value > 0 ? '+' : ''}
                                {Math.round(breakdown.expenseControl.value)}% trend
                            </div>
                        )}
                    </div>

                    {/* Investment */}
                    <div className="border rounded p-3" style={{ borderColor }}>
                        <div className="text-xs opacity-60 mb-1" style={{ color: textColor }}>
                            Investment
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold" style={{ color: textColor }}>
                                {breakdown.investment?.score || 0}
                            </span>
                            <span className="text-sm opacity-60" style={{ color: textColor }}>
                                / {breakdown.investment?.max || 25}
                            </span>
                        </div>
                        {breakdown.investment?.value !== undefined && (
                            <div className="text-xs mt-1" style={{ color: textColor, opacity: 0.7 }}>
                                ₹{Math.round(breakdown.investment.value).toLocaleString()} invested
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div className="mt-6">
                <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#3e3e42' : '#e5e7eb' }}>
                    <div
                        className="h-full transition-all duration-500"
                        style={{
                            width: `${score}%`,
                            backgroundColor: color
                        }}
                    />
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: textColor, opacity: 0.6 }}>
                    <span>Poor</span>
                    <span>Fair</span>
                    <span>Good</span>
                    <span>Excellent</span>
                </div>
            </div>
        </div>
    );
};

export default FinancialHealthScore;
