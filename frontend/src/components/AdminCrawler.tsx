"use client";
import React, { useState, useEffect } from "react";
import { adminApi } from "@/lib/api";

interface AdminCrawlerProps {
    token: string;
}

export default function AdminCrawler({ token }: AdminCrawlerProps) {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [newKeyword, setNewKeyword] = useState("");
    const [newUrl, setNewUrl] = useState("");

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const data = await adminApi.getCrawlerConfig(token);
            setConfig(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updates: any) => {
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const updated = await adminApi.updateCrawlerConfig(token, updates);
            setConfig(updated);
            setMessage("Cấu hình đã được lưu thành công!");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRunManual = async () => {
        setRunning(true);
        setError("");
        setMessage("");
        try {
            await adminApi.runCrawlerManual(token);
            setMessage("Crawler đã được kích hoạt chạy ngầm. Dữ liệu sẽ sớm xuất hiện!");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRunning(false);
        }
    };

    const addKeyword = () => {
        if (!newKeyword) return;
        const keywords = [...(config.search_keywords || []), newKeyword];
        handleSave({ search_keywords: keywords });
        setNewKeyword("");
    };

    const removeKeyword = (kw: string) => {
        const keywords = config.search_keywords.filter((k: string) => k !== kw);
        handleSave({ search_keywords: keywords });
    };

    const addUrl = () => {
        if (!newUrl) return;
        const urls = [...(config.seed_urls || []), newUrl];
        handleSave({ seed_urls: urls });
        setNewUrl("");
    };

    const removeUrl = (url: string) => {
        const urls = config.seed_urls.filter((u: string) => u !== url);
        handleSave({ seed_urls: urls });
    };

    if (loading) return <div className="p-8 text-slate-500 animate-pulse uppercase text-[10px] font-black tracking-widest">Đang tải cấu hình...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Cấu hình Crawler tự động</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Quản lý nguồn dữ liệu và tần suất thu thập</p>
                </div>
                <button
                    onClick={handleRunManual}
                    disabled={running}
                    className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {running ? "🚀 Đang kích hoạt..." : "🚀 Chạy Crawler ngay"}
                </button>
            </div>

            {error && <p className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl text-xs font-bold">{error}</p>}
            {message && <p className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-2xl text-xs font-bold">{message}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Seed URLs */}
                <div className="space-y-4 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🌐</span>
                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-300">Nguồn trang web chỉ định (Seed URLs)</h4>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            placeholder="https://example.com/prices"
                            className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 font-mono"
                        />
                        <button onClick={addUrl} className="bg-blue-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-500">Thêm</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                        {config.seed_urls.map((url: string) => (
                            <div key={url} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-slate-800 group hover:border-blue-500/30 transition-all">
                                <span className="text-xs text-slate-400 font-mono truncate mr-4">{url}</span>
                                <button onClick={() => removeUrl(url)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Keywords */}
                <div className="space-y-4 bg-slate-950/50 p-6 rounded-3xl border border-slate-800">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🔍</span>
                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-300">Từ khóa tìm kiếm (LLM Fallback)</h4>
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={newKeyword}
                            onChange={e => setNewKeyword(e.target.value)}
                            placeholder="Ví dụ: giá lúa gạo hôm nay"
                            className="flex-grow bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                        />
                        <button onClick={addKeyword} className="bg-blue-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-500">Thêm</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {config.search_keywords.map((kw: string) => (
                            <div key={kw} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full group">
                                <span className="text-[10px] font-black uppercase text-blue-400">{kw}</span>
                                <button onClick={() => removeKeyword(kw)} className="text-blue-400/50 hover:text-rose-500 transition-colors">✕</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/10 rounded-2xl text-2xl">⏳</div>
                    <div>
                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-300">Tần suất quét lại</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Phút</p>
                    </div>
                    <input
                        type="number"
                        value={config.scraping_interval_minutes}
                        onChange={e => handleSave({ scraping_interval_minutes: parseFloat(e.target.value) })}
                        className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-center font-bold text-blue-400 focus:border-blue-500 outline-none"
                    />
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <h4 className="font-black text-xs uppercase tracking-widest text-slate-300">Trạng thái tự động</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{config.is_active ? "Đang bật" : "Đang tắt"}</p>
                    </div>
                    <button
                        onClick={() => handleSave({ is_active: !config.is_active })}
                        className={`w-14 h-8 rounded-full p-1 transition-all ${config.is_active ? 'bg-blue-600' : 'bg-slate-800'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full transition-all ${config.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className="border-l border-slate-800 pl-6 hidden md:block">
                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-600">Lần cuối hoạt động</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                        {config.last_run_at ? new Date(config.last_run_at).toLocaleString('vi-VN') : "Chưa có dữ liệu"}
                    </p>
                </div>
            </div>
        </div>
    );
}
