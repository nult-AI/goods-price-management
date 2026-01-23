"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';

export type Role = 'admin' | 'data_entry';

interface User {
    id: string;
    username: string;
    fullName: string;
    role: Role;
    must_change_password: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (username: string, password?: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Load token and user on mount
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
            fetchUser(savedToken);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async (t: string) => {
        try {
            const userData = await authApi.getMe(t);
            setUser(userData);
        } catch (e) {
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (username: string, password: string = "123456") => {
        // Basic validation logic for UI feedback
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
        const isAdmin = username.toLowerCase() === 'admin';
        if (!isEmail && !isAdmin) {
            throw new Error("Username không hợp lệ. Vui lòng nhập Email hoặc 'admin'.");
        }

        const { access_token } = await authApi.login({ username, password });
        localStorage.setItem('token', access_token);
        setToken(access_token);
        await fetchUser(access_token);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const refreshUser = async () => {
        if (token) await fetchUser(token);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
