import { format, isToday, isYesterday, differenceInDays, parseISO, isValid } from 'date-fns';
import type { DateFormat } from '../types';

export const formatDate = (date: string | Date, dateFormat: DateFormat = 'DD/MM/YYYY'): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (!isValid(dateObj)) return 'Invalid Date';

    switch (dateFormat) {
        case 'DD/MM/YYYY':
            return format(dateObj, 'dd/MM/yyyy');

        case 'DD MMM YYYY':
            return format(dateObj, 'dd MMM yyyy');

        case 'Relative':
            if (isToday(dateObj)) return 'Today';
            if (isYesterday(dateObj)) return 'Yesterday';

            const diff = differenceInDays(new Date(), dateObj);
            if (diff >= 0 && diff <= 7) {
                return `${diff} days ago`;
            }
            // Fallback for > 7 days
            return format(dateObj, 'dd MMM');

        default:
            return format(dateObj, 'dd/MM/yyyy');
    }
};
