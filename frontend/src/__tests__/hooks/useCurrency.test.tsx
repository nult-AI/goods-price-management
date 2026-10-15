import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCurrency } from '@/hooks/useCurrency';

describe('useCurrency Hook', () => {
    it('initializes with default VND currency and available currencies list', () => {
        const { result } = renderHook(() => useCurrency());

        expect(result.current.currency).toBe('VND');
        expect(result.current.availableCurrencies).toContain('VND');
        expect(result.current.availableCurrencies).toContain('USD');
        expect(result.current.availableCurrencies).toContain('EUR');
        expect(result.current.availableCurrencies).toContain('CNY');
    });

    it('converts VND to target currencies accurately', () => {
        const { result } = renderHook(() => useCurrency());

        // VND to VND
        expect(result.current.convertFromVND(50000, 'VND')).toBe(50000);

        // VND to USD (rate 25450)
        expect(result.current.convertFromVND(25450, 'USD')).toBe(1);

        // VND to EUR (rate 27500)
        expect(result.current.convertFromVND(55000, 'EUR')).toBe(2);

        // VND to CNY (rate 3500)
        expect(result.current.convertFromVND(7000, 'CNY')).toBe(2);
    });

    it('formats currency strings correctly', () => {
        const { result } = renderHook(() => useCurrency());

        const formattedVND = result.current.format(100000, 'VND');
        expect(formattedVND).toContain('100.000');

        const formattedUSD = result.current.format(10.5, 'USD');
        expect(formattedUSD).toContain('10,50');
    });

    it('updates active currency state', () => {
        const { result } = renderHook(() => useCurrency());

        act(() => {
            result.current.setCurrency('USD');
        });

        expect(result.current.currency).toBe('USD');
    });
});
