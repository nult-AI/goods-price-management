"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import PriceHistoryModal from "@/components/PriceHistoryModal";
import { useCurrency } from "@/hooks/useCurrency";
import { useAuth } from "@/hooks/useAuth";
import { fetchCategories, fetchCommodities } from "@/lib/api";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { fuzzyMatch } from "@/lib/utils";

const REGIONS = ["Toàn cầu", "Miền Bắc", "Miền Trung", "Miền Nam", "Tây Nguyên"];

export default function Home() {
    const { user } = useAuth();
    const [categories, setCategories] = useState<any[]>([]);
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
    const loadingRef = useRef(false);
    const oldestTimestampRef = useRef<string | undefined>(undefined);

    // Real-time synchronization
    const { isConnected } = useRealtimePrices((update) => {
        console.log("⚡ Real-time packet:", update.name || update.commodity_id, update);
        setItems(prevItems => {
            const exists = prevItems.some(i => i.id === update.commodity_id);
            const newPriceObj = { price: update.price, timestamp: update.timestamp };

            // Update modal if open
            if (selectedCommodity?.id === update.commodity_id) {
                setSelectedCommodity((prev: any) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        latest_price: newPriceObj,
                        prices: [newPriceObj, ...(prev.prices || [])]
                    };
                });
            }

            if (exists) {
                return prevItems.map(item => {
                    if (item.id === update.commodity_id) {
                        return {
                            ...item,
                            latest_price: newPriceObj,
                            prices: [newPriceObj, ...(item.prices || [])]
                        };
                    }
                    return item;
                });
            } else {
                // New Discovery logic
                const filterMatch = activeCategory === "All" || activeCategory === update.category?.name;
                const searchMatch = !searchTerm || fuzzyMatch(update.name, searchTerm);

                console.log("🔍 New Item Match Test:", { name: update.name, filterMatch, searchMatch, currentCat: activeCategory });

                if (filterMatch && searchMatch && update.name) {
                    const newItem = {
                        id: update.commodity_id,
                        name: update.name,
                        slug: update.slug,
                        unit: update.unit,
                        category: update.category,
                        region: update.region,
                        created_at: update.timestamp, // Use timestamp as creation for UI sorting
                        latest_price: newPriceObj,
                        prices: [newPriceObj],
                        change: 0 // New items have no change yet
                    };
                    // Since it's a new item (likely latest), prepend it
                    // Also reset hasMore to true to allow further scrolling if needed
                    setHasMore(true);
                    return [newItem, ...prevItems];
                }
                return prevItems;
            }
        });
    });

    // Fetch initial categories
    useEffect(() => {
        fetchCategories().then(cats => {
            if (cats && cats.length > 0) {
                setCategories(cats);
            }
        });
    }, []);

    const fetchItems = useCallback(async (isFirstLoad = false) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);

        try {
            // Use ref for cursor to keep function stable
            const beforeTimestamp = isFirstLoad ? undefined : oldestTimestampRef.current;

            // Find the selected category slug
            const selectedCat = categories.find(c => c.name === activeCategory);
            const categorySlug = activeCategory === "All" ? undefined : selectedCat?.slug;

            const newData = await fetchCommodities({
                category_slug: categorySlug,
                search: searchTerm,
                before: beforeTimestamp,
                size: 15
            });

            if (isFirstLoad) {
                setItems(newData || []);
                setHasMore(newData && newData.length >= 15);
                if (newData && newData.length > 0) {
                    oldestTimestampRef.current = newData[newData.length - 1].created_at;
                }
            } else {
                setItems(prev => [...prev, ...(newData || [])]);
                if (!newData || newData.length < 15) setHasMore(false);
                if (newData && newData.length > 0) {
                    oldestTimestampRef.current = newData[newData.length - 1].created_at;
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, [activeCategory, searchTerm, categories]); // items removed from dependencies

    // Debounce search term to avoid excessive API calls and handle IME states
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setItems([]);
        setHasMore(true);
        oldestTimestampRef.current = undefined; // Reset cursor
        fetchItems(true);
    }, [activeCategory, debouncedSearch]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
                fetchItems();
            }
        }, { threshold: 0.1 });
        if (loader.current) observer.observe(loader.current);
        return () => observer.disconnect();
    }, [fetchItems, hasMore]);

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
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">Bảng Giá Thị Trường</h1>
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${isConnected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
                                <span className={`text-[8px] font-black uppercase tracking-tighter ${isConnected ? 'text-emerald-500' : 'text-slate-500'}`}>
                                    {isConnected ? 'Live' : 'Syncing...'}
                                </span>
                            </div>
                        </div>
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
                        <button
                            key="All"
                            onClick={() => setActiveCategory("All")}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeCategory === "All" ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                        >
                            Tất cả
                        </button>
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setActiveCategory(cat.name)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeCategory === cat.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                                {cat.name}
                            </button>
                        ))}
                    </div>

                </div>
            </header>

            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                {/* Currency Selector (Top Left) */}
                <div className="flex shrink-0 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                    <span className="text-[10px] px-2 self-center font-bold text-slate-500 uppercase tracking-tighter">Quy đổi:</span>
                    {availableCurrencies.filter(c => c !== 'VND').map(c => (
                        <button key={c} onClick={() => setTargetCurrency(c)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${targetCurrency === c ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}>
                            {c}
                        </button>
                    ))}
                </div>

                {/* Column Toggles (Top Right) */}
                <div className="flex shrink-0 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                    <span className="text-[10px] px-2 self-center font-bold text-slate-500 uppercase tracking-tighter">Cột:</span>
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
            </div>

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
                    data={selectedCommodity.prices?.map((p: any) => ({
                        time: new Date(p.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        price: p.price
                    })).reverse() || []}
                    onClose={() => setSelectedCommodity(null)}
                />
            )}
        </div>
    );
}
