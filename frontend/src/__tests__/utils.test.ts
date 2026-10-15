import { describe, it, expect } from 'vitest';
import { normalizeVietnamese, fuzzyMatch } from '@/lib/utils';

describe('normalizeVietnamese', () => {
    it('removes Vietnamese diacritics and converts to lowercase', () => {
        expect(normalizeVietnamese('Cà Phê Robusta')).toBe('ca phe robusta');
        expect(normalizeVietnamese('Gạo Lúa Mì')).toBe('gao lua mi');
    });

    it('converts đ and Đ to d', () => {
        expect(normalizeVietnamese('Đồng Nai')).toBe('dong nai');
        expect(normalizeVietnamese('đường mía')).toBe('duong mia');
    });

    it('trims leading and trailing whitespace', () => {
        expect(normalizeVietnamese('   Hồ Tiêu   ')).toBe('ho tieu');
    });
});

describe('fuzzyMatch', () => {
    it('returns true if search query is empty', () => {
        expect(fuzzyMatch('Cà phê', '')).toBe(true);
    });

    it('returns false if target is empty but search is not', () => {
        expect(fuzzyMatch('', 'ca')).toBe(false);
    });

    it('matches accent-insensitive search queries', () => {
        expect(fuzzyMatch('Cà phê Robusta', 'ca phe')).toBe(true);
        expect(fuzzyMatch('Hồ Tiêu Gia Lai', 'tieu')).toBe(true);
        expect(fuzzyMatch('Đường cát trắng', 'duong')).toBe(true);
    });

    it('returns false when query does not match', () => {
        expect(fuzzyMatch('Cà phê Robusta', 'gạo')).toBe(false);
    });
});
