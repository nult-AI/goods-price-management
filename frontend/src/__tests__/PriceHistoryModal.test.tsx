import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PriceHistoryModal from '@/components/PriceHistoryModal';

// Mock Recharts components to run cleanly in JSDOM
vi.mock('recharts', () => {
    return {
        ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
        AreaChart: ({ children }: any) => <svg data-testid="area-chart">{children}</svg>,
        Area: () => <path />,
        XAxis: () => <g />,
        YAxis: () => <g />,
        Tooltip: () => <div />,
        CartesianGrid: () => <g />,
    };
});

describe('PriceHistoryModal Component', () => {
    const mockData = [
        { time: '01/01', price: 10000 },
        { time: '02/01', price: 20000 },
        { time: '03/01', price: 30000 },
    ];

    it('renders modal with title, stats, and close button', () => {
        const onClose = vi.fn();
        render(
            <PriceHistoryModal
                commodityName="Cà phê Arabica"
                data={mockData}
                onClose={onClose}
            />
        );

        expect(screen.getByText('Cà phê Arabica')).toBeInTheDocument();
        expect(screen.getByText('Price History Analysis')).toBeInTheDocument();

        // Check stats labels
        expect(screen.getByText('Cao nhất')).toBeInTheDocument();
        expect(screen.getByText('Thấp nhất')).toBeInTheDocument();
        expect(screen.getByText('Trung bình')).toBeInTheDocument();

        // Check calculated values
        expect(screen.getByText(/30\.000/)).toBeInTheDocument();
        expect(screen.getByText(/10\.000/)).toBeInTheDocument();
        expect(screen.getByText(/20\.000/)).toBeInTheDocument();
    });

    it('calls onClose when close button or background overlay is clicked', () => {
        const onClose = vi.fn();
        const { container } = render(
            <PriceHistoryModal
                commodityName="Cà phê Arabica"
                data={mockData}
                onClose={onClose}
            />
        );

        const closeBtn = screen.getByRole('button', { name: '✕' });
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);

        const overlay = container.querySelector('.bg-slate-950\\/80');
        if (overlay) {
            fireEvent.click(overlay);
            expect(onClose).toHaveBeenCalledTimes(2);
        }
    });

    it('switches time range filter when clicked', () => {
        render(
            <PriceHistoryModal
                commodityName="Cà phê Arabica"
                data={mockData}
                onClose={vi.fn()}
            />
        );

        const btn30D = screen.getByRole('button', { name: '30D' });
        fireEvent.click(btn30D);
        expect(btn30D.className).toContain('bg-blue-600');
    });

    it('handles empty data gracefully', () => {
        render(
            <PriceHistoryModal
                commodityName="Hàng trống"
                data={[]}
                onClose={vi.fn()}
            />
        );

        const dashes = screen.getAllByText('---');
        expect(dashes.length).toBe(3);
    });
});
