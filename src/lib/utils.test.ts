import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, cn } from './utils';

describe('formatMoney', () => {
    it('formats IDR correctly (no decimals)', () => {
        expect(formatMoney(10000, 'IDR')).toBe('Rp10.000');
        expect(formatMoney(1500, 'IDR')).toBe('Rp1.500');
        expect(formatMoney(0, 'IDR')).toBe('Rp0');
    });

    it('formats USD correctly (with decimals)', () => {
        expect(formatMoney(10000, 'USD')).toBe('$10,000.00');
        expect(formatMoney(10.5, 'USD')).toBe('$10.50');
        expect(formatMoney(0, 'USD')).toBe('$0.00');
    });

    it('defaults to IDR if currency not provided', () => {
        expect(formatMoney(5000)).toBe('Rp5.000');
    });
});

describe('formatDate', () => {
    it('formats ISO string correctly', () => {
        const date = '2024-03-15';
        expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/03/2024');
        expect(formatDate(date, 'MM/DD/YYYY')).toBe('03/15/2024');
    });

    it('formats Date object correctly', () => {
        const date = new Date('2024-03-15T12:00:00');
        expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/03/2024');
    });
});

describe('cn', () => {
    it('merges class names correctly', () => {
        expect(cn('c1', 'c2')).toBe('c1 c2');
    });

    it('handles conditional classes', () => {
        expect(cn('c1', false && 'c2', 'c3')).toBe('c1 c3');
    });

    it('merges tailwind classes (overrides)', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2');
    });
});
