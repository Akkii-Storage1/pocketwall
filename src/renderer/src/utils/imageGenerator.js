// Image Generator Utility for Share Features
// Generates beautiful shareable images using html-to-image

import { toPng, toJpeg } from 'html-to-image';

/**
 * Generate shareable image from a DOM element
 * @param {HTMLElement} element - The DOM element to capture
 * @param {string} filename - Name for the downloaded file
 */
async function captureElement(element, filename = 'share.png') {
    try {
        const dataUrl = await toPng(element, {
            quality: 0.95,
            pixelRatio: 2, // Higher resolution
            cacheBust: true,
            skipAutoScale: true
        });

        // Create download link
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();

        return dataUrl;
    } catch (error) {
        console.error('Error generating image:', error);
        throw error;
    }
}

/**
 * Generate shareable transaction card image
 * @param {object} transaction - Transaction data
 * @param {boolean} isDark - Dark mode
 */
async function generateTransactionImage(transaction, isDark = false) {
    // Create temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const bgColor = isDark ? '#252526' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const accentColor = transaction.type === 'income' ? '#22c55e' : '#ef4444';

    // Build card HTML
    container.innerHTML = `
        <div style="
            width: 500px;
            padding: 32px;
            background: ${bgColor};
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', Arial, sans-serif;
        ">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 8px;">
                    ${transaction.type === 'income' ? '💰' : transaction.type === 'expense' ? '💸' : '💱'}
                </div>
                <div style="font-size: 14px; color: ${textColor}80; text-transform: uppercase; letter-spacing: 1px;">
                    ${transaction.type}
                </div>
            </div>
            
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 48px; font-weight: bold; color: ${accentColor};">
                    ${transaction.currency === 'USD' ? '$' : '₹'}${Math.abs(transaction.amount).toLocaleString()}
                </div>
            </div>
            
            <div style="background: ${isDark ? '#1e1e1e' : '#f5f5f5'}; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: ${textColor}80; font-size: 14px;">Category</span>
                    <span style="color: ${textColor}; font-size: 14px; font-weight: 600;">${transaction.category}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: ${textColor}80; font-size: 14px;">Date</span>
                    <span style="color: ${textColor}; font-size: 14px; font-weight: 600;">${new Date(transaction.date).toLocaleDateString()}</span>
                </div>
                ${transaction.payee ? `
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: ${textColor}80; font-size: 14px;">Payee</span>
                    <span style="color: ${textColor}; font-size: 14px; font-weight: 600;">${transaction.payee}</span>
                </div>
                ` : ''}
            </div>
            
            <div style="text-align: center; padding-top: 16px; border-top: 1px solid ${isDark ? '#3e3e42' : '#e0e0e0'};">
                <div style="font-size: 12px; color: ${textColor}60;">
                    📊 PocketWall - Track Your Finances
                </div>
            </div>
        </div>
    `;

    try {
        const dataUrl = await toPng(container.firstElementChild, {
            quality: 0.95,
            pixelRatio: 2,
            cacheBust: true,
            skipAutoScale: true
        });

        document.body.removeChild(container);

        // Download
        const link = document.createElement('a');
        link.download = `transaction_${transaction.id}.png`;
        link.href = dataUrl;
        link.click();

        return dataUrl;
    } catch (error) {
        document.body.removeChild(container);
        throw error;
    }
}

/**
 * Generate shareable budget progress image
 * @param {string} category - Budget category
 * @param {number} spent - Amount spent
 * @param {number} limit - Budget limit
 * @param {boolean} isDark - Dark mode
 */
