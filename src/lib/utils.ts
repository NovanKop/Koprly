import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format a date string or Date object based on the user's preferred format
 * @param date - ISO date string (YYYY-MM-DD) or Date object
 * @param format - 'DD/MM/YYYY' or 'MM/DD/YYYY'
 * @returns formatted date string
 */
export function formatDate(date: string | Date, format: 'DD/MM/YYYY' | 'MM/DD/YYYY' = 'DD/MM/YYYY'): string {
    const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;

    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();

    if (format === 'MM/DD/YYYY') {
        return `${month}/${day}/${year}`;
    }
    return `${day}/${month}/${year}`;
}
