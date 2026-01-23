"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PriceHistoryModal from "@/components/PriceHistoryModal";
import { useCurrency } from "@/hooks/useCurrency";
import { useAuth } from "@/hooks/useAuth";
import { fetchCategories, fetchCommodities } from "@/lib/api";

const REGIONS = ["Toàn cầu", "Miền Bắc", "Miền Trung", "Miền Nam", "Tây Nguyên"];

export default function Home() {
    const { user } = useAuth();
    const [categories, setCategories] = useState<string[]>(["All"]);
    const [activeCategory, setActiveCategory] = useState("All");
    const [searchTerm, setSearchTerm] = useState("");
    const [items, setItems] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Currency Logic
    const { convertFromVND, format, availableCurrencies } = useCurrency();
    const [targetCurrency, setTargetCurrency] = useState("USD");

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState({
        region: true,
        category: true,
        priceConverted: true,
        change: true,
        lastUpdate: true
    });

    const [selectedCommodity, setSelectedCommodity] = useState<any>(null);
    const loader = useRef(null);

    // Fetch initial categories
    useEffect(() => {
        fetchCategories().then(cats => {
            if (cats && cats.length > 0) {
                setCategories(["All", ...cats.map((c: any) => c.name)]);
            }
        });
    }, []);

    const fetchItems = useCallback(async (isFirstLoad = false) => {
        if (loading) return;
        setLoading(true);

        try {
            const currPage = isFirstLoad ? 1 : page;
            const newData = await fetchCommodities({
                category: activeCategory,
                search: searchTerm,
                page: currPage,
                size: 15
            });

            setItems(prev => isFirstLoad ? (newData || []) : [...prev, ...(newData || [])]);
            setPage(currPage + 1);
            if (!newData || newData.length < 15) setHasMore(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page, activeCategory, searchTerm, loading]);

    useEffect(() => {
        setItems([]); setPage(1); setHasMore(true); fetchItems(true);
    }, [activeCategory, searchTerm]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loading) fetchItems();
        }, { threshold: 1.0 });
        if (loader.current) observer.observe(loader.current);
        return () => observer.disconnect();
    }, [fetchItems, hasMore, loading]);

    const toggleColumn = (col: keyof typeof visibleColumns) => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }));
    };

    const CHART_MOCK_DATA = [
        { time: '08:00', price: 2000000 }, { time: '10:00', price: 2100000 }, { time: '12:00', price: 2050000 },
        { time: '14:00', price: 2200000 }, { time: '16:00', price: 2150000 }, { time: '18:00', price: 2300000 },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <header className="flex flex-col gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">Bảng Giá Thị Trường</h1>
                        <p className="text-slate-500 font-medium text-xs">Cơ sở dữ liệu giá hàng hóa từ Việt Nam</p>
                    </div>

                    {/* Search Box */}
                    <div className="relative w-full md:w-96">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                        <input
                            type="text"
                            placeholder="Tìm kiếm hàng hóa, khu vực..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 transition-all text-slate-200"
                        />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-slate-800/50">
                    <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 lg:pb-0">
                        {categories.map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex overflow-x-auto no-scrollbar items-center gap-4 pb-2 lg:pb-0">
                        {/* Column Toggles */}
                        <div className="flex shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <span className="text-[10px] px-2 self-center font-bold text-slate-600 uppercase">Cột:</span>
                            {Object.keys(visibleColumns).map((col) => (
                                <button
                                    key={col}
                                    onClick={() => toggleColumn(col as any)}
                                    className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all whitespace-nowrap ${visibleColumns[col as keyof typeof visibleColumns] ? 'text-blue-400' : 'text-slate-700'}`}
                                >
                                    {col}
                                </button>
                            ))}
                        </div>

                        {/* Currency Selector */}
                        <div className="flex shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800">
                            <span className="text-[10px] px-2 self-center font-bold text-slate-600 uppercase">Quy đổi:</span>
                            {availableCurrencies.filter(c => c !== 'VND').map(c => (
                                <button key={c} onClick={() => setTargetCurrency(c)}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${targetCurrency === c ? 'bg-slate-800 text-white' : 'text-slate-500'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Data Table */}
            <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900/50">
                            <th className="px-6 py-4">Tên Hàng Hóa</th>
                            {visibleColumns.region && <th className="px-6 py-4">Khu Vực</th>}
                            {visibleColumns.category && <th className="px-6 py-4">Nhóm</th>}
                            <th className="px-6 py-4 text-right">Giá Gốc (VND)</th>
                            {visibleColumns.priceConverted && <th className="px-6 py-4 text-right">Quy Đổi ({targetCurrency})</th>}
                            {visibleColumns.change && <th className="px-6 py-4 text-center">Biến Động</th>}
                            {visibleColumns.lastUpdate && <th className="px-6 py-4">Cập Nhật</th>}
                            {user && <th className="px-6 py-4 text-center">Biểu Đồ</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-blue-600/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="font-bold text-slate-200">{item.name}</span>
                                    <p className="text-[9px] text-slate-500 uppercase">Mã: {item.slug}</p>
                                </td>
                                {visibleColumns.region && (
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-800 rounded text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {item.region?.name || "Toàn quốc"}
                                        </span>
                                    </td>
                                )}
                                {visibleColumns.category && (
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-slate-500">{item.category?.name || "N/A"}</span>
                                    </td>
                                )}
                                <td className="px-6 py-4 font-mono text-sm text-right">
                                    <span className="text-white font-bold">{format(item.latest_price?.price || 0, 'VND')}</span>
                                    <span className="text-[10px] text-slate-500 ml-1">/{item.unit}</span>
                                </td>
                                {visibleColumns.priceConverted && (
                                    <td className="px-6 py-4 font-mono text-sm text-right">
                                        <span className="text-blue-400 font-bold">
                                            {format(convertFromVND(item.latest_price?.price || 0, targetCurrency), targetCurrency)}
                                        </span>
                                    </td>
                                )}
                                {visibleColumns.change && (
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center justify-center gap-1 text-[11px] font-black ${(item.change || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {(item.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(item.change || 0)}%
                                        </div>
                                    </td>
                                )}
                                {visibleColumns.lastUpdate && (
                                    <td className="px-6 py-4 text-[10px] text-slate-600 font-medium whitespace-nowrap">
                                        {item.latest_price ? new Date(item.latest_price.timestamp).toLocaleTimeString() : "N/A"}
                                    </td>
                                )}
                                {user && (
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => setSelectedCommodity(item)}
                                            className="p-2 hover:bg-blue-600/20 rounded-lg transition-all text-blue-500"
                                        >
                                            📊
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Infinite Scroll Loader */}
                <div ref={loader} className="p-8 flex justify-center border-t border-slate-800/30">
                    {loading ? (
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 animate-pulse font-mono line-clamp-1">
                            ĐANG ĐỒNG BỘ DỮ LIỆU...
                        </div>
                    ) : !hasMore && (
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700">
                            KẾT THÚC DỮ LIỆU ONSITE
                        </div>
                    )}
                </div>
            </div>

            {selectedCommodity && (
                <PriceHistoryModal
                    commodityName={`${selectedCommodity.name}`}
                    data={CHART_MOCK_DATA}
                    onClose={() => setSelectedCommodity(null)}
                />
            )}
        </div>
    );
}
