import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useDerivWS } from "@/hooks/useDerivWS";
import { useTheme } from "@/components/ThemeProvider";

const SYMBOLS = [
  { label: "V 25",  id: "R_25"  },
  { label: "V 50",  id: "R_50"  },
  { label: "V 75",  id: "R_75"  },
  { label: "V 100", id: "R_100" },
  { label: "V 10",  id: "R_10"  },
];

const MAX_TICKS = 300;

export default function Charts() {
  const { latestTick, isConnected, subscribe, unsubscribe } = useDerivWS();
  const { theme } = useTheme();
  const [activeSymbol, setActiveSymbol] = useState(SYMBOLS[3]); // V 100 default
  const [data, setData] = useState<{ time: string; value: number }[]>([]);
  const seenEpochsRef = useRef(new Set<number>());

  const isDark = theme === "dark";
  const strokeColor = "#3B82F6";
  const gridColor   = isDark ? "#1F2933" : "#e5e7eb";
  const tooltipBg   = isDark ? "#121821" : "#fff";
  const tooltipBorder = isDark ? "#1F2933" : "#e5e7eb";

  // Subscribe when symbol changes
  useEffect(() => {
    setData([]);
    seenEpochsRef.current.clear();
    subscribe(activeSymbol.id);
    return () => unsubscribe();
  }, [activeSymbol.id, subscribe, unsubscribe]);

  // Append incoming ticks (deduplicate by epoch)
  useEffect(() => {
    if (!latestTick) return;
    if (seenEpochsRef.current.has(latestTick.epoch)) return;
    seenEpochsRef.current.add(latestTick.epoch);

    const time = new Date(latestTick.epoch * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    setData(prev => {
      const next = [...prev, { time, value: latestTick.quote }];
      return next.length > MAX_TICKS ? next.slice(next.length - MAX_TICKS) : next;
    });
  }, [latestTick]);

  const latestVal  = data.length > 0 ? data[data.length - 1].value : null;
  const prevVal    = data.length >= 2 ? data[data.length - 2].value : null;
  const delta      = latestVal && prevVal ? latestVal - prevVal : 0;
  const isPositive = delta >= 0;
  const deltaStr   = (isPositive ? "+" : "") + delta.toFixed(3);

  const fullLabel = SYMBOLS.find(s => s.id === activeSymbol.id)
    ? `Volatility ${activeSymbol.id.replace("R_", "")} Index`
    : activeSymbol.id;

  return (
    <div className="flex flex-col w-full h-[calc(100vh-56px-52px)] bg-background">

      {/* Symbol selector */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0">
        {SYMBOLS.map(sym => (
          <button
            key={sym.id}
            onClick={() => setActiveSymbol(sym)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeSymbol.id === sym.id
                ? "bg-[#3B82F6] text-white shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {sym.label}
          </button>
        ))}

        {/* WS status */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#22C55E]" : "bg-[#FACC15] animate-pulse"}`} />
          {isConnected ? "Live" : "Connecting..."}
        </div>
      </div>

      {/* Price header */}
      <div className="px-5 py-3 border-b border-border bg-card/50 shrink-0">
        <p className="text-xs text-muted-foreground mb-0.5">{fullLabel}</p>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold font-mono text-foreground tracking-tight">
            {latestVal !== null ? latestVal.toFixed(3) : "—"}
          </span>
          {latestVal !== null && (
            <span className={`text-sm font-semibold ${isPositive ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
              {deltaStr}
            </span>
          )}
          {data.length === 0 && (
            <span className="text-xs text-muted-foreground animate-pulse">Waiting for ticks...</span>
          )}
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 w-full min-h-0 pt-2">
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 rounded-full border-4 border-[#3B82F6]/20 border-t-[#3B82F6] animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                Streaming {fullLabel} ticks...
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="tickGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0}   />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: isDark ? "#6B7280" : "#9ca3af" }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: isDark ? "#6B7280" : "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={v => v.toFixed(2)}
              />
              <Tooltip
                contentStyle={{
                  background: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [value.toFixed(3), "Price"]}
                labelStyle={{ color: isDark ? "#9ca3af" : "#6b7280" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={1.8}
                fillOpacity={1}
                fill="url(#tickGrad)"
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 3, fill: strokeColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
