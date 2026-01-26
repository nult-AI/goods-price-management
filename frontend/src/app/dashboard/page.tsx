"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, fetchCategories, fetchCommodities } from "@/lib/api";
import PriceUpdatePanel from "@/components/PriceUpdatePanel";
import AdminCommodities from "@/components/AdminCommodities";
import AdminCategories from "@/components/AdminCategories";
import AdminUsers from "@/components/AdminUsers";
import AdminAssignments from "@/components/AdminAssignments";
import AdminCrawler from "@/components/AdminCrawler";

export default function Dashboard() {
    const { user, token } = useAuth();
    const [categories, setCategories] = useState<any[]>([]);
    const [commodities, setCommodities] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            setActiveTab(user.role === 'admin' ? "commodities" : "updates");
            loadData();
        }
    }, [user, token]);

    const loadData = async () => {
        // We only show the full screen spinner on the very first load
        // Subsequent refreshes will be seamless updates to the state
        if (users.length === 0 && categories.length === 0) {
            setLoading(true);
        }

        try {
            const promises: Promise<any>[] = [
                fetchCategories(),
                fetchCommodities({})
            ];

            if (user?.role === 'admin' && token) {
                promises.push(adminApi.listUsers(token));
            }

            const results = await Promise.all(promises);

            setCategories(results[0] || []);
            setCommodities(results[1] || []);

            if (user?.role === 'admin') {
                setUsers(results[2] || []);
            }
        } catch (err) {
            console.error("Dashboard Load Error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-slate-400 font-mono tracking-tighter uppercase">Bạn cần đăng nhập</h2>
                <p className="text-slate-600 mt-2">Vui lòng đăng nhập để truy cập không gian làm việc.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
            <aside className="w-full lg:w-64 space-y-1">
                <div className="px-4 mb-4">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{user.role} Workspace</h2>
                </div>

                {user.role === 'admin' ? (
                    <>
                        <TabButton id="commodities" label="Hàng hóa" icon="📦" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="categories" label="Danh mục" icon="📁" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="users" label="Nhân sự" icon="👤" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="assignments" label="Phân quyền" icon="🔐" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="crawler" label="Crawler" icon="🤖" active={activeTab} onClick={setActiveTab} />
                        <TabButton id="updates" label="Cập nhật giá" icon="⚡" active={activeTab} onClick={setActiveTab} />
                    </>
                ) : (
                    <TabButton id="updates" label="Cập nhật giá" icon="⚡" active={activeTab} onClick={setActiveTab} />
                )}
            </aside>

            <div className="flex-grow bg-slate-900/30 border border-slate-800 rounded-3xl overflow-hidden min-h-[600px] shadow-2xl backdrop-blur-sm">
                <div className="p-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : user.role === 'admin' ? (
                        <>
                            {activeTab === "commodities" && <AdminCommodities commodities={commodities} categories={categories} token={token!} refresh={loadData} />}
                            {activeTab === "categories" && <AdminCategories categories={categories} token={token!} refresh={loadData} />}
                            {activeTab === "users" && <AdminUsers users={users} token={token!} refresh={loadData} />}
                            {activeTab === "assignments" && <AdminAssignments users={users} categories={categories} token={token!} refresh={loadData} />}
                            {activeTab === "crawler" && <AdminCrawler token={token!} />}
                            {activeTab === "updates" && <PriceUpdatePanel user={user} token={token!} />}
                        </>
                    ) : (
                        <PriceUpdatePanel user={user} token={token!} />
                    )}
                </div>
            </div>
        </div>
    );
}

function TabButton({ id, label, icon, active, onClick }: any) {
    const isActive = active === id;
    return (
        <button onClick={() => onClick(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-white hover:bg-slate-900'}`}>
            <span className="text-lg">{icon}</span>
            {label}
        </button>
    );
}
