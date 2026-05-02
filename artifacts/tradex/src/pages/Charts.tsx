import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const TOKEN_KEY = "deriv_token";
const MAX_TICKS = 100;
const CONNECT_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 3000;

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
  const [activeSymbol, setActiveSymbol] = useState(SYMBOLS[4]); // V 100
  const [data, setData]         = useState<ChartPoint[]>([]);
  const [connected, setConnected] = useState(false);
  const [statusLabel, setStatusLabel] = useState("Connecting...");

  const wsRef        = useRef<WebSocket | null>(null);
  const mountRef     = useRef(true);
  const retryRef     = useRef(0);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symRef       = useRef(activeSymbol.id);

  const isDark      = theme === "dark";
  const strokeColor = "#3B82F6";
  const gridColor   = isDark ? "#1F2933" : "#e5e7eb";
  const tooltipBg   = isDark ? "#121821" : "#fff";
  const tooltipBd   = isDark ? "#1F2933" : "#e5e7eb";

  const clearTimers = () => {
    if (timeoutRef.current)   { clearTimeout(timeoutRef.current);   timeoutRef.current   = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
  };

  const sendHistory = useCallback((ws: WebSocket) => {
    ws.send(JSON.stringify({
      ticks_history: symRef.current,
      count: MAX_TICKS,
      end: "latest",
      start: 1,
      style: "ticks",
      subscribe: 1,
    }));
  }, []);

  const connect = useCallback(() => {
    if (!mountRef.current) return;
    clearTimers();

    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    // 5-second connection timeout → retry
    timeoutRef.current = setTimeout(() => {
      if (!mountRef.current) return;
      if (ws.readyState !== WebSocket.OPEN) {
        ws.onclose = null;
        ws.close();
        retryRef.current++;
        setStatusLabel(`Reconnecting... (attempt ${retryRef.current})`);
        retryTimerRef.current = setTimeout(connect, RETRY_DELAY_MS);
      }
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      if (!mountRef.current) return;
      clearTimers();
      retryRef.current = 0;
      setConnected(true);
      setStatusLabel("Live");

      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        ws.send(JSON.stringify({ authorize: token }));
      } else {
        sendHistory(ws);
      }
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) {
          console.warn("[Charts WS error]", msg.error.message);
          return;
        }

        // After auth, request history + subscribe
        if (msg.msg_type === "authorize") {
          sendHistory(ws);
          return;
        }

        // Bulk history response — populate chart immediately
        if (msg.msg_type === "history") {
          const { prices, times } = msg.history as { prices: number[]; times: number[] };
          const points: ChartPoint[] = prices.map((p, i) => ({
            time: fmt(times[i]),
            value: p,
          }));
          setData(points.slice(-MAX_TICKS));
          return;
        }

        // Live tick update
        if (msg.msg_type === "tick") {
          const t = msg.tick;
          setData(prev => {
            const next = [...prev, { time: fmt(t.epoch), value: t.quote }];
            return next.length > MAX_TICKS ? next.slice(next.length - MAX_TICKS) : next;
          });
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      if (!mountRef.current) return;
      setConnected(false);
      setStatusLabel("Connection error");
    };

    ws.onclose = () => {
      if (!mountRef.current) return;
      setConnected(false);
      retryRef.current++;
      setStatusLabel(`Reconnecting... (attempt ${retryRef.current})`);
      retryTimerRef.current = setTimeout(connect, RETRY_DELAY_MS);
    };
  }, [sendHistory]);

  // Reconnect when symbol changes
  useEffect(() => {
    mountRef.current = true;
    symRef.current = activeSymbol.id;
    setData([]);
    setConnected(false);
    retryRef.current = 0;
    setStatusLabel("Connecting...");
    connect();

    return () => {
      mountRef.current = false;
      clearTimers();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [activeSymbol.id, connect]);

  const latestVal  = data.length > 0 ? data[data.length - 1].value : null;
  const prevVal    = data.length >= 2 ? data[data.length - 2].value : null;
  const delta      = latestVal !== null && prevVal !== null ? latestVal - prevVal : 0;
  const isPositive = delta >= 0;
  const fullLabel  = `Volatility ${activeSymbol.id.replace("R_", "")} Index`;
  const isConnecting = !connected;

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
            connected ? "bg-[#22C55E]" :
            statusLabel.startsWith("Reconnecting") ? "bg-[#EF4444] animate-pulse" :
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
          {isConnecting && data.length === 0 && (
            <span className="text-xs text-muted-foreground animate-pulse ml-2">{statusLabel}</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-0 pt-2">
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className={`w-10 h-10 rounded-full border-4 animate-spin mx-auto ${
                statusLabel.startsWith("Reconnecting")
                  ? "border-[#EF4444]/20 border-t-[#EF4444]"
                  : "border-[#3B82F6]/20 border-t-[#3B82F6]"
              }`} />
              <p className="text-sm text-muted-foreground">{statusLabel}</p>
              {statusLabel.startsWith("Reconnecting") && (
                <p className="text-xs text-muted-foreground opacity-60">
                  Retrying in {RETRY_DELAY_MS / 1000}s — check your internet connection
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
