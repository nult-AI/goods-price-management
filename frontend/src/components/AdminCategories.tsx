"use client";
import React, { useState } from "react";
import { adminApi } from "@/lib/api";

interface AdminCategoriesProps {
    categories: any[];
    token: string;
    refresh: () => void;
}

export default function AdminCategories({ categories, token, refresh }: AdminCategoriesProps) {
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async () => {
        if (!name) return;
        setError("");
        setSubmitting(true);
        try {
            const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
            await adminApi.createCategory(token, { name, slug });
            setName("");
            refresh();
        } catch (err: any) {
            setError(err.message || "Lỗi tạo danh mục");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Danh mục hàng hóa</h3>
            </div>

            <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tạo danh mục mới</label>
                <div className="flex gap-4">
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        disabled={submitting}
                        className="flex-grow bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                        placeholder="Ví dụ: Nông sản"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? "Đang tạo..." : "Tạo ngay"}
                    </button>
                </div>
                {error && <p className="text-rose-500 text-[11px] font-bold">{error}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((c: any) => (
                    <div key={c.id} className="p-6 bg-slate-900/40 border border-slate-800 rounded-3xl hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-white text-lg tracking-tight group-hover:text-blue-400 transition-colors">{c.name}</h4>
                                <p className="text-[10px] text-slate-600 font-mono mt-1 uppercase tracking-wider">{c.slug}</p>
                            </div>
                            <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">📁</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
