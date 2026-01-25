"use client";
import { useState, useEffect } from "react";
import { dataEntryApi, fetchCommodities } from "@/lib/api";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";

interface PriceUpdatePanelProps {
    user: any;
    token: string;
}

export default function PriceUpdatePanel({ user, token }: PriceUpdatePanelProps) {
    const [search, setSearch] = useState("");
    const [commodities, setCommodities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrice, setEditPrice] = useState<string>("");
    const [updating, setUpdating] = useState<string | null>(null);

    // Real-time synchronization
    const { isConnected } = useRealtimePrices((update) => {
        console.log("Real-time update received in Admin Panel:", update);
        setCommodities(prev => prev.map(c => {
            if (c.id === update.commodity_id) {
                console.log(`Updating commodity ${c.name} in UI`);
                return {
                    ...c,
                    latest_price: {
                        ...c.latest_price,
                        price: update.price,
                        timestamp: update.timestamp
                    }
                };
            }
            return c;
        }));
    });

    useEffect(() => {
        loadCommodities();
    }, []);

    const loadCommodities = async () => {
        setLoading(true);
        try {
            let data;
            if (user.role === 'admin') {
                // Admin gets all commodities
                data = await fetchCommodities({ search });
            } else {
                // Data entry gets only permitted commodities
                data = await dataEntryApi.getMyCommodities(token, search);
            }
            setCommodities(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadCommodities();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const startEdit = (commodityId: string, currentPrice: number) => {
        setEditingId(commodityId);
        setEditPrice(currentPrice?.toString() || "0");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditPrice("");
    };

    const handleUpdate = async (commodityId: string) => {
        const newPrice = parseFloat(editPrice);
        if (isNaN(newPrice) || newPrice <= 0) {
            alert("⚠️ Giá không hợp lệ!");
            return;
        }

        setUpdating(commodityId);
        try {
            await dataEntryApi.updatePrice(token, { commodity_id: commodityId, price: newPrice });
            setEditingId(null);
            setEditPrice("");
            loadCommodities();
        } catch (err: any) {
            alert("❌ Lỗi: " + (err.message || "Không thể cập nhật giá"));
        } finally {
            setUpdating(null);
        }
    };

    const filtered = commodities.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white">
                            Trạm Cập Nhật Giá
                        </h3>
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                            <span className={`text-[8px] font-black uppercase tracking-tighter ${isConnected ? 'text-emerald-500' : 'text-slate-500'}`}>
                                {isConnected ? 'Live' : 'Syncing...'}
                            </span>
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        {user.role === 'admin'
                            ? `Quản lý toàn bộ ${filtered.length} mặt hàng`
                            : `Đang quản lý ${filtered.length} mặt hàng được phân quyền`}
                    </p>
                </div>
                <div className="relative w-full md:w-80">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                    <input
                        placeholder="Tìm kiếm hàng hóa..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                    />
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                /* Data Table */
                <div className="border border-slate-800 rounded-[2.5rem] overflow-hidden bg-slate-950/30 backdrop-blur-md shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                                <th className="px-6 py-5">Tên Hàng Hóa</th>
                                <th className="px-6 py-5">Đơn vị</th>
                                <th className="px-6 py-5">Nhóm</th>
                                <th className="px-6 py-5 text-right">Giá Hiện Tại</th>
                                <th className="px-6 py-5 text-center">Cập Nhật Lần Cuối</th>
                                <th className="px-6 py-5 text-center">Nhập Giá Mới</th>
                                <th className="px-6 py-5 text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filtered.map((c: any) => {
                                const isEditing = editingId === c.id;
                                const isUpdating = updating === c.id;

                                return (
                                    <tr key={c.id} className={`transition-all ${isEditing ? 'bg-blue-600/10' : 'hover:bg-blue-600/[0.03]'} group`}>
                                        {/* Commodity Name */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-lg">📦</div>
                                                <div>
                                                    <p className="font-bold text-white text-sm tracking-tight">{c.name}</p>
                                                    <p className="text-[9px] text-slate-600 font-mono uppercase">{c.slug}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Unit */}
                                        <td className="px-6 py-5">
                                            <span className="px-2 py-1 bg-slate-900 rounded text-[10px] font-mono text-slate-400 font-bold border border-slate-800">
                                                {c.unit}
                                            </span>
                                        </td>

                                        {/* Category */}
                                        <td className="px-6 py-5">
                                            <span className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-blue-600/10 text-blue-400 border border-blue-500/20">
                                                {c.category?.name || "N/A"}
                                            </span>
                                        </td>

                                        {/* Current Price */}
                                        <td className="px-6 py-5 text-right">
                                            <div className="space-y-1">
                                                <p className="font-mono text-lg font-black text-white">
                                                    {c.latest_price
                                                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.latest_price.price)
                                                        : "---"}
                                                </p>
                                                <p className="text-[9px] text-slate-600 font-bold">/{c.unit}</p>
                                            </div>
                                        </td>

                                        {/* Last Update */}
                                        <td className="px-6 py-5 text-center">
                                            <p className="text-[10px] text-slate-500 font-medium">
                                                {c.latest_price
                                                    ? new Date(c.latest_price.timestamp).toLocaleString('vi-VN')
                                                    : "Chưa có dữ liệu"}
                                            </p>
                                        </td>

                                        {/* Price Input */}
                                        <td className="px-6 py-5">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={editPrice}
                                                        onChange={e => setEditPrice(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleUpdate(c.id);
                                                            if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                        className="w-full bg-slate-900 border-2 border-blue-500 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                        placeholder="Nhập giá..."
                                                        autoFocus
                                                        disabled={isUpdating}
                                                    />
                                                    <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">VNĐ</span>
                                                </div>
                                            ) : (
                                                <div className="text-center">
                                                    <span className="text-[10px] text-slate-600 italic">Click "Sửa" để nhập</span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center gap-2">
                                                {isEditing ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdate(c.id)}
                                                            disabled={isUpdating}
                                                            title="Lưu giá"
                                                            className="bg-green-600 hover:bg-green-500 w-10 h-10 flex items-center justify-center rounded-xl text-sm font-black shadow-lg shadow-green-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isUpdating ? "⏳" : "✓"}
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            disabled={isUpdating}
                                                            title="Hủy"
                                                            className="bg-slate-700 hover:bg-slate-600 w-10 h-10 flex items-center justify-center rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(c.id, c.latest_price?.price || 0)}
                                                        title="Sửa giá"
                                                        className="bg-blue-600 hover:bg-blue-500 w-10 h-10 flex items-center justify-center rounded-xl text-sm font-black shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                                                    >
                                                        ✎
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Empty State */}
                    {filtered.length === 0 && (
                        <div className="py-24 text-center">
                            <div className="text-4xl mb-4">📋</div>
                            <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">
                                {search
                                    ? "Không tìm thấy hàng hóa phù hợp"
                                    : user.role === 'admin'
                                        ? "Chưa có hàng hóa trong hệ thống"
                                        : "Bạn chưa được phân quyền quản lý hàng hóa nào"}
                            </p>
                            {user.role !== 'admin' && (
                                <p className="text-[10px] text-slate-700 mt-2">
                                    Vui lòng liên hệ Admin để được cấp quyền
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
