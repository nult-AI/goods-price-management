"use client";

interface PriceCardProps {
    name: string;
    price: number;
    unit: string;
    change?: number; // percentage change
    lastUpdated: string;
}

export default function PriceCard({ name, price, unit, change = 0, lastUpdated }: PriceCardProps) {
    const isPositive = change >= 0;

    return (
        <div className="group relative bg-slate-900 border border-slate-800 p-4 rounded-xl hover:bg-slate-800/50 transition-all duration-200">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-tighter mb-1">{name}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold font-mono tracking-tight text-white">${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-slate-500 font-medium lowercase">/ {unit}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <div className={`px-2 py-1 rounded-lg text-xs font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {isPositive ? '▲' : '▼'} {Math.abs(change)}%
                    </div>
                    <span className="text-[9px] text-slate-600 mt-2 font-medium uppercase tracking-widest">{lastUpdated}</span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    Interactive Chart
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Click to Analyze</span>
            </div>
        </div>
    );
}
