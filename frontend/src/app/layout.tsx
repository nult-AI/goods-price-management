"use client";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import LoginModal from "@/components/LoginModal";
import ChangePasswordModal from "@/components/ChangePasswordModal";

const inter = Inter({ subsets: ["latin"] });

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

function Header() {
    const { user, logout, loading } = useAuth();
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    if (loading) return (
        <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md h-16 w-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </nav>
    );

    return (
        <>
            <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">C</div>
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent italic">CommodityLive</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            {user && (
                                <Link href="/dashboard" className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-colors">
                                    Dashboard
                                </Link>
                            )}

                            {!user ? (
                                <button
                                    onClick={() => setIsLoginOpen(true)}
                                    className="text-xs font-black uppercase tracking-widest bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-xl text-blue-500 hover:bg-blue-600/20 transition-all shrink-0"
                                >
                                    Login
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 pl-2 border-l border-slate-800 shrink-0">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">{user.role}</span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        title="Đăng xuất"
                                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all text-slate-500 hover:text-rose-500"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
        </>
    );
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased min-h-screen flex flex-col`}>
                <AuthProvider>
                    <Header />
                    <ChangePasswordModal />
                    <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                        {children}
                    </main>
                    <footer className="border-t border-slate-900 bg-slate-950/50 py-8 text-center">
                        <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em]">
                            © 2026 CommodityLive Platform
                        </p>
                    </footer>
                </AuthProvider>
            </body>
        </html>
    );
}
