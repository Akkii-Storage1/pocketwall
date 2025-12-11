/**
 * Formats a date string based on the currency.
 * @param {string|Date} date - The date to format.
 * @param {string} currency - The currency code (e.g., 'USD', 'INR').
 * @returns {string} - The formatted date string.
 */
export const formatDate = (date, currency = 'INR') => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date; // Return original if invalid

    // US Format: MM/DD/YYYY
    if (currency === 'USD') {
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // Default/Indian Format: DD/MM/YYYY
    return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};
