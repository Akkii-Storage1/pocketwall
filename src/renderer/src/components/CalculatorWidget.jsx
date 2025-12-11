import React, { useState, useEffect, useRef } from 'react';
import { Delete } from 'lucide-react';

const CalculatorWidget = ({ isOpen, onClose, isDark }) => {
    const [input, setInput] = useState('0');
    const [previousInput, setPreviousInput] = useState(null);
    const [operation, setOperation] = useState(null);
    const [history, setHistory] = useState('');
    const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastActionWasEquals, setLastActionWasEquals] = useState(false);
    const dragRef = useRef(null);

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const btnBg = isDark ? '#2d2d30' : '#f3f4f6';
    const operatorColor = '#3b82f6';

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setPosition(prev => ({
                    x: prev.x + e.movementX,
                    y: prev.y + e.movementY
                }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Keyboard support
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            // Numbers
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleNum(parseInt(e.key));
            }
            // Operators
            else if (e.key === '+') {
                e.preventDefault();
                handleOperator('+');
            }
            else if (e.key === '-') {
                e.preventDefault();
                handleOperator('-');
            }
            else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
                e.preventDefault();
                handleOperator('×');
            }
            else if (e.key === '/' || e.key === '÷') {
                e.preventDefault();
                handleOperator('÷');
            }
            // Equals
            else if (e.key === 'Enter' || e.key === '=') {
                e.preventDefault();
                calculate();
            }
            // Clear
            else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                clear();
            }
            // Backspace
            else if (e.key === 'Backspace') {
                e.preventDefault();
                deleteLast();
            }
            // Decimal
            else if (e.key === '.' || e.key === ',') {
                e.preventDefault();
                handleDot();
            }
            // Percent
            else if (e.key === '%') {
                e.preventDefault();
                handlePercent();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, input, operation, previousInput, lastActionWasEquals]);

    if (!isOpen) return null;

    const handleNum = (num) => {
        if (lastActionWasEquals) {
            setInput(num.toString());
            setHistory('');
            setLastActionWasEquals(false);
        } else if (input === '0') {
            setInput(num.toString());
        } else {
            setInput(prev => prev + num);
        }
    };

    const handleDot = () => {
        if (lastActionWasEquals) {
            setInput('0.');
            setHistory('');
            setLastActionWasEquals(false);
        } else if (!input.includes('.')) {
            setInput(prev => prev + '.');
        }
    };

    const handleOperator = (op) => {
        setLastActionWasEquals(false);

        // Chain operations: if already have an operation, calculate first
        if (operation && previousInput) {
            const prev = parseFloat(previousInput);
            const current = parseFloat(input);
            let result = 0;

            switch (operation) {
                case '+': result = prev + current; break;
                case '-': result = prev - current; break;
                case '×': result = prev * current; break;
                case '÷': result = prev / current; break;
                default: result = current;
            }

            setPreviousInput(result.toString());
            setHistory(`${result} ${op}`);
            setInput('0');
            setOperation(op);
        } else {
            setOperation(op);
            setPreviousInput(input);
            setHistory(`${input} ${op}`);
            setInput('0');
        }
    };

    const calculate = () => {
        if (!operation || !previousInput) return;

        const prev = parseFloat(previousInput);
        const current = parseFloat(input);
        let result = 0;

        switch (operation) {
            case '+': result = prev + current; break;
            case '-': result = prev - current; break;
            case '×': result = prev * current; break;
            case '÷': result = prev / current; break;
            default: return;
        }

        setInput(result.toString());
        setOperation(null);
        setPreviousInput(null);
        setHistory('');
        setLastActionWasEquals(true);
    };

    const clear = () => {
        setInput('0');
        setPreviousInput(null);
        setOperation(null);
        setHistory('');
        setLastActionWasEquals(false);
    };

    const deleteLast = () => {
        if (input.length > 1) {
            setInput(prev => prev.slice(0, -1));
        } else {
            setInput('0');
        }
    };

    const handlePercent = () => {
        setInput((parseFloat(input) / 100).toString());
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                zIndex: 1000,
                width: '280px',
                backgroundColor: bgColor,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                borderRadius: '16px',
                border: `1px solid ${isDark ? '#333' : '#e5e7eb'}`
            }}
        >
            {/* Header */}
            <div
                ref={dragRef}
                onMouseDown={() => setIsDragging(true)}
                className="flex justify-between items-center p-3 cursor-move select-none border-b"
                style={{ borderColor: isDark ? '#333' : '#e5e7eb', backgroundColor: isDark ? '#252526' : '#f9fafb' }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer" onClick={onClose}></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs font-medium opacity-50" style={{ color: textColor }}>Calculator</span>
            </div>

            {/* Display */}
            <div className="p-4 text-right">
                <div className="text-xs h-4 mb-1 opacity-60" style={{ color: textColor }}>{history}</div>
                <div className="text-3xl font-bold truncate" style={{ color: textColor }}>{input}</div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-2 p-3">
                <button onClick={clear} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: '#ef4444' }}>C</button>
                <button onClick={deleteLast} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold flex items-center justify-center transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}><Delete size={18} /></button>
                <button onClick={handlePercent} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>%</button>
                <button onClick={() => handleOperator('÷')} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: operatorColor, color: 'white' }}>÷</button>

                <button onClick={() => handleNum(7)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>7</button>
                <button onClick={() => handleNum(8)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>8</button>
                <button onClick={() => handleNum(9)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>9</button>
                <button onClick={() => handleOperator('×')} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: operatorColor, color: 'white' }}>×</button>

                <button onClick={() => handleNum(4)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>4</button>
                <button onClick={() => handleNum(5)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>5</button>
                <button onClick={() => handleNum(6)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>6</button>
                <button onClick={() => handleOperator('-')} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: operatorColor, color: 'white' }}>-</button>

                <button onClick={() => handleNum(1)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>1</button>
                <button onClick={() => handleNum(2)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>2</button>
                <button onClick={() => handleNum(3)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>3</button>
                <button onClick={() => handleOperator('+')} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: operatorColor, color: 'white' }}>+</button>

                <button onClick={() => handleNum(0)} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold col-span-2 transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>0</button>
                <button onClick={handleDot} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: btnBg, color: textColor }}>.</button>
                <button onClick={calculate} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'} className="h-12 rounded-lg font-semibold transition-opacity" style={{ backgroundColor: '#10b981', color: 'white' }}>=</button>
            </div>
        </div>
    );
};

export default CalculatorWidget;
