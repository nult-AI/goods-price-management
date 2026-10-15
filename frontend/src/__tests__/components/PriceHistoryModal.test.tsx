import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PriceHistoryModal from '@/components/PriceHistoryModal';

// Mock Recharts components for jsdom environment
vi.mock('recharts', async () => {
    const original = await vi.importActual<any>('recharts');
    return {
        ...original,
        ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
        AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
        Area: () => <div data-testid="chart-area" />,
        XAxis: () => <div data-testid="x-axis" />,
        YAxis: () => <div data-testid="y-axis" />,
        Tooltip: () => <div data-testid="tooltip" />,
        CartesianGrid: () => <div data-testid="cartesian-grid" />,
    };
});

describe('PriceHistoryModal Component', () => {
    const mockData = [
        { time: '08:00', price: 100000 },
        { time: '12:00', price: 150000 },
        { time: '16:00', price: 200000 },
    ];

    it('renders successfully with commodity name and stats', () => {
        render(
            <PriceHistoryModal
                commodityName="Cà phê Arabica"
                data={mockData}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('Cà phê Arabica')).toBeInTheDocument();
        expect(screen.getByText('Price History Analysis')).toBeInTheDocument();

        // Stats labels
        expect(screen.getByText('Cao nhất')).toBeInTheDocument();
        expect(screen.getByText('Thấp nhất')).toBeInTheDocument();
        expect(screen.getByText('Trung bình')).toBeInTheDocument();
    });

    it('allows changing the time range', () => {
        render(
            <PriceHistoryModal
                commodityName="Hồ tiêu"
                data={mockData}
                onClose={vi.fn()}
            />
        );

        const button30D = screen.getByText('30D');
        expect(button30D).not.toHaveClass('bg-blue-600');

        fireEvent.click(button30D);
        expect(button30D).toHaveClass('bg-blue-600');
    });

    it('triggers onClose when close button is clicked', () => {
        const handleClose = vi.fn();
        render(
            <PriceHistoryModal
                commodityName="Cao su"
                data={mockData}
                onClose={handleClose}
            />
        );

        const closeButton = screen.getByRole('button', { name: '✕' });
        fireEvent.click(closeButton);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when backdrop is clicked', () => {
        const handleClose = vi.fn();
        const { container } = render(
            <PriceHistoryModal
                commodityName="Cao su"
                data={mockData}
                onClose={handleClose}
            />
        );

        const backdrop = container.querySelector('.bg-slate-950\\/80');
        expect(backdrop).not.toBeNull();
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(handleClose).toHaveBeenCalledTimes(1);
        }
    });

    it('renders empty stats indicator when no data is provided', () => {
        render(
            <PriceHistoryModal
                commodityName="Hàng hóa trống"
                data={[]}
                onClose={vi.fn()}
            />
        );

        const emptyStats = screen.getAllByText('---');
        expect(emptyStats.length).toBe(2);
    });
});
