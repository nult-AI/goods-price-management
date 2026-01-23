"use client";
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';

export default function ChangePasswordModal() {
    const { user, token, refreshUser } = useAuth();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!user || !user.must_change_password) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword.length < 6) {
            setError("Mật khẩu phải có ít nhất 6 ký tự.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);
        try {
            await authApi.changePassword(token!, newPassword);
            await refreshUser();
        } catch (err: any) {
            setError(err.message || "Có lỗi xảy ra khi đổi mật khẩu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center font-bold text-white mx-auto mb-4 shadow-lg shadow-amber-500/20">🔑</div>
                    <h2 className="text-2xl font-black italic tracking-tighter uppercase">Đổi mật khẩu</h2>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Bạn cần đổi mật khẩu mặc định (123456) để tiếp tục</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Mật khẩu mới</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                        disabled={loading}
                        className="w-full bg-amber-500 hover:bg-amber-400 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT MẬT KHẨU"}
                    </button>
                </form>
            </div>
        </div>
    );
}
