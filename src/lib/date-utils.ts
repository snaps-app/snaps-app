/**
 * Date utility functions for Snaps application.
 * Centralizes date formatting and parsing using 'America/Sao_Paulo' timezone.
 */

const SAO_PAULO_TZ = 'America/Sao_Paulo';

/**
 * Formats a date string or object to 'DD/MM' using the São Paulo timezone.
 */
export function formatToSaoPauloShort(date: string | Date | undefined | null): string {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            timeZone: SAO_PAULO_TZ
        }).format(d);
    } catch (e) {
        console.error('Error formatting date:', e);
        return '';
    }
}

/**
 * Formats a date string or object to 'YYYY-MM-DD' for HTML5 date input, 
 * using the São Paulo timezone.
 */
export function formatToISODateOnly(date: string | Date | undefined | null): string {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        // Using Intl to get the parts in SP timezone
        const formatter = new Intl.DateTimeFormat('en-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: SAO_PAULO_TZ
        });
        return formatter.format(d); // en-CA format is YYYY-MM-DD
    } catch (e) {
        console.error('Error formatting date for input:', e);
        return '';
    }
}

/**
 * Parses a 'YYYY-MM-DD' date string from an input and returns an ISO string
 * representing noon on that day in São Paulo timezone.
 * This ensures the date doesn't shift when converted back and forth.
 */
export function parseDateForStorage(dateString: string): string | undefined {
    if (!dateString) return undefined;
    try {
        // Create a date at noon SP time to be safe
        const [year, month, day] = dateString.split('-').map(Number);
        
        // We use a temporary date in SP timezone
        // This is a bit tricky in vanilla JS without date-fns-tz, 
        // but creating it as a "local" time then adjusting for UTC offset or simply 
        // appending 'T12:00:00-03:00' (standard SP offset) works for most of the year.
        // Even better: Create it at noon UTC and the backend/DB will handle the TIMESTAMP WITH TIME ZONE.
        
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        return date.toISOString();
    } catch (e) {
        console.error('Error parsing date for storage:', e);
        return undefined;
    }
}
