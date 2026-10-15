import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';

vi.mock('@/lib/api', () => ({
    authApi: {
        login: vi.fn(),
        getMe: vi.fn(),
    },
}));

describe('useAuth Hook & AuthProvider', () => {
    const mockUser = {
        id: 'u-1',
        username: 'admin',
        fullName: 'Admin User',
        role: 'admin' as const,
        must_change_password: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('throws error when username validation fails (not email and not admin)', async () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await expect(result.current.login('invalid_user', 'password123')).rejects.toThrow(
                "Username không hợp lệ. Vui lòng nhập Email hoặc 'admin'."
            );
        });

        expect(authApi.login).not.toHaveBeenCalled();
    });

    it('successfully logs in with admin username', async () => {
        vi.mocked(authApi.login).mockResolvedValueOnce({ access_token: 'fake-jwt-token' });
        vi.mocked(authApi.getMe).mockResolvedValueOnce(mockUser);

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.login('admin', '123456');
        });

        expect(localStorage.getItem('token')).toBe('fake-jwt-token');
        expect(result.current.token).toBe('fake-jwt-token');
        expect(result.current.user).toEqual(mockUser);
    });

    it('successfully logs in with valid email format', async () => {
        vi.mocked(authApi.login).mockResolvedValueOnce({ access_token: 'email-token' });
        vi.mocked(authApi.getMe).mockResolvedValueOnce({ ...mockUser, username: 'user@example.com' });

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => {
            await result.current.login('user@example.com', 'secret');
        });

        expect(authApi.login).toHaveBeenCalledWith({
            username: 'user@example.com',
            password: 'secret',
        });
        expect(result.current.user?.username).toBe('user@example.com');
    });

    it('logs out and clears token and user state', async () => {
        localStorage.setItem('token', 'existing-token');
        vi.mocked(authApi.getMe).mockResolvedValueOnce(mockUser);

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
            expect(result.current.user).toEqual(mockUser);
        });

        act(() => {
            result.current.logout();
        });

        expect(localStorage.getItem('token')).toBeNull();
        expect(result.current.token).toBeNull();
        expect(result.current.user).toBeNull();
    });
});
