import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PriceCard from '@/components/PriceCard';

describe('PriceCard Component', () => {
    it('renders commodity name, formatted price, unit, and last updated time', () => {
        render(
            <PriceCard
                name="Cà phê Robusta"
                price={125.5}
                unit="kg"
                change={2.5}
                lastUpdated="10 phút trước"
            />
        );

        expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
        expect(screen.getByText('$125.50')).toBeInTheDocument();
        expect(screen.getByText('/ kg')).toBeInTheDocument();
        expect(screen.getByText('10 phút trước')).toBeInTheDocument();
    });

    it('renders positive percentage change indicator', () => {
        render(
            <PriceCard
                name="Tiêu Đen"
                price={80}
                unit="kg"
                change={4.2}
                lastUpdated="Hôm nay"
            />
        );

        const changeBadge = screen.getByText(/▲ 4.2%/);
        expect(changeBadge).toBeInTheDocument();
        expect(changeBadge.className).toContain('text-emerald-500');
    });

    it('renders negative percentage change indicator', () => {
        render(
            <PriceCard
                name="Gạo ST25"
                price={30}
                unit="kg"
                change={-3.1}
                lastUpdated="Hôm nay"
            />
        );

        const changeBadge = screen.getByText(/▼ 3.1%/);
        expect(changeBadge).toBeInTheDocument();
        expect(changeBadge.className).toContain('text-rose-500');
    });

    it('defaults to 0% change when change prop is omitted', () => {
        render(
            <PriceCard
                name="Cao Su"
                price={50}
                unit="kg"
                lastUpdated="Vừa xong"
            />
        );

        expect(screen.getByText(/▲ 0%/)).toBeInTheDocument();
    });
});
