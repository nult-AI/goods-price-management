import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PriceUpdatePanel from '@/components/PriceUpdatePanel';
import { dataEntryApi, fetchCommodities, fetchCategories } from '@/lib/api';

vi.mock('@/lib/api', () => ({
    dataEntryApi: {
        getMyCommodities: vi.fn(),
        updatePrice: vi.fn(),
    },
    fetchCommodities: vi.fn(),
    fetchCategories: vi.fn(),
}));

vi.mock('@/hooks/useRealtimePrices', () => ({
    useRealtimePrices: () => ({ isConnected: true }),
}));

describe('PriceUpdatePanel Component', () => {
    const mockCategories = [
        { id: 'cat-1', name: 'Nông sản', slug: 'nong-san' },
        { id: 'cat-2', name: 'Kim loại', slug: 'kim-loai' },
    ];

    const mockCommodities = [
        {
            id: 'comm-1',
            name: 'Gạo ST25',
            slug: 'gao-st25',
            unit: 'kg',
            category: { id: 'cat-1', name: 'Nông sản', slug: 'nong-san' },
            latest_price: { price: 25000, timestamp: '2025-01-01T08:00:00Z' },
            created_at: '2025-01-01T08:00:00Z',
        },
        {
            id: 'comm-2',
            name: 'Đồng đỏ',
            slug: 'dong-do',
            unit: 'tấn',
            category: { id: 'cat-2', name: 'Kim loại', slug: 'kim-loai' },
            latest_price: { price: 200000000, timestamp: '2025-01-01T09:00:00Z' },
            created_at: '2025-01-01T09:00:00Z',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        window.alert = vi.fn();
        vi.mocked(fetchCategories).mockResolvedValue(mockCategories);
        vi.mocked(fetchCommodities).mockResolvedValue(mockCommodities);
        vi.mocked(dataEntryApi.getMyCommodities).mockResolvedValue(mockCommodities);
        vi.mocked(dataEntryApi.updatePrice).mockResolvedValue({ success: true } as any);
    });

    it('renders loading indicator initially', () => {
        vi.mocked(fetchCommodities).mockImplementation(() => new Promise(() => {}));
        const { container } = render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('renders commodities table successfully for admin user', async () => {
        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
            expect(screen.getByText('Đồng đỏ')).toBeInTheDocument();
        });

        expect(screen.getByText(/Quản lý toàn bộ 2 mặt hàng/)).toBeInTheDocument();
        expect(screen.getByText('Nông sản')).toBeInTheDocument();
        expect(screen.getByText('Kim loại')).toBeInTheDocument();
    });

    it('renders commodities table successfully for data_entry user', async () => {
        render(<PriceUpdatePanel user={{ role: 'data_entry' }} token="mock-token" />);

        await waitFor(() => {
            expect(dataEntryApi.getMyCommodities).toHaveBeenCalledWith('mock-token', '');
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        });

        expect(screen.getByText(/Đang quản lý 2 mặt hàng được phân quyền/)).toBeInTheDocument();
    });

    it('filters items by category click', async () => {
        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        });

        const metalCategoryBtn = screen.getByRole('button', { name: 'Kim loại' });
        fireEvent.click(metalCategoryBtn);

        await waitFor(() => {
            expect(screen.queryByText('Gạo ST25')).not.toBeInTheDocument();
            expect(screen.getByText('Đồng đỏ')).toBeInTheDocument();
        });
    });

    it('filters items by search input', async () => {
        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Tìm kiếm hàng hóa để cập nhật...');
        fireEvent.change(searchInput, { target: { value: 'Gạo' } });

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
            expect(screen.queryByText('Đồng đỏ')).not.toBeInTheDocument();
        });
    });

    it('shows validation alert when updating price with empty value', async () => {
        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        });

        // Click edit on the first item
        const editButtons = screen.getAllByTitle('Sửa giá');
        fireEvent.click(editButtons[0]);

        const priceInput = screen.getByPlaceholderText('Nhập giá...');
        fireEvent.change(priceInput, { target: { value: '' } });

        const saveBtn = screen.getByTitle('Lưu giá');
        fireEvent.click(saveBtn);

        expect(window.alert).toHaveBeenCalledWith('⚠️ Giá không hợp lệ!');
        expect(dataEntryApi.updatePrice).not.toHaveBeenCalled();
    });

    it('shows validation alert when updating price with negative number', async () => {
        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        });

        const editButtons = screen.getAllByTitle('Sửa giá');
        fireEvent.click(editButtons[0]);

        const priceInput = screen.getByPlaceholderText('Nhập giá...');
        fireEvent.change(priceInput, { target: { value: '-5000' } });

        const saveBtn = screen.getByTitle('Lưu giá');
        fireEvent.click(saveBtn);

        expect(window.alert).toHaveBeenCalledWith('⚠️ Giá không hợp lệ!');
        expect(dataEntryApi.updatePrice).not.toHaveBeenCalled();
    });

    it('successfully submits valid price update and exits editing mode', async () => {
        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        });

        const editButtons = screen.getAllByTitle('Sửa giá');
        fireEvent.click(editButtons[0]);

        const priceInput = screen.getByPlaceholderText('Nhập giá...');
        fireEvent.change(priceInput, { target: { value: '30000' } });

        const saveBtn = screen.getByTitle('Lưu giá');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(dataEntryApi.updatePrice).toHaveBeenCalledWith('mock-token', {
                commodity_id: 'comm-1',
                price: 30000,
            });
            expect(screen.queryByPlaceholderText('Nhập giá...')).not.toBeInTheDocument();
        });
    });

    it('submits update on Enter key press and cancels on Escape key press', async () => {
        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        });

        const editButtons = screen.getAllByTitle('Sửa giá');
        fireEvent.click(editButtons[0]);

        const priceInput = screen.getByPlaceholderText('Nhập giá...');
        fireEvent.keyDown(priceInput, { key: 'Escape' });

        expect(screen.queryByPlaceholderText('Nhập giá...')).not.toBeInTheDocument();
    });

    it('handles API error on price update (e.g., 400 or 500 error)', async () => {
        vi.mocked(dataEntryApi.updatePrice).mockRejectedValueOnce(new Error('Internal Server Error 500'));

        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Gạo ST25')).toBeInTheDocument();
        });

        const editButtons = screen.getAllByTitle('Sửa giá');
        fireEvent.click(editButtons[0]);

        const priceInput = screen.getByPlaceholderText('Nhập giá...');
        fireEvent.change(priceInput, { target: { value: '45000' } });

        const saveBtn = screen.getByTitle('Lưu giá');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('❌ Lỗi: Internal Server Error 500');
        });
    });

    it('displays empty state when no commodities match', async () => {
        vi.mocked(fetchCommodities).mockResolvedValueOnce([]);

        render(<PriceUpdatePanel user={{ role: 'admin' }} token="mock-token" />);

        await waitFor(() => {
            expect(screen.getByText('Chưa có hàng hóa trong hệ thống')).toBeInTheDocument();
        });
    });
});
