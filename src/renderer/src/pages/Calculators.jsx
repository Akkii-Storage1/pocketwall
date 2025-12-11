import React, { useState } from 'react';
import { useFeature } from '../context/FeatureContext';

const Calculators = ({ isDark, currency = 'INR' }) => {
    const [activeTab, setActiveTab] = useState('sip');

    const bgColor = isDark ? '#1e1e1e' : '#f8f9fa';
    const cardBg = isDark ? '#2d2d30' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? '#3e3e42' : '#e9ecef';
    const sidebarBg = isDark ? '#252526' : '#ffffff';

    const calculators = [
        { id: 'sip', name: 'SIP Calculator', icon: '🌱' },
        { id: 'lumpsum', name: 'Lumpsum Calculator', icon: '💰' },
        { id: 'emi', name: 'EMI Calculator', icon: '🏠' },
        { id: 'amortization', name: 'Amortization Schedule', icon: '📋' },
        { id: 'gst', name: 'GST Calculator', icon: '🧾' },
        { id: 'cagr', name: 'CAGR Calculator', icon: '📈' },
        { id: 'retirement', name: 'Retirement Planner', icon: '🏖️' },
    ];

    const getCurrencySymbol = (currencyCode) => {
        try {
            return (0).toLocaleString('en-US', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();
        } catch (e) {
            return currencyCode;
        }
    };

    const currencySymbol = getCurrencySymbol(currency);

    return (
        <div className="h-full flex overflow-hidden" style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 border-r overflow-y-auto" style={{ backgroundColor: sidebarBg, borderColor }}>
                <div className="p-6">
                    <h1 className="text-xl font-bold flex items-center gap-2 mb-1">
                        <span className="text-blue-500">🧮</span> Calculators
                    </h1>
                    <p className="text-xs opacity-50">Financial Planning Tools</p>
                </div>
                <div className="px-2 space-y-1">
                    {calculators.map(calc => (
                        <button
                            key={calc.id}
                            onClick={() => setActiveTab(calc.id)}
                            className={`w-full px-4 py-3 rounded-lg text-left text-sm font-medium transition-all flex items-center gap-3 ${activeTab === calc.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400'}`}
                            style={{ color: activeTab === calc.id ? '#fff' : undefined }}
                        >
                            <span className="text-lg">{calc.icon}</span>
                            {calc.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'sip' && <SIPCalculator isDark={isDark} cardBg={cardBg} borderColor={borderColor} currency={currencySymbol} />}
                    {activeTab === 'lumpsum' && <LumpsumCalculator isDark={isDark} cardBg={cardBg} borderColor={borderColor} currency={currencySymbol} />}
                    {activeTab === 'emi' && <EMICalculator isDark={isDark} cardBg={cardBg} borderColor={borderColor} currency={currencySymbol} />}
                    {activeTab === 'amortization' && <AmortizationCalculator isDark={isDark} cardBg={cardBg} borderColor={borderColor} currency={currencySymbol} />}
                    {activeTab === 'gst' && <GSTCalculator isDark={isDark} cardBg={cardBg} borderColor={borderColor} currency={currencySymbol} />}
                    {activeTab === 'cagr' && <CAGRCalculator isDark={isDark} cardBg={cardBg} borderColor={borderColor} currency={currencySymbol} />}
                    {activeTab === 'retirement' && <RetirementCalculator isDark={isDark} cardBg={cardBg} borderColor={borderColor} currency={currencySymbol} />}
                </div>
            </div>
        </div>
    );
};

const SIPCalculator = ({ isDark, cardBg, borderColor, currency }) => {
    const [amount, setAmount] = useState(5000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);

    const monthlyRate = rate / 12 / 100;
    const months = years * 12;
    const invested = amount * months;
    const value = amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);

    return (
        <div className="p-8 rounded-2xl shadow-xl border" style={{ backgroundColor: cardBg, borderColor }}>
            <h2 className="text-2xl font-bold mb-6">SIP Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <InputSlider label="Monthly Investment" value={amount} setValue={setAmount} min={500} max={100000} step={500} prefix={currency} />
                    <InputSlider label="Expected Return (p.a)" value={rate} setValue={setRate} min={1} max={30} step={0.5} suffix="%" />
                    <InputSlider label="Time Period" value={years} setValue={setYears} min={1} max={40} step={1} suffix=" Years" />
                </div>
                <ResultCard invested={invested} value={value} isDark={isDark} currency={currency} />
            </div>
        </div>
    );
};

const LumpsumCalculator = ({ isDark, cardBg, borderColor, currency }) => {
    const [amount, setAmount] = useState(50000);
    const [rate, setRate] = useState(12);
    const [years, setYears] = useState(10);

    const invested = amount;
    const value = amount * Math.pow(1 + rate / 100, years);

    return (
        <div className="p-8 rounded-2xl shadow-xl border" style={{ backgroundColor: cardBg, borderColor }}>
            <h2 className="text-2xl font-bold mb-6">Lumpsum Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <InputSlider label="Total Investment" value={amount} setValue={setAmount} min={5000} max={1000000} step={1000} prefix={currency} />
                    <InputSlider label="Expected Return (p.a)" value={rate} setValue={setRate} min={1} max={30} step={0.5} suffix="%" />
                    <InputSlider label="Time Period" value={years} setValue={setYears} min={1} max={40} step={1} suffix=" Years" />
                </div>
                <ResultCard invested={invested} value={value} isDark={isDark} currency={currency} />
            </div>
        </div>
    );
};

const EMICalculator = ({ isDark, cardBg, borderColor, currency }) => {
    const [loanAmount, setLoanAmount] = useState(1000000);
    const [rate, setRate] = useState(8.5);
    const [years, setYears] = useState(20);

    const r = rate / 12 / 100;
    const n = years * 12;
    const emi = loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - loanAmount;

    return (
        <div className="p-8 rounded-2xl shadow-xl border" style={{ backgroundColor: cardBg, borderColor }}>
            <h2 className="text-2xl font-bold mb-6">Loan EMI Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <InputSlider label="Loan Amount" value={loanAmount} setValue={setLoanAmount} min={100000} max={10000000} step={10000} prefix={currency} />
                    <InputSlider label="Interest Rate (p.a)" value={rate} setValue={setRate} min={1} max={20} step={0.1} suffix="%" />
                    <InputSlider label="Loan Tenure" value={years} setValue={setYears} min={1} max={30} step={1} suffix=" Years" />
                </div>
                <div className="space-y-4 p-6 rounded-xl bg-opacity-5 bg-blue-500">
                    <div className="flex justify-between items-center text-lg">
                        <span className="opacity-70">Monthly EMI</span>
                        <span className="font-bold text-2xl text-blue-500">{currency}{Math.round(emi).toLocaleString()}</span>
                    </div>
                    <div className="border-t my-4 opacity-20" style={{ borderColor: isDark ? '#fff' : '#000' }} />
                    <div className="flex justify-between">
                        <span className="opacity-70">Principal Amount</span>
                        <span className="font-bold">{currency}{loanAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">Total Interest</span>
                        <span className="font-bold text-red-500">{currency}{Math.round(totalInterest).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t" style={{ borderColor: isDark ? '#444' : '#ddd' }}>
                        <span className="font-bold">Total Payment</span>
                        <span className="font-bold">{currency}{Math.round(totalPayment).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AmortizationCalculator = ({ isDark, cardBg, borderColor, currency }) => {
    const [loanAmount, setLoanAmount] = useState(500000);
    const [rate, setRate] = useState(10);
    const [months, setMonths] = useState(60);
    const [showFullSchedule, setShowFullSchedule] = useState(false);

    // NEW: Payment frequency (monthly or bi-weekly)
    const [paymentFrequency, setPaymentFrequency] = useState('monthly'); // 'monthly' or 'biweekly'

    // NEW: Extra payment per period
    const [extraPayment, setExtraPayment] = useState(0);

    // Monthly calculations (baseline)
    const r = rate / 12 / 100;
    const n = months;
    const baseEmi = rate === 0 ? loanAmount / n : loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const baseTotalPayment = baseEmi * n;
    const baseTotalInterest = baseTotalPayment - loanAmount;

    // Calculate with extra payment (faster payoff)
    const calculateWithExtra = () => {
        if (extraPayment <= 0) return { months: n, totalInterest: baseTotalInterest, interestSaved: 0 };

        let balance = loanAmount;
        let totalInterest = 0;
        let paymentCount = 0;
        const maxPayments = n * 2; // Safety limit

        while (balance > 0 && paymentCount < maxPayments) {
            const interest = rate === 0 ? 0 : balance * r;
            const payment = Math.min(baseEmi + extraPayment, balance + interest);
            const principal = payment - interest;
            balance = Math.max(0, balance - principal);
            totalInterest += interest;
            paymentCount++;
        }

        return {
            months: paymentCount,
            totalInterest: Math.round(totalInterest),
            interestSaved: Math.round(baseTotalInterest - totalInterest),
            monthsSaved: n - paymentCount
        };
    };

    // Bi-weekly calculations (26 payments/year = ~13 months worth)
    const calculateBiweekly = () => {
        const biweeklyPayment = baseEmi / 2;
        const paymentsPerYear = 26;
        const monthlyEquivalent = (biweeklyPayment * paymentsPerYear) / 12;

        // Extra principal per year = 1 extra month of payment
        let balance = loanAmount;
        let totalInterest = 0;
        let paymentCount = 0;
        const maxPayments = n * 26 / 12; // Max bi-weekly payments

        while (balance > 0 && paymentCount < maxPayments) {
            const weeklyRate = rate / 100 / 26;
            const interest = rate === 0 ? 0 : balance * weeklyRate;
            const principal = biweeklyPayment - interest;
            balance = Math.max(0, balance - principal);
            totalInterest += interest;
            paymentCount++;
        }

        const monthsEquivalent = Math.ceil(paymentCount / (26 / 12));
        return {
            payment: Math.round(biweeklyPayment),
            totalPayments: paymentCount,
            monthsEquivalent,
            totalInterest: Math.round(totalInterest),
            interestSaved: Math.round(baseTotalInterest - totalInterest),
            monthsSaved: n - monthsEquivalent
        };
    };

    const extraPaymentResults = calculateWithExtra();
    const biweeklyResults = calculateBiweekly();

    // Generate schedule based on frequency
    const schedule = [];
    let balance = loanAmount;
    const paymentPeriods = paymentFrequency === 'biweekly' ? Math.ceil(n * 26 / 12) : n;
    const periodRate = paymentFrequency === 'biweekly' ? rate / 100 / 26 : r;
    const periodPayment = paymentFrequency === 'biweekly' ? biweeklyResults.payment + extraPayment : baseEmi + extraPayment;

    for (let period = 1; period <= paymentPeriods && balance > 0; period++) {
        const interest = rate === 0 ? 0 : balance * periodRate;
        const payment = Math.min(periodPayment, balance + interest);
        const principal = payment - interest;
        balance = Math.max(0, balance - principal);
        schedule.push({
            period,
            payment: Math.round(payment),
            principal: Math.round(principal),
            interest: Math.round(interest),
            balance: Math.round(balance)
        });
    }

    const displaySchedule = showFullSchedule ? schedule : schedule.slice(0, 12);
    const actualPayment = paymentFrequency === 'biweekly' ? biweeklyResults.payment : Math.round(baseEmi);
    const currentTotalInterest = paymentFrequency === 'biweekly' ? biweeklyResults.totalInterest : Math.round(baseTotalInterest);

    return (
        <div className="p-8 rounded-2xl shadow-xl border" style={{ backgroundColor: cardBg, borderColor }}>
            <h2 className="text-2xl font-bold mb-6">Loan Amortization Schedule</h2>
            <div className="space-y-8">
                {/* Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputSlider label="Loan Amount" value={loanAmount} setValue={setLoanAmount} min={10000} max={5000000} step={10000} prefix={currency} />
                    <InputSlider label="Interest Rate (p.a)" value={rate} setValue={setRate} min={0} max={24} step={0.5} suffix="%" />
                    <InputSlider label="Loan Tenure" value={months} setValue={setMonths} min={1} max={360} step={1} suffix=" Months" />
                </div>

                {/* NEW: Payment Frequency + Extra Payment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm mb-2 opacity-70">Payment Frequency</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPaymentFrequency('monthly')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${paymentFrequency === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                📅 Monthly
                            </button>
                            <button
                                onClick={() => setPaymentFrequency('biweekly')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${paymentFrequency === 'biweekly' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                📆 Bi-Weekly
                            </button>
                        </div>
                        {paymentFrequency === 'biweekly' && (
                            <div className="mt-2 text-xs text-green-600">
                                💡 Bi-weekly = 26 payments/year (saves ~{biweeklyResults.monthsSaved} months!)
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm mb-2 opacity-70">Extra Payment per {paymentFrequency === 'biweekly' ? 'Bi-week' : 'Month'}</label>
                        <input
                            type="number"
                            value={extraPayment}
                            onChange={(e) => setExtraPayment(Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            className="w-full px-4 py-2 border rounded-lg text-sm"
                            style={{ backgroundColor: isDark ? '#1e1e1e' : '#fff', borderColor }}
                        />
                        {extraPayment > 0 && paymentFrequency === 'monthly' && (
                            <div className="mt-2 text-xs text-green-600">
                                💰 Save {currency}{extraPaymentResults.interestSaved.toLocaleString()} interest, pay off {extraPaymentResults.monthsSaved} months early!
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-opacity-10 bg-blue-500 text-center">
                        <p className="text-sm opacity-70">{paymentFrequency === 'biweekly' ? 'Bi-Weekly' : 'Monthly'} EMI</p>
                        <p className="text-2xl font-bold text-blue-500">{currency}{(actualPayment + extraPayment).toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-opacity-10 bg-gray-500 text-center">
                        <p className="text-sm opacity-70">Principal</p>
                        <p className="text-2xl font-bold">{currency}{loanAmount.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-opacity-10 bg-red-500 text-center">
                        <p className="text-sm opacity-70">Total Interest</p>
                        <p className="text-2xl font-bold text-red-500">{currency}{currentTotalInterest.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-opacity-10 bg-green-500 text-center">
                        <p className="text-sm opacity-70">Total Payment</p>
                        <p className="text-2xl font-bold text-green-600">{currency}{(loanAmount + currentTotalInterest).toLocaleString()}</p>
                    </div>
                </div>

                {/* Savings Comparison */}
                {(paymentFrequency === 'biweekly' || extraPayment > 0) && (
                    <div className="p-4 rounded-xl border" style={{ borderColor, backgroundColor: isDark ? '#1a2e1a' : '#dcfce7' }}>
                        <h4 className="font-semibold text-green-600 mb-2">💰 Your Savings</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="opacity-70">Interest Saved:</span>
                                <span className="ml-2 font-bold text-green-600">
                                    {currency}{(paymentFrequency === 'biweekly' ? biweeklyResults.interestSaved : extraPaymentResults.interestSaved).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="opacity-70">Time Saved:</span>
                                <span className="ml-2 font-bold text-green-600">
                                    {paymentFrequency === 'biweekly' ? biweeklyResults.monthsSaved : extraPaymentResults.monthsSaved} months
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Schedule Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b" style={{ borderColor }}>
                                <th className="py-3 px-4 text-left">{paymentFrequency === 'biweekly' ? 'Period' : 'Month'}</th>
                                <th className="py-3 px-4 text-right">Payment</th>
                                <th className="py-3 px-4 text-right">Principal</th>
                                <th className="py-3 px-4 text-right">Interest</th>
                                <th className="py-3 px-4 text-right">Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displaySchedule.map((row) => (
                                <tr key={row.period} className="border-b hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor }}>
                                    <td className="py-2 px-4">{row.period}</td>
                                    <td className="py-2 px-4 text-right font-medium">{currency}{row.payment.toLocaleString()}</td>
                                    <td className="py-2 px-4 text-right text-green-600">{currency}{row.principal.toLocaleString()}</td>
                                    <td className="py-2 px-4 text-right text-red-500">{currency}{row.interest.toLocaleString()}</td>
                                    <td className="py-2 px-4 text-right font-bold">{currency}{row.balance.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Show More/Less Button */}
                {schedule.length > 12 && (
                    <button
                        onClick={() => setShowFullSchedule(!showFullSchedule)}
                        className="w-full py-2 text-blue-500 hover:underline text-sm"
                    >
                        {showFullSchedule ? `Show Less (viewing all ${schedule.length} periods)` : `Show Full Schedule (${schedule.length} periods)`}
                    </button>
                )}
            </div>
        </div>
    );
};

const GSTCalculator = ({ isDark, cardBg, borderColor, currency }) => {
    const [amount, setAmount] = useState(1000);
    const [gstRate, setGstRate] = useState(18);
    const [isExclusive, setIsExclusive] = useState(true);

    const gstAmount = isExclusive
        ? (amount * gstRate) / 100
        : amount - (amount * (100 / (100 + gstRate)));

    const totalAmount = isExclusive ? amount + gstAmount : amount;
    const netAmount = isExclusive ? amount : amount - gstAmount;

    return (
        <div className="p-8 rounded-2xl shadow-xl border" style={{ backgroundColor: cardBg, borderColor }}>
            <h2 className="text-2xl font-bold mb-6">GST Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div className="flex gap-4 mb-4">
                        <button
                            onClick={() => setIsExclusive(true)}
                            className={`flex-1 py-2 rounded font-bold ${isExclusive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                            Exclusive (Add GST)
                        </button>
                        <button
                            onClick={() => setIsExclusive(false)}
                            className={`flex-1 py-2 rounded font-bold ${!isExclusive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                            Inclusive (Remove GST)
                        </button>
                    </div>
                    <InputSlider label="Amount" value={amount} setValue={setAmount} min={100} max={100000} step={100} prefix={currency} />
                    <div>
                        <label className="block text-sm font-bold opacity-70 mb-2">GST Rate</label>
                        <div className="flex gap-2">
                            {[5, 12, 18, 28].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setGstRate(r)}
                                    className={`flex-1 py-2 rounded border font-bold ${gstRate === r ? 'border-blue-500 text-blue-500 bg-blue-500 bg-opacity-10' : 'opacity-60'}`}
                                    style={{ borderColor: gstRate === r ? '' : borderColor }}
                                >
                                    {r}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-4 p-6 rounded-xl bg-opacity-5 bg-purple-500">
                    <div className="flex justify-between">
                        <span className="opacity-70">Net Amount</span>
                        <span className="font-bold">{currency}{netAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">GST ({gstRate}%)</span>
                        <span className="font-bold text-purple-500">{currency}{gstAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t my-2 pt-2 flex justify-between text-xl font-bold">
                        <span>Total Amount</span>
                        <span>{currency}{totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CAGRCalculator = ({ isDark, cardBg, borderColor, currency }) => {
    const [initial, setInitial] = useState(10000);
    const [final, setFinal] = useState(20000);
    const [years, setYears] = useState(5);

    const cagr = (Math.pow(final / initial, 1 / years) - 1) * 100;

    return (
        <div className="p-8 rounded-2xl shadow-xl border" style={{ backgroundColor: cardBg, borderColor }}>
            <h2 className="text-2xl font-bold mb-6">CAGR Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <InputSlider label="Initial Value" value={initial} setValue={setInitial} min={1000} max={1000000} step={1000} prefix={currency} />
                    <InputSlider label="Final Value" value={final} setValue={setFinal} min={1000} max={5000000} step={1000} prefix={currency} />
                    <InputSlider label="Duration" value={years} setValue={setYears} min={1} max={50} step={1} suffix=" Years" />
                </div>
                <div className="flex flex-col justify-center items-center p-6 rounded-xl bg-opacity-5 bg-green-500">
                    <span className="text-lg opacity-70 mb-2">Compound Annual Growth Rate</span>
                    <span className={`text-5xl font-bold ${cagr >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {cagr.toFixed(2)}%
                    </span>
                    <p className="mt-4 text-center opacity-60 text-sm">
                        Your investment grew by {((final - initial) / initial * 100).toFixed(2)}% in total over {years} years.
                    </p>
                </div>
            </div>
        </div>
    );
};

const RetirementCalculator = ({ isDark, cardBg, borderColor, currency }) => {
    const [currentAge, setCurrentAge] = useState(30);
    const [retirementAge, setRetirementAge] = useState(60);
    const [monthlyExpense, setMonthlyExpense] = useState(30000);
    const [inflation, setInflation] = useState(6);
    const [returns, setReturns] = useState(12);

    const yearsToRetire = retirementAge - currentAge;
    const futureMonthlyExpense = monthlyExpense * Math.pow(1 + inflation / 100, yearsToRetire);
    const corpusNeeded = (futureMonthlyExpense * 12) / ((returns - inflation) / 100); // Simplified corpus calculation
    const monthlySIP = (corpusNeeded * (returns / 12 / 100)) / (Math.pow(1 + returns / 12 / 100, yearsToRetire * 12) - 1);

    return (
        <div className="p-8 rounded-2xl shadow-xl border" style={{ backgroundColor: cardBg, borderColor }}>
            <h2 className="text-2xl font-bold mb-6">Retirement Planner</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <InputSlider label="Current Age" value={currentAge} setValue={setCurrentAge} min={18} max={60} step={1} />
                        <InputSlider label="Retirement Age" value={retirementAge} setValue={setRetirementAge} min={40} max={80} step={1} />
                    </div>
                    <InputSlider label="Current Monthly Expense" value={monthlyExpense} setValue={setMonthlyExpense} min={10000} max={200000} step={1000} prefix={currency} />
                    <InputSlider label="Expected Inflation" value={inflation} setValue={setInflation} min={1} max={10} step={0.5} suffix="%" />
                    <InputSlider label="Expected Return" value={returns} setValue={setReturns} min={1} max={20} step={0.5} suffix="%" />
                </div>
                <div className="space-y-4 p-6 rounded-xl bg-opacity-5 bg-orange-500">
                    <div className="flex justify-between">
                        <span className="opacity-70">Years to Retire</span>
                        <span className="font-bold">{yearsToRetire} Years</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-70">Future Monthly Expense</span>
                        <span className="font-bold">{currency}{Math.round(futureMonthlyExpense).toLocaleString()}</span>
                    </div>
                    <div className="border-t my-4 opacity-20" style={{ borderColor: isDark ? '#fff' : '#000' }} />
                    <div className="text-center">
                        <p className="text-sm opacity-70 mb-1">Target Corpus Needed</p>
                        <p className="text-3xl font-bold text-orange-500">
                            {currency}{Math.round(corpusNeeded).toLocaleString()}
                        </p>
                    </div>
                    <div className="text-center mt-4">
                        <p className="text-sm opacity-70 mb-1">Monthly SIP Needed</p>
                        <p className="text-2xl font-bold text-green-500">
                            {currency}{Math.round(monthlySIP).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Shared Components
const InputSlider = ({ label, value, setValue, min, max, step, prefix = '', suffix = '' }) => {
    const [inputValue, setInputValue] = useState(value.toString());

    // Sync inputValue when value changes from slider
    React.useEffect(() => {
        setInputValue(value.toString());
    }, [value]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);

        // Only update if valid number
        const numVal = parseFloat(val);
        if (!isNaN(numVal)) {
            // Clamp to min/max
            const clampedVal = Math.min(max, Math.max(min, numVal));
            setValue(clampedVal);
        }
    };

    const handleInputBlur = () => {
        // On blur, ensure value is valid and formatted
        const numVal = parseFloat(inputValue);
        if (isNaN(numVal)) {
            setInputValue(value.toString());
        } else {
            const clampedVal = Math.min(max, Math.max(min, numVal));
            setValue(clampedVal);
            setInputValue(clampedVal.toString());
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="font-medium opacity-70 text-sm">{label}</label>
                <div className="flex items-center gap-1 bg-opacity-10 bg-gray-500 px-2 py-1 rounded">
                    {prefix && <span className="text-sm opacity-70">{prefix}</span>}
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        className="w-24 bg-transparent font-bold text-sm text-right outline-none border-none focus:ring-0"
                        style={{ appearance: 'none' }}
                    />
                    {suffix && <span className="text-sm opacity-70">{suffix}</span>}
                </div>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-blue-600"
            />
            <div className="flex justify-between text-xs opacity-50 mt-1">
                <span>{prefix}{min.toLocaleString()}{suffix}</span>
                <span>{prefix}{max.toLocaleString()}{suffix}</span>
            </div>
        </div>
    );
};

const ResultCard = ({ invested, value, isDark, currency }) => (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <p className="text-sm opacity-70">Invested Amount</p>
                <p className="text-xl font-bold">{currency}{invested.toLocaleString()}</p>
            </div>
            <div className="text-right">
                <p className="text-sm opacity-70">Est. Returns</p>
                <p className="text-xl font-bold text-green-500">
                    +{currency}{(value - invested).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
            </div>
        </div>

        <div className="h-4 rounded-full flex overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div className="bg-blue-500" style={{ width: `${(invested / value) * 100}%` }} />
            <div className="bg-green-500" style={{ width: `${((value - invested) / value) * 100}%` }} />
        </div>

        <div className="p-4 rounded-xl bg-opacity-10 bg-blue-500 text-center">
            <p className="text-sm opacity-70 mb-1">Total Value</p>
            <p className="text-4xl font-bold text-blue-500">
                {currency}{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
        </div>
    </div>
);

export default Calculators;
