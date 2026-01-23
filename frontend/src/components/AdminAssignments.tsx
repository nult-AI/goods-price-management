"use client";
import React, { useState } from "react";
import { adminApi } from "@/lib/api";

interface AdminAssignmentsProps {
    users: any[];
    categories: any[];
    token: string;
    refresh: () => void;
}

export default function AdminAssignments({ users, categories, token, refresh }: AdminAssignmentsProps) {
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    // Filter DATA_ENTRY users only for assignments
    const dataEntryUsers = users.filter((u: any) => u.role === 'data_entry');

    const handleAssign = async (userId: string, categoryIds: string[]) => {
        setSubmitting(true);
        try {
            await adminApi.updateUserPermissions(token, userId, categoryIds);
            refresh();
            alert("✅ Phân quyền thành công!");
        } catch (err: any) {
            alert("❌ Lỗi: " + (err.message || "Không thể cập nhật phân quyền"));
        } finally {
            setSubmitting(false);
        }
    };

    const togglePermission = (catId: string) => {
        if (!selectedUser) return;
        const currentPerms = selectedUser.permitted_categories?.map((c: any) => c.id) || [];
        const newPerms = currentPerms.includes(catId)
            ? currentPerms.filter((id: string) => id !== catId)
            : [...currentPerms, catId];

        // Optimistic update
        const updatedUser = { ...selectedUser, permitted_categories: categories.filter(c => newPerms.includes(c.id)) };
        setSelectedUser(updatedUser);
        handleAssign(selectedUser.id, newPerms);
    };

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Quản trị phân quyền</h3>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* User List */}
                <div className="w-full lg:w-1/3 bg-slate-950/30 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Chọn nhân viên</p>
                    <div className="space-y-2">
                        {dataEntryUsers.map((u: any) => (
                            <button
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${selectedUser?.id === u.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-900 border border-slate-800'}`}
                            >
                                <span className="font-bold text-sm">{u.full_name || u.username}</span>
                                <span className="text-[10px] opacity-70">({u.permitted_categories?.length || 0} Nhóm)</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Permission Matrix */}
                <div className="flex-grow bg-slate-950/30 border border-slate-800 rounded-3xl p-8">
                    {selectedUser ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                                <div>
                                    <h4 className="text-xl font-bold text-white tracking-tight">{selectedUser.full_name || selectedUser.username}</h4>
                                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1">Sơ đồ phân quyền truy cập</p>
                                </div>
                                {submitting && <div className="text-[10px] font-bold text-blue-400 animate-pulse tracking-widest">ĐANG LƯU...</div>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categories.map((c: any) => {
                                    const isPermitted = selectedUser.permitted_categories?.some((pc: any) => pc.id === c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => togglePermission(c.id)}
                                            disabled={submitting}
                                            className={`p-5 rounded-2xl border flex items-center justify-between transition-all ${isPermitted ? 'bg-blue-600/10 border-blue-500 text-white' : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                        >
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="font-bold text-sm tracking-tight">{c.name}</span>
                                                <span className="text-[9px] font-mono uppercase opacity-50">{c.slug}</span>
                                            </div>
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isPermitted ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-800 text-transparent'}`}>
                                                ✓
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 select-none">
                            <div className="text-6xl mb-6">🔒</div>
                            <p className="max-w-[250px] text-xs font-black uppercase tracking-[0.3em] leading-relaxed">Vui lòng chọn nhân viên ở danh sách bên trái để cấu hình quyền truy cập danh mục</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
