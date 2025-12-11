import React, { useState, useEffect } from 'react';

const SmartInput = ({ value, onChange, onBlur, className, placeholder, ...props }) => {
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const evaluateExpression = (expression) => {
        if (!expression) return '';

        // Remove spaces
        const cleanExpr = expression.toString().replace(/\s/g, '');

        // Check if it contains only valid characters (digits, operators, dots)
        // We don't support parentheses in this simple version to keep it robust without eval
        if (!/^[0-9+\-*/.]+$/.test(cleanExpr)) {
            return expression;
        }

        // Check if it's just a number
        if (!isNaN(parseFloat(cleanExpr)) && isFinite(cleanExpr)) {
            return cleanExpr;
        }

        try {
            // Simple parser for basic arithmetic (+ - * /)
            // 1. Split by operators but keep them
            // This regex splits by operators but captures them
            const parts = cleanExpr.split(/([+\-*/])/);

            // 2. Handle multiplication and division first
            const ops1 = [];
            for (let i = 0; i < parts.length; i++) {
                if (parts[i] === '*' || parts[i] === '/') {
                    const prev = parseFloat(ops1.pop());
                    const next = parseFloat(parts[i + 1]);
                    let res = 0;
                    if (parts[i] === '*') res = prev * next;
                    if (parts[i] === '/') res = prev / next;
                    ops1.push(res);
                    i++; // Skip next number
                } else {
                    ops1.push(parts[i]);
                }
            }

            // 3. Handle addition and subtraction
            let result = parseFloat(ops1[0]);
            for (let i = 1; i < ops1.length; i += 2) {
                const op = ops1[i];
                const next = parseFloat(ops1[i + 1]);
                if (op === '+') result += next;
                if (op === '-') result -= next;
            }

            if (isFinite(result)) {
                return Math.round(result * 100) / 100;
            }
        } catch (error) {
            console.warn('Invalid math expression:', expression);
        }

        return expression;
    };

    const handleBlur = (e) => {
        const evaluated = evaluateExpression(localValue);
        if (evaluated !== localValue) {
            setLocalValue(evaluated);
            // Simulate standard event for parent onChange
            const event = {
                target: {
                    value: evaluated,
                    name: props.name
                }
            };
            onChange(event);
        }
        if (onBlur) onBlur(e);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            const evaluated = evaluateExpression(localValue);
            if (evaluated !== localValue) {
                setLocalValue(evaluated);
                const event = {
                    target: {
                        value: evaluated,
                        name: props.name
                    }
                };
                onChange(event);
            }
        }
        if (props.onKeyDown) props.onKeyDown(e);
    };

    const handleChange = (e) => {
        setLocalValue(e.target.value);
        // We also pass the raw value to parent so they can see what's being typed
        // This might cause issues if parent expects number only, so we might need to be careful.
        // Ideally, for a "number" input replacement, we might want to wait until evaluation to call onChange 
        // IF the parent strictly requires numbers. 
        // But for better UX (controlled inputs), we usually pass it up.
        // However, if parent parses float immediately, "15+" will become 15.
        // So we should probably NOT call onChange for intermediate invalid states if the parent expects a number.

        // Let's assume parent handles string or we only trigger onChange on evaluation?
        // No, that breaks controlled inputs.
        // Strategy: Pass the value as is. Parent should handle string input or we assume parent uses this for text fields that parse later.
        // If parent uses type="number", this component shouldn't be used or we should override type to text.

        onChange(e);
    };

    return (
        <input
            {...props}
            type="text" // Always text to allow expressions
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
            placeholder={placeholder}
        />
    );
};

export default SmartInput;