async function generateBudgetImage(category, spent, limit, isDark = false) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const bgColor = isDark ? '#252526' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const percentage = (spent / limit) * 100;
    const barColor = percentage > 90 ? '#ef4444' : percentage > 75 ? '#f59e0b' : '#22c55e';

    container.innerHTML = `
        <div style="
            width: 500px;
            padding: 32px;
            background: ${bgColor};
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', Arial, sans-serif;
        ">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 8px;">🛡️</div>
                <div style="font-size: 24px; font-weight: bold; color: ${textColor};">
                    ${category} Budget
                </div>
            </div>
            
            <div style="margin-bottom: 24px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-size: 14px; color: ${textColor}80;">Spent</span>
                    <span style="font-size: 14px; font-weight: 600; color: ${textColor};">₹${spent.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                    <span style="font-size: 14px; color: ${textColor}80;">Budget</span>
                    <span style="font-size: 14px; font-weight: 600; color: ${textColor};">₹${limit.toLocaleString()}</span>
                </div>
                
                <div style="background: ${isDark ? '#1e1e1e' : '#f5f5f5'}; height: 32px; border-radius: 16px; overflow: hidden; position: relative;">
                    <div style="
                        width: ${Math.min(percentage, 100)}%;
                        height: 100%;
                        background: linear-gradient(90deg, ${barColor}, ${barColor}dd);
                        transition: width 0.3s ease;
                    "></div>
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-size: 14px;
                        font-weight: bold;
                        color: ${percentage > 50 ? '#ffffff' : textColor};
                        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
                    ">
                        ${percentage.toFixed(0)}%
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 24px;">
                <div style="font-size: 32px; font-weight: bold; color: ${barColor};">
                    ₹${(limit - spent).toLocaleString()} Remaining
                </div>
            </div>
            
            <div style="text-align: center; padding-top: 16px; margin-top: 16px; border-top: 1px solid ${isDark ? '#3e3e42' : '#e0e0e0'};">
                <div style="font-size: 12px; color: ${textColor}60;">
                    📊 PocketWall - Track Your Finances
                </div>
            </div>
        </div>
    `;

    try {
        const dataUrl = await toPng(container.firstElementChild, {
            quality: 0.95,
            pixelRatio: 2,
            cacheBust: true,
            skipAutoScale: true
        });

        document.body.removeChild(container);

        const link = document.createElement('a');
        link.download = `budget_${category}.png`;
        link.href = dataUrl;
        link.click();

        return dataUrl;
    } catch (error) {
        document.body.removeChild(container);
        throw error;
    }
}

/**
 * Generate shareable portfolio performance image
 * @param {object} portfolioData - Portfolio data
 * @param {boolean} isDark - Dark mode
 */
async function generatePortfolioImage(portfolioData, isDark = false) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const bgColor = isDark ? '#252526' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const gainColor = portfolioData.totalGain >= 0 ? '#22c55e' : '#ef4444';

    container.innerHTML = `
        <div style="
            width: 500px;
            padding: 32px;
            background: ${bgColor};
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            font-family: 'Segoe UI', Arial, sans-serif;
        ">
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 48px; margin-bottom: 8px;">📈</div>
                <div style="font-size: 24px; font-weight: bold; color: ${textColor};">
                    My Portfolio Performance
                </div>
            </div>
            
            <div style="background: ${isDark ? '#1e1e1e' : '#f5f5f5'}; padding: 20px; border-radius: 12px; margin-bottom: 16px;">
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 14px; color: ${textColor}80; margin-bottom: 4px;">Total Value</div>
                    <div style="font-size: 40px; font-weight: bold; color: ${textColor};">
                        ₹${portfolioData.totalValue.toLocaleString()}
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-around; padding-top: 16px; border-top: 1px solid ${isDark ? '#3e3e42' : '#e0e0e0'};">
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: ${textColor}80; margin-bottom: 4px;">Invested</div>
                        <div style="font-size: 18px; font-weight: 600; color: ${textColor};">
                            ₹${portfolioData.invested.toLocaleString()}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: ${textColor}80; margin-bottom: 4px;">Returns</div>
                        <div style="font-size: 18px; font-weight: 600; color: ${gainColor};">
                            ${portfolioData.totalGain >= 0 ? '+' : ''}₹${portfolioData.totalGain.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-bottom: 16px;">
                <div style="display: inline-block; padding: 12px 24px; background: ${gainColor}20; border-radius: 24px;">
                    <span style="font-size: 32px; font-weight: bold; color: ${gainColor};">
                        ${portfolioData.totalGain >= 0 ? '+' : ''}${portfolioData.returnPercent.toFixed(2)}%
                    </span>
                </div>
            </div>
            
            ${portfolioData.bestStock ? `
            <div style="background: ${isDark ? '#1e1e1e' : '#f5f5f5'}; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
                <div style="font-size: 12px; color: ${textColor}80; margin-bottom: 8px;">🏆 Best Performer</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 18px; font-weight: 600; color: ${textColor};">${portfolioData.bestStock.symbol}</span>
                    <span style="font-size: 18px; font-weight: bold; color: #22c55e;">
                        +${portfolioData.bestStock.gain.toFixed(2)}%
                    </span>
                </div>
            </div>
            ` : ''}
            
            <div style="text-align: center; padding-top: 16px; border-top: 1px solid ${isDark ? '#3e3e42' : '#e0e0e0'};">
                <div style="font-size: 12px; color: ${textColor}60;">
                    📊 PocketWall - Track Your Finances
                </div>
            </div>
        </div>
    `;

    try {
        const dataUrl = await toPng(container.firstElementChild, {
            quality: 0.95,
            pixelRatio: 2
        });

        document.body.removeChild(container);

        const link = document.createElement('a');
        link.download = `portfolio_performance.png`;
        link.href = dataUrl;
        link.click();

        return dataUrl;
    } catch (error) {
        document.body.removeChild(container);
        throw error;
    }
}

export default {
    captureElement,
    generateTransactionImage,
    generateBudgetImage,
    generatePortfolioImage
};
