import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL       = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const RETRY_DELAY  = 3_000;
const OPEN_TIMEOUT = 5_000;
const MAX_STORE    = 2_000;

const SYMBOLS = [
  { id: "R_100",   label: "Volatility 100 Index"      },
  { id: "R_75",    label: "Volatility 75 Index"       },
  { id: "R_50",    label: "Volatility 50 Index"       },
  { id: "R_25",    label: "Volatility 25 Index"       },
  { id: "R_10",    label: "Volatility 10 Index"       },
  { id: "1HZ100V", label: "Volatility 100 (1s) Index" },
  { id: "1HZ10V",  label: "Volatility 10 (1s) Index"  },
];

type Tick  = { epoch: number; quote: number };
type Point = { time: string; value: number };

function fmtTime(epoch: number) {
  return new Date(epoch * 1000).toUTCString().slice(17, 25);
}
function utcNow() {
  return new Date().toUTCString().slice(17, 25) + " UTC";
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs font-mono shadow-lg">
      <div className="text-muted-foreground mb-1">{label}</div>
      <div className="text-foreground font-semibold">{Number(payload[0].value).toFixed(3)}</div>
    </div>
  );
};

export default function Charts() {
  const { theme } = useTheme();
  const isDark    = theme === "dark";

  const [sym, setSym]               = useState(SYMBOLS[0]);
  const [points, setPoints]         = useState<Point[]>([]);
  const [allTicks, setAllTicks]     = useState<Tick[]>([]);
  const [maxVisible, setMaxVisible] = useState(100);
  const [price, setPrice]           = useState<number | null>(null);
  const [openPrice, setOpenPrice]   = useState<number | null>(null);
  const [high, setHigh]             = useState<number>(-Infinity);
  const [low, setLow]               = useState<number>(Infinity);
  const [tickCount, setTickCount]   = useState(0);
  const [connStatus, setConnStatus] = useState("Connecting…");
  const [connOk, setConnOk]         = useState<boolean | null>(null);
  const [lastTickTime, setLastTickTime] = useState("--");
  const [utcTime, setUtcTime]       = useState(utcNow);
  const [flashDir, setFlashDir]     = useState<"up"|"down"|null>(null);

  const wsRef       = useRef<WebSocket | null>(null);
  const mountRef    = useRef(true);
  const retryRef    = useRef(0);
  const openTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symRef      = useRef(sym.id);
  const allTicksRef = useRef<Tick[]>([]);
  const maxRef      = useRef(maxVisible);

  // UTC clock
  useEffect(() => {
    const id = setInterval(() => setUtcTime(utcNow()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { maxRef.current = maxVisible; }, [maxVisible]);

  const buildPoints = useCallback((ticks: Tick[], max: number): Point[] =>
    ticks.slice(-max).map(t => ({ time: fmtTime(t.epoch), value: t.quote })), []);

  const clearTimers = useCallback(() => {
    if (openTimer.current)  { clearTimeout(openTimer.current);  openTimer.current  = null; }
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
  }, []);

  const connect = useCallback(() => {
    if (!mountRef.current) return;
    clearTimers();
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    openTimer.current = setTimeout(() => {
      if (!mountRef.current || ws.readyState === WebSocket.OPEN) return;
      ws.onclose = null; ws.close();
      retryRef.current++;
      setConnOk(false);
      setConnStatus(`Reconnecting… (attempt ${retryRef.current})`);
      retryTimer.current = setTimeout(connect, RETRY_DELAY);
    }, OPEN_TIMEOUT);

    ws.onopen = () => {
      if (!mountRef.current) return;
      clearTimers();
      retryRef.current = 0;
      setConnOk(true);
      setConnStatus("Live");
      ws.send(JSON.stringify({
        ticks_history: symRef.current,
        adjust_start_time: 1,
        count: 500,
        end: "latest",
        start: 1,
        style: "ticks",
      }));
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) { setConnOk(false); setConnStatus(msg.error.message); return; }

        if (msg.msg_type === "history") {
          const { prices, times } = msg.history as { prices: number[]; times: number[] };
          const ticks: Tick[] = times.map((t, i) => ({ epoch: t, quote: prices[i] }));
          allTicksRef.current = ticks;
          setAllTicks(ticks);
          setPoints(buildPoints(ticks, maxRef.current));
          setTickCount(ticks.length);
          if (prices.length > 0) {
            setOpenPrice(prices[0]);
            setPrice(prices[prices.length - 1]);
            setHigh(Math.max(...prices));
            setLow(Math.min(...prices));
          }
          ws.send(JSON.stringify({ ticks: symRef.current, subscribe: 1 }));
          return;
        }

        if (msg.msg_type === "tick") {
          const { quote, epoch } = msg.tick as { quote: number; epoch: number };
          setPrice(prev => {
            if (prev !== null) {
              const dir = quote >= prev ? "up" : "down";
              setFlashDir(dir);
              setTimeout(() => setFlashDir(null), 420);
            }
            return quote;
          });
          setHigh(h => Math.max(h, quote));
          setLow(l  => Math.min(l, quote));
          setTickCount(c => c + 1);
          setLastTickTime(fmtTime(epoch));
          const updated = [...allTicksRef.current, { epoch, quote }];
          if (updated.length > MAX_STORE) updated.shift();
          allTicksRef.current = updated;
          setAllTicks(updated);
          setPoints(buildPoints(updated, maxRef.current));
        }
      } catch (_) {}
    };

    ws.onerror = () => { if (mountRef.current) { setConnOk(false); } };
    ws.onclose = () => {
      if (!mountRef.current) return;
      clearTimers();
      setConnOk(false);
      retryRef.current++;
      setConnStatus(`Disconnected — reconnecting… (attempt ${retryRef.current})`);
      retryTimer.current = setTimeout(connect, RETRY_DELAY);
    };
  }, [clearTimers, buildPoints]);

  useEffect(() => {
    mountRef.current = true;
    symRef.current   = sym.id;
    allTicksRef.current = [];
    setAllTicks([]); setPoints([]); setPrice(null); setOpenPrice(null);
    setHigh(-Infinity); setLow(Infinity); setTickCount(0);
    setConnOk(null); retryRef.current = 0;
    setConnStatus("Connecting…"); setLastTickTime("--");
    connect();
    return () => {
      mountRef.current = false;
      clearTimers();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [sym.id, connect, clearTimers]);

  useEffect(() => {
    setPoints(buildPoints(allTicksRef.current, maxVisible));
  }, [maxVisible, buildPoints]);

  // ── Derived display values ─────────────────────────────────────────────────
  const priceChange = price !== null && openPrice !== null ? price - openPrice : null;
  const pricePct    = priceChange !== null && openPrice
    ? ((priceChange / openPrice) * 100).toFixed(2) : null;

  // TradeX brand colors — only these three for semantic states
  const GREEN   = "#22C55E";
  const RED     = "#EF4444";
  const YELLOW  = "#FACC15";
  const PRIMARY = "#3B82F6";

  const dotColor   = connOk === true ? GREEN : connOk === false ? RED : YELLOW;
  const priceColor = flashDir === "up" ? GREEN : flashDir === "down" ? RED : "var(--color-foreground)";
  const changeColor = priceChange !== null ? (priceChange >= 0 ? GREEN : RED) : "var(--color-muted-foreground)";

  // Recharts theme-aware colors
  const gridColor   = isDark ? "hsl(210 24% 16%)"  : "hsl(220 13% 91%)";
  const axisColor   = isDark ? "hsl(218 11% 65%)"  : "hsl(215 28% 34%)";

  const yMin = points.length ? Math.min(...points.map(p => p.value)) * 0.9999 : undefined;
  const yMax = points.length ? Math.max(...points.map(p => p.value)) * 1.0001 : undefined;

  const statItems = [
    { label: "HIGH",  value: high   > -Infinity ? high.toFixed(3)  : "--" },
    { label: "LOW",   value: low    < Infinity  ? low.toFixed(3)   : "--" },
    { label: "OPEN",  value: openPrice !== null  ? openPrice.toFixed(3) : "--" },
    { label: "TICKS", value: tickCount.toString() },
  ];

  return (
    <div className="flex flex-col bg-background"
      style={{ height: "calc(100vh - 120px)", overflow: "hidden" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-card border-b border-border shrink-0 flex-wrap">
        <select
          value={sym.id}
          onChange={e => setSym(SYMBOLS.find(s => s.id === e.target.value) || SYMBOLS[0])}
          className="bg-background border border-border rounded-md text-foreground text-xs px-3 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
        >
          {SYMBOLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full shrink-0 transition-colors"
            style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}/>
          <span className="text-sm font-bold text-foreground">{sym.label}</span>
          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">
            {sym.id} · TICK
          </span>
        </div>

        <span className="text-xs font-mono text-muted-foreground">{utcTime}</span>
      </div>

      {/* ── Price bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5 px-5 py-2 bg-card border-b border-border shrink-0 flex-wrap">
        {/* Price */}
        <span className="text-3xl font-bold font-mono tracking-tight transition-colors duration-200"
          style={{ color: priceColor }}>
          {price !== null ? price.toFixed(3) : "---.---"}
        </span>

        {/* Change badge */}
        {priceChange !== null && pricePct !== null && (
          <span className="text-xs font-semibold font-mono px-2 py-1 rounded"
            style={{
              background: priceChange >= 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: changeColor,
            }}>
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(3)} ({priceChange >= 0 ? "+" : ""}{pricePct}%)
          </span>
        )}

        {/* Stats */}
        {statItems.map(s => (
          <div key={s.label} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">{s.label}</span>
            <span className="text-sm font-mono text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Chart area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">

        {/* Tick window controls */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mr-1">Show:</span>
          {[100, 200, 500].map(n => (
            <button key={n} onClick={() => setMaxVisible(n)}
              className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
                maxVisible === n
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border text-muted-foreground bg-card hover:border-primary/50 hover:text-foreground"
              }`}>
              {n}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 bg-card border border-border rounded-xl p-3 relative">
          {points.length < 2 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className={`w-8 h-8 rounded-full border-[3px] animate-spin ${
                connOk === false
                  ? "border-[#EF4444]/20 border-t-[#EF4444]"
                  : "border-primary/20 border-t-primary"
              }`}/>
              <span className="text-xs font-mono text-muted-foreground">{connStatus}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 4, right: 60, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="txChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.2}/>
                    <stop offset="100%" stopColor={PRIMARY} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
                <XAxis dataKey="time"
                  tick={{ fill: axisColor, fontSize: 9, fontFamily: "monospace" }}
                  tickLine={false} axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis orientation="right"
                  domain={[yMin ?? "auto", yMax ?? "auto"]}
                  tick={{ fill: axisColor, fontSize: 9, fontFamily: "monospace" }}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  width={62}
                />
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="value"
                  stroke={PRIMARY} strokeWidth={1.5}
                  fill="url(#txChartGrad)"
                  dot={false} activeDot={{ r: 3, fill: PRIMARY }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2 bg-card border-t border-border shrink-0 flex-wrap gap-2">
        <span className="text-[11px] font-mono font-semibold"
          style={{ color: connOk === true ? GREEN : connOk === false ? RED : YELLOW }}>
          {connStatus}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          Powered by Deriv WebSocket API
        </span>
        <span className="text-[11px] font-mono text-muted-foreground">
          Last tick: {lastTickTime}
        </span>
      </div>
    </div>
  );
}
