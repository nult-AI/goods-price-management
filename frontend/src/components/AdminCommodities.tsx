"use client";
import React, { useState } from "react";
import { adminApi } from "@/lib/api";
import { fuzzyMatch } from "@/lib/utils";

interface AdminCommoditiesProps {
    commodities: any[];
    categories: any[];
    token: string;
    refresh: () => void;
}

export default function AdminCommodities({ commodities, categories, token, refresh }: AdminCommoditiesProps) {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [unit, setUnit] = useState("");
    const [catId, setCatId] = useState("");
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [error, setError] = useState("");

    const filtered = commodities.filter((c: any) =>
        fuzzyMatch(c.name, search) ||
        (c.category && fuzzyMatch(c.category.name, search))
    );

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filtered.length && filtered.length > 0) setSelectedIds([]);
        else setSelectedIds(filtered.map((c: any) => c.id));
    };

    const handleBulkAssign = async (targetCatId: string | null) => {
        if (selectedIds.length === 0) return;
        try {
            await adminApi.bulkUpdateCommodityCategory(token, selectedIds, targetCatId);
            setSelectedIds([]);
            refresh();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleCreate = async () => {
        if (!name || !unit) return;
        setError("");
        try {
            const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
            await adminApi.createCommodity(token, { name, slug, unit, category_id: catId || null });
            setName(""); setUnit(""); setCatId(""); setShowForm(false);
            refresh();
        } catch (err: any) {
            setError(err.message || "Lỗi tạo hàng hóa");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Quản lý Kho hàng</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Hiển thị {filtered.length} kết quả</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-grow md:w-64">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                        <input
                            placeholder="Lọc tên hàng hoặc nhóm..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                        />
                    </div>
                    <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95">
                        {showForm ? "Đóng" : "Thêm mới"}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tên hàng hóa</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Ví dụ: Dầu thô Brent" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Đơn vị</label>
                            <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none transition-all" placeholder="Ví dụ: thùng" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nhóm</label>
                            <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-blue-500 outline-none transition-all cursor-pointer">
                                <option value="">Không phân lớp</option>
                                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    {error && <p className="text-rose-500 text-[11px] font-bold text-center">{error}</p>}
                    <button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98]">Xác nhận tạo hàng hóa</button>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="sticky top-0 z-10 flex items-center justify-between bg-blue-600 p-5 rounded-3xl shadow-2xl animate-in slide-in-from-top-4 border border-blue-400/30">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-black text-sm text-white">{selectedIds.length}</span>
                            <span className="text-white font-black text-[11px] uppercase tracking-widest">Đã chọn</span>
                        </div>
                        <div className="h-8 w-px bg-white/20" />
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Gán nhanh vào nhóm:</span>
                            <select
                                onChange={(e) => handleBulkAssign(e.target.value || null)}
                                className="bg-slate-900/40 border border-white/20 text-white text-[10px] font-bold rounded-xl px-4 py-2 focus:outline-none cursor-pointer hover:bg-slate-900/60 transition-all"
                            >
                                <option value="" className="text-slate-900">-- Chọn danh mục --</option>
                                {categories.map((cat: any) => (
                                    <option key={cat.id} value={cat.id} className="text-slate-900">{cat.name}</option>
                                ))}
                                <option value="" className="text-rose-600 font-black">❌ Gỡ khỏi nhóm</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={() => setSelectedIds([])} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest transition-all">Hủy bỏ</button>
                </div>
            )}

            <div className="border border-slate-800 rounded-[2.5rem] overflow-hidden bg-slate-950/30 backdrop-blur-md shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                            <th className="px-6 py-5 w-12 text-center">
                                <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === filtered.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0" />
                            </th>
                            <th className="px-6 py-5">Tên Sản phẩm</th>
                            <th className="px-6 py-5">Đơn vị</th>
                            <th className="px-6 py-5">Phân loại</th>
                            <th className="px-6 py-5 text-right">Chỉnh sửa nhanh</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {filtered.map((c: any) => (
                            <tr key={c.id} className={`hover:bg-blue-600/[0.03] transition-all group ${selectedIds.includes(c.id) ? 'bg-blue-600/[0.08]' : ''}`}>
                                <td className="px-6 py-5 text-center">
                                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 focus:ring-offset-0" />
                                </td>
                                <td className="px-6 py-5 font-bold text-white text-sm tracking-tight">{c.name}</td>
                                <td className="px-6 py-5">
                                    <span className="px-2 py-1 bg-slate-900 rounded text-[10px] font-mono text-slate-400 font-bold border border-slate-800">{c.unit}</span>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${c.category ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800/50 text-slate-600 border border-slate-800/50'}`}>
                                        {c.category?.name || "Chưa phân loại"}
                                    </span>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <select
                                        value={c.category_id || ""}
                                        onChange={(e) => adminApi.updateCommodityCategory(token, c.id, e.target.value || null).then(() => refresh())}
                                        className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-500 focus:border-blue-500 outline-none cursor-pointer appearance-none hover:text-slate-300 transition-colors"
                                    >
                                        <option value="">Gán nhóm...</option>
                                        {categories.map((cat: any) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                        <option value="">-- Gỡ nhóm --</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="py-24 text-center">
                        <div className="text-4xl mb-4">🛸</div>
                        <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Hệ thống không tìm thấy dữ liệu phù hợp</p>
                    </div>
                )}
            </div>
        </div>
    );
}
