"use client";
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { login } = useAuth();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            await login(username, password);
            onClose();
        } catch (err: any) {
            setError(err.message || "Tài khoản hoặc mật khẩu không chính xác.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-white mx-auto mb-4 shadow-lg shadow-blue-500/20">C</div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">Đăng nhập hệ thống</h2>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Truy cập Terminal Quản trị & Nhập liệu</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tài khoản</label>
                        <input
                            type="text"
                            placeholder="email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Mật khẩu</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[11px] font-bold text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]"
                    >
                        Vào hệ thống
                    </button>
                </form>

                <button
                    onClick={onClose}
                    className="w-full mt-4 text-[10px] text-slate-600 hover:text-slate-400 font-bold uppercase tracking-widest transition-all"
                >
                    Để sau
                </button>
            </div>
        </div>
    );
}
