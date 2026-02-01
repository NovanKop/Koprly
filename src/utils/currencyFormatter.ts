/**
 * Currency Formatter Utility
 * Handles IDR (Indonesian Rupiah) formatting with dots as thousand separators
 */

/**
 * Format a number to IDR display string with dots
 * @param value - Number or string to format
 * @returns Formatted string (e.g., "3.000.000")
 */
export const formatIDR = (value: number | string): string => {
    // If string, remove existing dots first
    const num = typeof value === 'string'
        ? parseFloat(value.replace(/\./g, '').replace(/,/g, ''))
        : value;

    if (isNaN(num) || num === 0) return '0';

    // Use Indonesian locale formatting (dots for thousands)
    return Math.floor(num).toLocaleString('id-ID');
};

/**
 * Parse an IDR formatted string back to a number
 * @param value - Formatted string (e.g., "3.000.000")
 * @returns Parsed number (e.g., 3000000)
 */
export const parseIDR = (value: string): number => {
    // Remove all dots and commas, then parse
    const cleaned = value.replace(/\./g, '').replace(/,/g, '').replace(/[^0-9]/g, '');
    return parseFloat(cleaned) || 0;
};

/**
 * Format with currency symbol
 * @param value - Number to format
 * @param currency - Currency code ('IDR' or 'USD')
 * @returns Formatted string with symbol (e.g., "Rp 3.000.000" or "$3,000")
 */
export const formatCurrency = (value: number, currency: 'IDR' | 'USD' = 'IDR'): string => {
    if (currency === 'IDR') {
        return `Rp ${formatIDR(value)}`;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};
