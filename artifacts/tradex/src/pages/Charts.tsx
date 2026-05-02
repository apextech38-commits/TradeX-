import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";

const MAX_TICKS = 100;
const RETRY_DELAY_MS = 4_000;

const SYMBOLS = [
  { label: "V 10",  id: "R_10"  },
  { label: "V 25",  id: "R_25"  },
  { label: "V 50",  id: "R_50"  },
  { label: "V 75",  id: "R_75"  },
  { label: "V 100", id: "R_100" },
];

interface ChartPoint { time: string; value: number; }

function fmt(epoch: number) {
  return new Date(epoch * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function Charts() {
  const { theme } = useTheme();
  const [activeSymbol, setActiveSymbol] = useState(SYMBOLS[4]);
  const [data, setData]         = useState<ChartPoint[]>([]);
  const [connected, setConnected] = useState(false);
  const [statusLabel, setStatusLabel] = useState("Loading...");
  const [retryCount, setRetryCount]   = useState(0);

  const esRef        = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountRef     = useRef(true);
  const symRef       = useRef(activeSymbol.id);

  const isDark      = theme === "dark";
  const strokeColor = "#3B82F6";
  const gridColor   = isDark ? "#1F2933" : "#e5e7eb";
  const tooltipBg   = isDark ? "#121821" : "#fff";
  const tooltipBd   = isDark ? "#1F2933" : "#e5e7eb";

  const stopStream = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
  };

  useEffect(() => {
    mountRef.current = true;
    symRef.current = activeSymbol.id;
    setData([]);
    setConnected(false);
    setRetryCount(0);
    setStatusLabel("Loading...");
    stopStream();

    let attempt = 0;

    const start = () => {
      if (!mountRef.current) return;
      const sym = symRef.current;

      setStatusLabel(attempt === 0 ? "Loading..." : `Reconnecting... (attempt ${attempt})`);
      setConnected(false);

      fetch(`/api/ticks/${sym}?count=${MAX_TICKS}`)
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json() as Promise<{ prices: number[]; times: number[]; error?: string }>;
        })
        .then(({ prices, times, error }) => {
          if (!mountRef.current || symRef.current !== sym) return;
          if (error) throw new Error(error);

          const points: ChartPoint[] = prices.map((p, i) => ({
            time: fmt(times[i]),
            value: p,
          }));
          setData(points.slice(-MAX_TICKS));

          const es = new EventSource(`/api/ticks/stream/${sym}`);
          esRef.current = es;

          es.onopen = () => {
            if (!mountRef.current || symRef.current !== sym) { es.close(); return; }
            attempt = 0;
            setRetryCount(0);
            setConnected(true);
            setStatusLabel("Live");
          };

          es.onmessage = (evt) => {
            if (!mountRef.current || symRef.current !== sym) return;
            try {
              const { value, epoch, error: err } = JSON.parse(evt.data);
              if (err) { es.close(); return; }
              setData(prev => {
                const next = [...prev, { time: fmt(epoch), value }];
                return next.length > MAX_TICKS ? next.slice(-MAX_TICKS) : next;
              });
            } catch (_) {}
          };

          es.onerror = () => {
            if (!mountRef.current || symRef.current !== sym) return;
            es.close();
            esRef.current = null;
            setConnected(false);
            attempt++;
            setRetryCount(attempt);
            setStatusLabel(`Reconnecting... (attempt ${attempt})`);
            retryTimerRef.current = setTimeout(start, RETRY_DELAY_MS);
          };
        })
        .catch(() => {
          if (!mountRef.current || symRef.current !== sym) return;
          attempt++;
          setRetryCount(attempt);
          setStatusLabel(`Reconnecting... (attempt ${attempt})`);
          retryTimerRef.current = setTimeout(start, RETRY_DELAY_MS);
        });
    };

    start();

    return () => {
      mountRef.current = false;
      stopStream();
    };
  }, [activeSymbol.id]);

  const latestVal  = data.length > 0 ? data[data.length - 1].value : null;
  const prevVal    = data.length >= 2 ? data[data.length - 2].value : null;
  const delta      = latestVal !== null && prevVal !== null ? latestVal - prevVal : 0;
  const isPositive = delta >= 0;
  const fullLabel  = `Volatility ${activeSymbol.id.replace("R_", "")} Index`;
  const isRetrying = statusLabel.startsWith("Reconnecting");

  return (
    <div className="flex flex-col w-full h-[calc(100vh-56px-52px)] bg-background">

      {/* Symbol bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0 overflow-x-auto no-scrollbar">
        {SYMBOLS.map(sym => (
          <button
            key={sym.id}
            onClick={() => setActiveSymbol(sym)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 ${
              activeSymbol.id === sym.id
                ? "bg-[#3B82F6] text-white shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {sym.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span className={`w-2 h-2 rounded-full ${
            connected   ? "bg-[#22C55E]" :
            isRetrying  ? "bg-[#EF4444] animate-pulse" :
                          "bg-[#FACC15] animate-pulse"
          }`} />
          {statusLabel}
        </div>
      </div>

      {/* Price header */}
      <div className="px-5 py-3 border-b border-border bg-card/50 shrink-0">
        <p className="text-xs text-muted-foreground mb-0.5">{fullLabel}</p>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold font-mono text-foreground tracking-tight">
            {latestVal !== null ? latestVal.toFixed(3) : "—"}
          </span>
          {latestVal !== null && prevVal !== null && (
            <span className={`text-sm font-semibold ${isPositive ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
              {isPositive ? "+" : ""}{delta.toFixed(3)}
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-0 pt-2">
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className={`w-10 h-10 rounded-full border-4 animate-spin mx-auto ${
                isRetrying
                  ? "border-[#EF4444]/20 border-t-[#EF4444]"
                  : "border-[#3B82F6]/20 border-t-[#3B82F6]"
              }`} />
              <p className="text-sm text-muted-foreground">{statusLabel}</p>
              {retryCount > 0 && (
                <p className="text-xs text-muted-foreground opacity-60">
                  Retry {retryCount} — check server connection
                </p>
              )}
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="tickGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0}    />
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
                width={62}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBd}`, borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v.toFixed(3), "Price"]}
                labelStyle={{ color: isDark ? "#9ca3af" : "#6b7280" }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2}
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
