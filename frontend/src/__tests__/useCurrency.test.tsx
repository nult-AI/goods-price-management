import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCurrency } from '@/hooks/useCurrency';

describe('useCurrency hook', () => {
    it('initializes with default currency VND', () => {
        const { result } = renderHook(() => useCurrency());
        expect(result.current.currency).toBe('VND');
        expect(result.current.availableCurrencies).toContain('VND');
        expect(result.current.availableCurrencies).toContain('USD');
    });

    it('updates currency when setCurrency is called', () => {
        const { result } = renderHook(() => useCurrency());
        act(() => {
            result.current.setCurrency('USD');
        });
        expect(result.current.currency).toBe('USD');
    });

    it('converts VND to target currency correctly', () => {
        const { result } = renderHook(() => useCurrency());
        expect(result.current.convertFromVND(50000, 'VND')).toBe(50000);
        expect(result.current.convertFromVND(25450, 'USD')).toBe(1);
        expect(result.current.convertFromVND(27500, 'EUR')).toBe(1);
    });

    it('formats values according to the target currency', () => {
        const { result } = renderHook(() => useCurrency());
        const formattedVND = result.current.format(100000, 'VND');
        expect(formattedVND).toContain('100.000');

        const formattedUSD = result.current.format(10.5, 'USD');
        expect(formattedUSD).toContain('10,50');
    });
});
