import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, X, Check, Keyboard } from 'lucide-react';

/**
 * VoiceInput Component
 * Uses webview for better Web Speech API support in Electron
 */

const VoiceInput = ({ onTransactionParsed, isDark = false, onClose }) => {
    const [transcript, setTranscript] = useState('');
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [parsedData, setParsedData] = useState(null);
    const [useTextMode, setUseTextMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);

    const panelBg = isDark ? '#2d2d30' : '#ffffff';
    const textColor = isDark ? '#d4d4d4' : '#1e1e1e';
    const borderColor = isDark ? '#3e3e42' : '#e0e0e0';

    // Check browser support
    const isSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    useEffect(() => {
        if (!isSupported || useTextMode) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();

        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-IN';

        recognitionInstance.onstart = () => {
            setIsListening(true);
            setStatus('listening');
            setError('');
        };

        recognitionInstance.onresult = (event) => {
            const result = event.results[event.resultIndex];
            const text = result[0].transcript;
            setTranscript(text);

            if (result.isFinal) {
                setStatus('processing');
                parseTransaction(text);
            }
        };

        recognitionInstance.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);

            if (event.error === 'network') {
                setError('Network error - Switch to text mode below');
                setUseTextMode(true);
            } else if (event.error === 'not-allowed') {
                setError('Microphone permission denied');
            } else if (event.error === 'no-speech') {
                setError('No speech detected. Try again.');
            } else {
                setError(`Error: ${event.error}`);
            }
            setStatus('error');
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
            if (status === 'listening') {
                setStatus('idle');
            }
        };

        setRecognition(recognitionInstance);

        return () => {
            if (recognitionInstance) {
                recognitionInstance.abort();
            }
        };
    }, [isSupported, useTextMode]);

    // Parse transaction from text
    const parseTransaction = useCallback((text) => {
        const lowerText = text.toLowerCase().trim();

        // Extract amount
        const amountMatch = lowerText.match(/(\d+(?:\.\d{1,2})?)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

        // Determine type
        let type = 'expense';
        const incomeKeywords = ['received', 'earned', 'got', 'income', 'salary', 'payment received', 'credited'];
        const expenseKeywords = ['spent', 'paid', 'expense', 'bought', 'purchased', 'debited'];

        if (incomeKeywords.some(kw => lowerText.includes(kw))) {
            type = 'income';
        } else if (expenseKeywords.some(kw => lowerText.includes(kw))) {
            type = 'expense';
        }

        // Extract category
        const categoryMap = {
            'food': ['food', 'lunch', 'dinner', 'breakfast', 'snack', 'eat', 'restaurant', 'cafe', 'coffee'],
            'groceries': ['groceries', 'grocery', 'vegetables', 'fruits', 'supermarket', 'bigbasket', 'zepto'],
            'transport': ['transport', 'uber', 'ola', 'cab', 'taxi', 'auto', 'rickshaw', 'metro', 'bus', 'petrol', 'fuel'],
            'shopping': ['shopping', 'amazon', 'flipkart', 'clothes', 'electronics', 'bought'],
            'entertainment': ['entertainment', 'movie', 'netflix', 'spotify', 'games', 'subscription'],
            'bills': ['bill', 'electricity', 'water', 'gas', 'internet', 'phone', 'recharge', 'rent'],
            'health': ['health', 'medicine', 'doctor', 'hospital', 'pharmacy', 'medical'],
            'salary': ['salary', 'paycheck', 'wages'],
            'freelance': ['freelance', 'client', 'project', 'consulting'],
        };

        let category = type === 'income' ? 'Salary' : 'Other';

        for (const [cat, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(kw => lowerText.includes(kw))) {
                category = cat.charAt(0).toUpperCase() + cat.slice(1);
                break;
            }
        }

        // Extract description
        let description = lowerText
            .replace(/(\d+(?:\.\d{1,2})?)/g, '')
            .replace(/spent|paid|expense|received|earned|got|income|rupees|rs|inr|on|for|from/gi, '')
            .trim()
            .replace(/\s+/g, ' ');

        description = description ? description.charAt(0).toUpperCase() + description.slice(1) : '';

        const parsed = {
            type,
            amount: amount || 0,
            category,
            description: description || `Input: ${text}`,
            originalText: text
        };

        setParsedData(parsed);

        if (amount && amount > 0) {
            setStatus('success');
        } else {
            setStatus('error');
            setError('Could not detect amount. Example: "spent 500 on food"');
        }
    }, []);

    const startListening = () => {
        if (recognition && !isListening) {
            setTranscript('');
            setParsedData(null);
            setError('');
            try {
                recognition.start();
            } catch (e) {
                setError('Failed to start. Try text mode.');
                setUseTextMode(true);
            }
        }
    };

    const stopListening = () => {
        if (recognition && isListening) {
            recognition.stop();
        }
    };

    const confirmTransaction = () => {
        if (parsedData && onTransactionParsed) {
            onTransactionParsed(parsedData);
        }
        setTranscript('');
        setParsedData(null);
        setStatus('idle');
    };

    const handleTextSubmit = (text) => {
        if (text.trim()) {
            setTranscript(text);
            setStatus('processing');
            parseTransaction(text);
        }
    };

    return (
        <div className="p-4 rounded-xl border" style={{ backgroundColor: panelBg, borderColor }}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2" style={{ color: textColor }}>
                    {useTextMode ? '⌨️ Quick Input' : '🎤 Voice Input'}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setUseTextMode(!useTextMode)}
                        className="text-xs px-2 py-1 rounded border"
                        style={{ borderColor, color: textColor }}
                    >
                        {useTextMode ? '🎤 Voice' : '⌨️ Text'}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-black/10 rounded">
                            <X size={18} style={{ color: textColor }} />
                        </button>
                    )}
                </div>
            </div>

            {/* Text Mode */}
            {useTextMode ? (
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder='Type: "spent 500 on food" or "received 50000 salary"'
                        className="w-full px-3 py-3 border rounded-lg text-sm"
                        style={{
                            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
                            color: textColor,
                            borderColor
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleTextSubmit(e.target.value);
                                e.target.value = '';
                            }
                        }}
                        autoFocus
                    />
                    <p className="text-xs opacity-60" style={{ color: textColor }}>
                        Examples: "spent 500 lunch", "paid 1500 groceries", "received 50000 salary"
                    </p>
                </div>
            ) : (
                /* Voice Mode */
                <div className="flex flex-col items-center gap-4">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                    >
                        {status === 'processing' ? (
                            <Loader2 size={32} className="text-white animate-spin" />
                        ) : isListening ? (
                            <MicOff size={32} className="text-white" />
                        ) : (
                            <Mic size={32} className="text-white" />
                        )}
                    </button>

                    <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                        {status === 'idle' && 'Tap to speak'}
                        {status === 'listening' && '🔴 Listening...'}
                        {status === 'processing' && 'Processing...'}
                        {status === 'success' && '✅ Detected!'}
                        {status === 'error' && '❌ Try again or use text mode'}
                    </p>
                </div>
            )}

            {/* Transcript */}
            {transcript && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: isDark ? '#1e1e1e' : '#f3f4f6' }}>
                    <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>You said:</p>
                    <p className="font-medium" style={{ color: textColor }}>"{transcript}"</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fee2e2' }}>
                    <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
                </div>
            )}

            {/* Parsed Result */}
            {parsedData && status === 'success' && (
                <div className="mt-4 space-y-3">
                    <div className="p-3 rounded-lg border" style={{
                        backgroundColor: isDark ? 'rgba(34,197,94,0.15)' : '#dcfce7',
                        borderColor: isDark ? '#166534' : '#86efac'
                    }}>
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${parsedData.type === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                }`}>
                                {parsedData.type.toUpperCase()}
                            </span>
                            <span className="text-2xl font-bold" style={{
                                color: parsedData.type === 'income' ? '#10b981' : '#ef4444'
                            }}>
                                ₹{parsedData.amount.toLocaleString()}
                            </span>
                        </div>
                        <div className="text-sm" style={{ color: isDark ? '#9ca3af' : '#4b5563' }}>
                            <p><strong>Category:</strong> {parsedData.category}</p>
                            <p><strong>Description:</strong> {parsedData.description}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={confirmTransaction}
                            className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-600"
                        >
                            <Check size={18} /> Add Transaction
                        </button>
                        <button
                            onClick={() => { setParsedData(null); setStatus('idle'); setTranscript(''); }}
                            className="px-4 py-2 border rounded-lg hover:bg-black/5"
                            style={{ borderColor, color: textColor }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Quick examples when idle */}
            {status === 'idle' && !transcript && !useTextMode && (
                <div className="mt-4 text-sm" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                    <p className="font-medium mb-1">Try saying:</p>
                    <ul className="space-y-1">
                        <li>• "Spent 500 on lunch"</li>
                        <li>• "Paid 1500 for groceries"</li>
                        <li>• "Received 50000 salary"</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default VoiceInput;
