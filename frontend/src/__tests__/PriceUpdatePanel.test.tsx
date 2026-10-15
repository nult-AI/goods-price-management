import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PriceUpdatePanel from '@/components/PriceUpdatePanel';
import * as apiModule from '@/lib/api';

vi.mock('@/lib/api', () => ({
    fetchCategories: vi.fn(),
    fetchCommodities: vi.fn(),
    dataEntryApi: {
        getMyCommodities: vi.fn(),
        updatePrice: vi.fn(),
    },
}));

vi.mock('@/hooks/useRealtimePrices', () => ({
    useRealtimePrices: () => ({ isConnected: true }),
}));

describe('PriceUpdatePanel Component', () => {
    const mockAdminUser = { id: 'u1', username: 'admin', role: 'admin' };
    const mockDataEntryUser = { id: 'u2', username: 'staff', role: 'data_entry' };
    const mockToken = 'mock-jwt-token';

    const mockCategories = [
        { id: 'cat1', name: 'Nông sản', slug: 'nong-san' },
        { id: 'cat2', name: 'Kim loại', slug: 'kim-loai' },
    ];

    const mockCommodities = [
        {
            id: 'c1',
            name: 'Cà phê Robusta',
            slug: 'ca-phe-robusta',
            unit: 'kg',
            category: { id: 'cat1', name: 'Nông sản', slug: 'nong-san' },
            latest_price: { price: 50000, timestamp: '2025-01-01T10:00:00Z' },
            created_at: '2025-01-01T00:00:00Z',
        },
        {
            id: 'c2',
            name: 'Thép Xây Dựng',
            slug: 'thep-xay-dung',
            unit: 'tấn',
            category: { id: 'cat2', name: 'Kim loại', slug: 'kim-loai' },
            latest_price: { price: 15000000, timestamp: '2025-01-01T10:00:00Z' },
            created_at: '2025-01-01T00:00:00Z',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        vi.mocked(apiModule.fetchCategories).mockResolvedValue(mockCategories);
        vi.mocked(apiModule.fetchCommodities).mockResolvedValue(mockCommodities);
        vi.mocked(apiModule.dataEntryApi.getMyCommodities).mockResolvedValue(mockCommodities);
        vi.mocked(apiModule.dataEntryApi.updatePrice).mockResolvedValue({ success: true } as any);
    });

    it('renders loading spinner initially', async () => {
        render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);
        expect(document.querySelector('.animate-spin')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
        });
    });

    it('renders commodities and categories successfully for admin', async () => {
        render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

        await waitFor(() => {
            expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
            expect(screen.getByText('Thép Xây Dựng')).toBeInTheDocument();
        });

        expect(screen.getByText('Tất cả')).toBeInTheDocument();
        expect(screen.getByText('Nông sản')).toBeInTheDocument();
        expect(screen.getByText('Kim loại')).toBeInTheDocument();
        expect(screen.getByText(/Quản lý toàn bộ 2 mặt hàng/)).toBeInTheDocument();
    });

    it('renders commodities list for data entry role', async () => {
        render(<PriceUpdatePanel user={mockDataEntryUser} token={mockToken} />);

        await waitFor(() => {
            expect(screen.getByText(/Đang quản lý 2 mặt hàng được phân quyền/)).toBeInTheDocument();
        });
        expect(apiModule.dataEntryApi.getMyCommodities).toHaveBeenCalledWith(mockToken, '');
    });

    it('filters commodities by category when clicked', async () => {
        render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

        await waitFor(() => {
            expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
        });

        // Click on "Kim loại" category button
        const categoryBtn = screen.getByRole('button', { name: 'Kim loại' });
        fireEvent.click(categoryBtn);

        await waitFor(() => {
            expect(screen.getByText('Thép Xây Dựng')).toBeInTheDocument();
            expect(screen.queryByText('Cà phê Robusta')).not.toBeInTheDocument();
        });
    });

    it('filters commodities by search query', async () => {
        render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

        await waitFor(() => {
            expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText('Tìm kiếm hàng hóa để cập nhật...');
        fireEvent.change(searchInput, { target: { value: 'Thép' } });

        await waitFor(() => {
            expect(screen.getByText('Thép Xây Dựng')).toBeInTheDocument();
            expect(screen.queryByText('Cà phê Robusta')).not.toBeInTheDocument();
        });
    });

    it('displays empty state when no commodities match', async () => {
        vi.mocked(apiModule.fetchCommodities).mockResolvedValue([]);
        render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

        await waitFor(() => {
            expect(screen.getByText('Chưa có hàng hóa trong hệ thống')).toBeInTheDocument();
        });
    });

    describe('Validation & Form Interaction', () => {
        it('validates against empty or non-numeric price', async () => {
            render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

            await waitFor(() => {
                expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
            });

            // Click edit button for the first commodity
            const editButtons = screen.getAllByTitle('Sửa giá');
            fireEvent.click(editButtons[0]);

            const priceInput = screen.getByPlaceholderText('Nhập giá...');
            expect(priceInput).toBeInTheDocument();

            // Clear input and submit empty
            fireEvent.change(priceInput, { target: { value: '' } });
            const saveButton = screen.getByTitle('Lưu giá');
            fireEvent.click(saveButton);

            expect(window.alert).toHaveBeenCalledWith('⚠️ Giá không hợp lệ!');
            expect(apiModule.dataEntryApi.updatePrice).not.toHaveBeenCalled();
        });

        it('validates against negative or zero price', async () => {
            render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

            await waitFor(() => {
                expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByTitle('Sửa giá');
            fireEvent.click(editButtons[0]);

            const priceInput = screen.getByPlaceholderText('Nhập giá...');

            // Test negative price
            fireEvent.change(priceInput, { target: { value: '-1000' } });
            const saveButton = screen.getByTitle('Lưu giá');
            fireEvent.click(saveButton);

            expect(window.alert).toHaveBeenCalledWith('⚠️ Giá không hợp lệ!');
            expect(apiModule.dataEntryApi.updatePrice).not.toHaveBeenCalled();

            // Test zero price
            fireEvent.change(priceInput, { target: { value: '0' } });
            fireEvent.click(saveButton);
            expect(window.alert).toHaveBeenCalledWith('⚠️ Giá không hợp lệ!');
            expect(apiModule.dataEntryApi.updatePrice).not.toHaveBeenCalled();
        });

        it('submits valid price update and calls updatePrice API', async () => {
            render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

            await waitFor(() => {
                expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByTitle('Sửa giá');
            fireEvent.click(editButtons[0]);

            const priceInput = screen.getByPlaceholderText('Nhập giá...');
            fireEvent.change(priceInput, { target: { value: '65000' } });

            const saveButton = screen.getByTitle('Lưu giá');
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(apiModule.dataEntryApi.updatePrice).toHaveBeenCalledWith(mockToken, {
                    commodity_id: 'c1',
                    price: 65000,
                });
            });
        });

        it('supports submitting price via Enter key', async () => {
            render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

            await waitFor(() => {
                expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByTitle('Sửa giá');
            fireEvent.click(editButtons[0]);

            const priceInput = screen.getByPlaceholderText('Nhập giá...');
            fireEvent.change(priceInput, { target: { value: '70000' } });
            fireEvent.keyDown(priceInput, { key: 'Enter', code: 'Enter' });

            await waitFor(() => {
                expect(apiModule.dataEntryApi.updatePrice).toHaveBeenCalledWith(mockToken, {
                    commodity_id: 'c1',
                    price: 70000,
                });
            });
        });

        it('cancels editing on cancel button click or Escape key', async () => {
            render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

            await waitFor(() => {
                expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByTitle('Sửa giá');
            fireEvent.click(editButtons[0]);

            const cancelBtn = screen.getByTitle('Hủy');
            fireEvent.click(cancelBtn);

            expect(screen.queryByPlaceholderText('Nhập giá...')).not.toBeInTheDocument();

            // Test Escape key
            fireEvent.click(screen.getAllByTitle('Sửa giá')[0]);
            const priceInput = screen.getByPlaceholderText('Nhập giá...');
            fireEvent.keyDown(priceInput, { key: 'Escape', code: 'Escape' });

            expect(screen.queryByPlaceholderText('Nhập giá...')).not.toBeInTheDocument();
        });

        it('displays error alert when API update fails (500 or 400)', async () => {
            vi.mocked(apiModule.dataEntryApi.updatePrice).mockRejectedValueOnce(
                new Error('Internal Server Error 500')
            );

            render(<PriceUpdatePanel user={mockAdminUser} token={mockToken} />);

            await waitFor(() => {
                expect(screen.getByText('Cà phê Robusta')).toBeInTheDocument();
            });

            const editButtons = screen.getAllByTitle('Sửa giá');
            fireEvent.click(editButtons[0]);

            const priceInput = screen.getByPlaceholderText('Nhập giá...');
            fireEvent.change(priceInput, { target: { value: '80000' } });

            const saveButton = screen.getByTitle('Lưu giá');
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('❌ Lỗi: Internal Server Error 500');
            });
        });
    });
});
