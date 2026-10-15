import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '@/app/page';
import { fetchCategories, fetchCommodities } from '@/lib/api';

vi.mock('@/lib/api', () => ({
    fetchCategories: vi.fn(),
    fetchCommodities: vi.fn(),
}));

vi.mock('@/hooks/useRealtimePrices', () => ({
    useRealtimePrices: () => ({ isConnected: true }),
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'user-1', username: 'admin', role: 'admin' },
    }),
}));

vi.mock('@/components/PriceHistoryModal', () => ({
    default: ({ commodityName, onClose }: any) => (
        <div data-testid="mock-price-history-modal">
            <span>Modal: {commodityName}</span>
            <button onClick={onClose}>CloseModal</button>
        </div>
    ),
}));

describe('Home Page (Trang danh sách giá)', () => {
    const mockCategories = [
        { id: 'cat-1', name: 'Nông sản', slug: 'nong-san' },
        { id: 'cat-2', name: 'Kim loại', slug: 'kim-loai' },
    ];

    const mockCommodities = [
        {
            id: 'c-1',
            name: 'Cà phê Robusta',
            slug: 'ca-phe-robusta',
            unit: 'kg',
            region: { name: 'Tây Nguyên' },
            category: { name: 'Nông sản' },
            latest_price: { price: 85000, timestamp: '2025-01-01T10:00:00Z' },
            change: 3.5,
            created_at: '2025-01-01T10:00:00Z',
        },
        {
            id: 'c-2',
            name: 'Thép cuộn',
            slug: 'thep-cuon',
            unit: 'tấn',
            region: { name: 'Miền Bắc' },
            category: { name: 'Kim loại' },
            latest_price: { price: 15000000, timestamp: '2025-01-01T11:00:00Z' },
            change: -1.2,
            created_at: '2025-01-01T11:00:00Z',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetchCategories).mockResolvedValue(mockCategories);
        vi.mocked(fetchCommodities).mockResolvedValue(mockCommodities);
    });

    it('renders page header and shows initial loading indicator', () => {
        vi.mocked(fetchCommodities).mockImplementation(() => new Promise(() => {}));
        render(<Home />);

        expect(screen.getByText('Bảng Giá Thị Trường')).toBeInTheDocument();
        expect(screen.getByText('ĐANG ĐỒNG BỘ DỮ LIỆU...')).toBeInTheDocument();
    });

    it('renders price list table successfully after API returns data', async () => {
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
            expect(screen.getByText('Thép cuộn')).toBeInTheDocument();
        });

        expect(screen.getByText('Tây Nguyên')).toBeInTheDocument();
        expect(screen.getByText('Miền Bắc')).toBeInTheDocument();
        expect(screen.getByText('▲ 3.5%')).toBeInTheDocument();
        expect(screen.getByText('▼ 1.2%')).toBeInTheDocument();
    });

    it('switches currency conversion when currency button is clicked', async () => {
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
        });

        // Default target currency is USD
        expect(screen.getByText('Quy Đổi (USD)')).toBeInTheDocument();

        // Click EUR button
        const eurButton = screen.getByRole('button', { name: 'EUR' });
        fireEvent.click(eurButton);

        expect(screen.getByText('Quy Đổi (EUR)')).toBeInTheDocument();
    });

    it('toggles column visibility when column buttons are clicked', async () => {
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByText('Tây Nguyên')).toBeInTheDocument();
        });

        // Click the 'region' toggle button
        const regionToggle = screen.getByRole('button', { name: 'region' });
        fireEvent.click(regionToggle);

        // Region column is hidden
        expect(screen.queryByText('Tây Nguyên')).not.toBeInTheDocument();

        // Click again to show
        fireEvent.click(regionToggle);
        expect(screen.getByText('Tây Nguyên')).toBeInTheDocument();
    });

    it('handles category button filter selection', async () => {
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByText('Nông sản')).toBeInTheDocument();
        });

        const categoryBtn = screen.getByRole('button', { name: 'Nông sản' });
        fireEvent.click(categoryBtn);

        await waitFor(() => {
            expect(fetchCommodities).toHaveBeenCalledWith(
                expect.objectContaining({
                    category_slug: 'nong-san',
                })
            );
        });
    });

    it('handles search input change', async () => {
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Tìm kiếm hàng hóa, khu vực...');
        fireEvent.change(searchInput, { target: { value: 'Thép' } });

        await waitFor(() => {
            expect(fetchCommodities).toHaveBeenCalledWith(
                expect.objectContaining({
                    search: 'Thép',
                })
            );
        });
    });

    it('opens price history chart modal when chart button is clicked and closes it', async () => {
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
        });

        const chartButtons = screen.getAllByText('📊');
        fireEvent.click(chartButtons[0]);

        expect(screen.getByTestId('mock-price-history-modal')).toBeInTheDocument();
        expect(screen.getByText('Modal: Cà phê Robusta')).toBeInTheDocument();

        // Close modal
        fireEvent.click(screen.getByText('CloseModal'));
        expect(screen.queryByTestId('mock-price-history-modal')).not.toBeInTheDocument();
    });

    it('handles API fetch failure gracefully without crashing', async () => {
        vi.mocked(fetchCommodities).mockRejectedValueOnce(new Error('Network Error 500'));
        render(<Home />);

        await waitFor(() => {
            expect(screen.getByText('Bảng Giá Thị Trường')).toBeInTheDocument();
        });
    });
});
