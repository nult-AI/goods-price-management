"use client";
import React, { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface PriceChartProps {
    commodityName: string;
    data: any[];
    onClose: () => void;
}

export default function PriceHistoryModal({ commodityName, data, onClose }: PriceChartProps) {
    const [range, setRange] = useState("7D");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 drop-shadow-2xl">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-white">{commodityName}</h3>
                        <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">Price History Analysis</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400 transition-all"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Time Range Selector */}
                    <div className="flex gap-2 p-1 bg-slate-950 rounded-xl w-fit">
                        {["1D", "7D", "30D", "ALL"].map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${range === r ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>

                    {/* Chart Container */}
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#475569"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#475569"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                    itemStyle={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#64748b', fontSize: '10px', marginBottom: '4px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorPrice)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <StatsBox label="Highest" value="$2,050.50" color="text-emerald-500" />
                        <StatsBox label="Lowest" value="$2,010.20" color="text-rose-500" />
                        <StatsBox label="Average" value="$2,030.35" color="text-blue-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatsBox({ label, value, color }: any) {
    return (
        <div className="bg-slate-950/50 border border-slate-800 p-3 rounded-2xl">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
            <p className={`text-sm font-bold mt-1 ${color}`}>{value}</p>
        </div>
    );
}
