import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PriceCard from '@/components/PriceCard';

describe('PriceCard Component', () => {
    it('renders successfully with default valid props', () => {
        render(
            <PriceCard
                name="Gạo ST25"
                price={35000}
                unit="kg"
                change={2.5}
                lastUpdated="10:30"
            />
        );

        expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        expect(screen.getByText('/ kg')).toBeInTheDocument();
        expect(screen.getByText('10:30')).toBeInTheDocument();
        expect(screen.getByText(/35,000\.00/)).toBeInTheDocument();
    });

    it('renders positive change with upward indicator and emerald styling', () => {
        render(
            <PriceCard
                name="Cà phê Robusta"
                price={80000}
                unit="kg"
                change={5.2}
                lastUpdated="09:00"
            />
        );

        const changeElement = screen.getByText('▲ 5.2%');
        expect(changeElement).toBeInTheDocument();
        expect(changeElement).toHaveClass('text-emerald-500');
    });

    it('renders negative change with downward indicator and rose styling', () => {
        render(
            <PriceCard
                name="Hồ tiêu"
                price={95000}
                unit="kg"
                change={-3.8}
                lastUpdated="11:15"
            />
        );

        const changeElement = screen.getByText('▼ 3.8%');
        expect(changeElement).toBeInTheDocument();
        expect(changeElement).toHaveClass('text-rose-500');
    });

    it('renders 0% change with upward indicator by default', () => {
        render(
            <PriceCard
                name="Thịt heo"
                price={60000}
                unit="kg"
                change={0}
                lastUpdated="12:00"
            />
        );

        expect(screen.getByText('▲ 0%')).toBeInTheDocument();
    });
});
