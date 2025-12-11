import React from 'react';
import imageGenerator from '../utils/imageGenerator';
import { useToast } from './Toast';

const ShareButton = ({ type, data, isDark, className = '' }) => {
    const toast = useToast();

    const handleShare = async () => {
        try {
            switch (type) {
                case 'transaction':
                    await imageGenerator.generateTransactionImage(data, isDark);
                    toast.success('Transaction image downloaded!');
                    break;
                case 'budget':
                    await imageGenerator.generateBudgetImage(
                        data.category,
                        data.spent,
                        data.limit,
                        isDark
                    );
                    toast.success('Budget image downloaded!');
                    break;
                case 'portfolio':
                    await imageGenerator.generatePortfolioImage(data, isDark);
                    toast.success('Portfolio image downloaded!');
                    break;
                default:
                    throw new Error('Unknown share type');
            }
        } catch (error) {
            console.error('Share error:', error);
            const msg = error.message || 'Unknown error';
            toast.error(`Failed to generate share image: ${msg}`);
            // Fallback alert if toast fails or for critical errors
            if (!window.toast) alert(`Share Failed: ${msg}`);
        }
    };

    return (
        <button
            onClick={handleShare}
            className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white ${className}`}
            title="Download as image"
        >
            <span>📤</span>
            <span>Share</span>
        </button>
    );
};

export default ShareButton;
