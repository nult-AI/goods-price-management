"use client";
import React, { useState } from "react";
import { adminApi } from "@/lib/api";

interface AdminUsersProps {
    users: any[];
    token: string;
    refresh: () => void;
}

export default function AdminUsers({ users, token, refresh }: AdminUsersProps) {
    const [showForm, setShowForm] = useState(false);
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [role, setRole] = useState("data_entry");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!username) return;
        setError("");
        setSubmitting(true);
        try {
            await adminApi.createUser(token, {
                username,
                password: "123456",
                full_name: fullName,
                role
            });
            setUsername(""); setFullName(""); setRole("data_entry"); setShowForm(false);
            refresh();
        } catch (err: any) {
            setError(err.message || "Lỗi tạo tài khoản");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Quản trị nhân sự</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    disabled={submitting}
                    className="bg-blue-600 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all hover:scale-105 disabled:opacity-50"
                >
                    {showForm ? "Đóng" : "Hợp tác viên mới"}
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tên đăng nhập (Email/Username)</label>
                            <input
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                disabled={submitting}
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none disabled:opacity-50"
                                placeholder="Tên đăng nhập"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Họ và tên</label>
                            <input
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                disabled={submitting}
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none disabled:opacity-50"
                                placeholder="Họ và tên"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Vai trò</label>
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                disabled={submitting}
                                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none disabled:opacity-50"
                            >
                                <option value="data_entry">Data Entry (Cập nhật giá)</option>
                                <option value="admin">Admin (Quản trị hệ thống)</option>
                            </select>
                        </div>
                        <div className="flex items-center text-[10px] text-slate-500 italic mt-auto pb-4">
                            * Mật khẩu mặc định: 123456
                        </div>
                    </div>
                    {error && <p className="text-rose-500 text-[11px] font-bold">{error}</p>}
                    <button
                        onClick={handleCreate}
                        disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Đang xử lý..." : "Kích hoạt tài khoản"}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {users.map((u: any) => (
                    <div key={u.id} className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-xl">👤</div>
                            <div>
                                <h4 className="font-bold text-white tracking-tight">{u.full_name || u.username}</h4>
                                <div className="flex gap-2 items-center mt-1">
                                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{u.role}</span>
                                    {u.must_change_password && (
                                        <span className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-tighter">New</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
