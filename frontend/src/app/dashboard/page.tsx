"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, dataEntryApi, fetchCategories, fetchCommodities } from "@/lib/api";

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
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            const cats = await fetchCategories();
            setCategories(cats || []);

            const comms = await fetchCommodities({});
            setCommodities(comms || []);

            if (user?.role === 'admin' && token) {
                const u = await adminApi.listUsers(token);
                setUsers(u || []);
            }
        } catch (err) {
            console.error(err);
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
                        </>
                    ) : (
                        <DataEntryPanel user={user} commodities={commodities} token={token!} />
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

function AdminCommodities({ commodities, categories, token, refresh }: any) {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [unit, setUnit] = useState("");
    const [catId, setCatId] = useState("");
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [error, setError] = useState("");

    const filtered = commodities.filter((c: any) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.category?.name?.toLowerCase().includes(search.toLowerCase())
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

function AdminCategories({ categories, token, refresh }: any) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!name) return;
        setLoading(true);
        try {
            await adminApi.createCategory(token, name);
            setName("");
            refresh();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Danh mục (Categories)</h3>
            <div className="flex gap-4 p-6 bg-slate-950/50 border border-slate-800 rounded-3xl">
                <input placeholder="Tên danh mục mới..." value={name} onChange={e => setName(e.target.value)} className="flex-grow bg-slate-900 border border-slate-800 rounded-2xl px-6 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                <button
                    onClick={handleAdd}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {loading ? "Đang xử lý..." : "Thêm"}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((c: any) => (
                    <div key={c.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl hover:border-blue-500/50 transition-all group shadow-lg">
                        <p className="font-black text-white group-hover:text-blue-400 transition-colors">{c.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mt-2 bg-slate-950 w-fit px-2 py-1 rounded-md">{c.slug}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function AdminUsers({ users, token, refresh }: any) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!email) return;
        setLoading(true);
        try {
            await adminApi.createUser(token, email);
            setEmail("");
            refresh();
            alert("Đã tạo user với mật khẩu mặc định 123456");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Quản lý nhân sự</h3>
            <div className="flex gap-4 p-6 bg-slate-950/50 border border-slate-800 rounded-3xl">
                <input
                    placeholder="Gmail nhân viên..."
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="flex-grow bg-slate-900 border border-slate-800 rounded-2xl px-6 py-3 text-sm focus:border-blue-500 outline-none transition-all"
                />
                <button onClick={handleAdd} disabled={loading} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50">
                    {loading ? "ĐANG TẠO..." : "THÊM NHÂN VIÊN"}
                </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {users.map((u: any) => (
                    <div key={u.id} className="p-5 border border-slate-800 rounded-2xl bg-slate-900/40 flex justify-between items-center group hover:bg-slate-900/60 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600/10 text-blue-500 rounded-full flex items-center justify-center font-bold">
                                {u.username.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm">{u.username}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{u.role}</p>
                            </div>
                        </div>
                        {u.must_change_password && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20 font-bold tracking-tighter animate-pulse">
                                CHỜ ĐỔI MẬT KHẨU
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function AdminAssignments({ users, categories, token, refresh }: any) {
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    // Filter DATA_ENTRY users only for assignments
    const dataEntryUsers = users.filter((u: any) => u.role === 'data_entry');

    const handleAssign = async (userId: string, categoryIds: string[]) => {
        setSubmitting(true);
        try {
            await adminApi.updateUserPermissions(token, userId, categoryIds);
            refresh();
            alert("Đã cập nhật phân quyền!");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-white">Phân quyền nhân sự</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* User List */}
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Chọn nhân viên nhập liệu</p>
                    {dataEntryUsers.length === 0 && <p className="text-sm italic text-slate-600">Chưa có nhân viên nhập liệu nào.</p>}
                    {dataEntryUsers.map((u: any) => (
                        <button
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            className={`w-full p-4 border rounded-2xl flex justify-between items-center transition-all ${selectedUser?.id === u.id ? 'bg-blue-600/10 border-blue-500 shadow-lg' : 'bg-slate-900 border-slate-800'}`}
                        >
                            <div className="text-left">
                                <p className="font-bold text-sm text-white">{u.username}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Hạt nhân: {u.permitted_categories?.length || 0} danh mục</p>
                            </div>
                            <span className="text-lg">{selectedUser?.id === u.id ? '🎯' : '👤'}</span>
                        </button>
                    ))}
                </div>

                {/* Assignment Panel */}
                <div className={`bg-slate-950/50 border border-slate-800 p-8 rounded-3xl space-y-6 transition-all ${!selectedUser ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Quyền truy cập danh mục</p>
                        {selectedUser && <p className="text-xs font-bold text-blue-500">{selectedUser.username}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {categories.map((cat: any) => {
                            const isChecked = selectedUser?.permitted_categories?.some((pc: any) => pc.id === cat.id);
                            return (
                                <label key={cat.id} className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800 transition-all">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-950"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const currentIds = selectedUser.permitted_categories.map((pc: any) => pc.id);
                                                const newIds = e.target.checked
                                                    ? [...currentIds, cat.id]
                                                    : currentIds.filter((id: string) => id !== cat.id);

                                                handleAssign(selectedUser.id, newIds);
                                            }}
                                            disabled={submitting}
                                        />
                                        <span className="text-sm font-bold text-slate-200">{cat.name}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">{cat.slug}</span>
                                </label>
                            );
                        })}
                    </div>
                    {!selectedUser && <p className="text-sm text-slate-600 text-center py-10 italic">Vui lòng chọn nhân viên để cấu hình quyền</p>}
                </div>
            </div>
        </div>
    );
}

function DataEntryPanel({ user, commodities, token }: any) {
    const handleUpdate = async (id: string, price: number) => {
        try {
            await dataEntryApi.updatePrice(token, { commodity_id: id, price });
            alert("Đã cập nhật giá thành công!");
        } catch (err: any) {
            alert("Lỗi: " + err.message);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h3 className="text-3xl font-black italic tracking-tighter uppercase text-white">Trạm cập nhật giá</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Đang hoạt động với tài khoản: {user.username}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {commodities.map((c: any) => (
                    <div key={c.id} className="bg-slate-900/80 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col gap-6 shadow-xl hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-2xl font-black text-white tracking-tighter group-hover:text-blue-400 transition-colors">{c.name}</p>
                                <p className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest">{c.category?.name || "Hàng hóa"} • {c.unit}</p>
                            </div>
                            <span className="text-3xl">💹</span>
                        </div>

                        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Giá hiện tại</p>
                            <p className="text-xl font-mono font-black text-blue-500">
                                {c.latest_price ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.latest_price.price) : "---"}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                const p = prompt(`Nhập giá mới cho ${c.name} (${c.unit}):`, c.latest_price?.price || "0");
                                if (p) handleUpdate(c.id, parseFloat(p));
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                        >
                            Cập nhật giá thực tế
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
