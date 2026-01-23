"use client";
import React, { useState } from 'react';

// Mock Exchange Rates with VND as BASE (Values: 1 Unit Currency = X VND)
const TO_VND_RATES: Record<string, number> = {
    VND: 1,
    USD: 25450,
    EUR: 27500,
    CNY: 3500,
};

export function useCurrency() {
    const [currency, setCurrency] = useState('VND');

    const convertFromVND = (valueInVND: number, targetCurrency: string) => {
        const rate = TO_VND_RATES[targetCurrency] || 1;
        if (targetCurrency === 'VND') return valueInVND;
        return valueInVND / rate;
    };

    const format = (value: number, targetCurrency: string) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: targetCurrency,
            minimumFractionDigits: targetCurrency === 'VND' ? 0 : 2,
            maximumFractionDigits: targetCurrency === 'VND' ? 0 : 2,
        }).format(value);
    };

    return { currency, setCurrency, convertFromVND, format, availableCurrencies: Object.keys(TO_VND_RATES) };
}
