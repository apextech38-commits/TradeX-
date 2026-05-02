import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL       = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const RETRY_DELAY  = 3_000;
const OPEN_TIMEOUT = 5_000;
const MAX_STORE    = 2_000;

const SYMBOLS = [
  { id: "R_100",   label: "Volatility 100 Index",       badge: "R_100" },
  { id: "R_75",    label: "Volatility 75 Index",        badge: "R_75"  },
  { id: "R_50",    label: "Volatility 50 Index",        badge: "R_50"  },
  { id: "R_25",    label: "Volatility 25 Index",        badge: "R_25"  },
  { id: "R_10",    label: "Volatility 10 Index",        badge: "R_10"  },
  { id: "1HZ100V", label: "Volatility 100 (1s) Index",  badge: "1HZ100V" },
  { id: "1HZ10V",  label: "Volatility 10 (1s) Index",   badge: "1HZ10V"  },
];

type Tick = { epoch: number; quote: number };
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
    <div style={{
      background: "#10141c", border: "1px solid #1e2430", borderRadius: 6,
      padding: "8px 12px", fontFamily: "monospace", fontSize: 11,
    }}>
      <div style={{ color: "#8892a4", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#e2e8f0", fontWeight: 600 }}>
        {Number(payload[0].value).toFixed(3)}
      </div>
    </div>
  );
};

export default function Charts() {
  const [sym, setSym]           = useState(SYMBOLS[0]);
  const [points, setPoints]     = useState<Point[]>([]);
  const [allTicks, setAllTicks] = useState<Tick[]>([]);
  const [maxVisible, setMaxVisible] = useState(100);
  const [price, setPrice]       = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [openPrice, setOpenPrice] = useState<number | null>(null);
  const [high, setHigh]         = useState<number>(-Infinity);
  const [low, setLow]           = useState<number>(Infinity);
  const [tickCount, setTickCount] = useState(0);
  const [connStatus, setConnStatus] = useState("Connecting…");
  const [connError, setConnError]   = useState(false);
  const [lastTickTime, setLastTickTime] = useState("--");
  const [utcTime, setUtcTime]   = useState(utcNow);
  const [flashUp, setFlashUp]   = useState(false);
  const [flashDown, setFlashDown] = useState(false);

  const wsRef        = useRef<WebSocket | null>(null);
  const mountRef     = useRef(true);
  const retryRef     = useRef(0);
  const openTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symRef       = useRef(sym.id);
  const allTicksRef  = useRef<Tick[]>([]);
  const maxRef       = useRef(maxVisible);

  // UTC clock
  useEffect(() => {
    const id = setInterval(() => setUtcTime(utcNow()), 1000);
    return () => clearInterval(id);
  }, []);

  // Keep refs in sync
  useEffect(() => { maxRef.current = maxVisible; }, [maxVisible]);

  const buildPoints = useCallback((ticks: Tick[], max: number): Point[] =>
    ticks.slice(-max).map(t => ({ time: fmtTime(t.epoch), value: t.quote })),
  []);

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
      setConnError(true);
      setConnStatus(`Reconnecting… (attempt ${retryRef.current})`);
      retryTimer.current = setTimeout(connect, RETRY_DELAY);
    }, OPEN_TIMEOUT);

    ws.onopen = () => {
      if (!mountRef.current) return;
      clearTimers();
      retryRef.current = 0;
      setConnStatus("Connected");
      setConnError(false);

      // Step 1 — fetch history (no subscribe yet)
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
        if (msg.error) {
          setConnError(true);
          setConnStatus(msg.error.message);
          return;
        }

        // Step 2 — history loaded → subscribe to live ticks
        if (msg.msg_type === "history") {
          const { prices, times } = msg.history as { prices: number[]; times: number[] };
          const ticks: Tick[] = times.map((t, i) => ({ epoch: t, quote: prices[i] }));
          allTicksRef.current = ticks;
          setAllTicks(ticks);
          setPoints(buildPoints(ticks, maxRef.current));
          setTickCount(ticks.length);

          if (prices.length > 0) {
            const first = prices[0];
            const last  = prices[prices.length - 1];
            setOpenPrice(first);
            setHigh(Math.max(...prices));
            setLow(Math.min(...prices));
            setPrice(last);
          }

          // Step 3 — subscribe live ticks
          ws.send(JSON.stringify({ ticks: symRef.current, subscribe: 1 }));
          return;
        }

        if (msg.msg_type === "tick") {
          const { quote, epoch } = msg.tick as { quote: number; epoch: number };
          setPrice(prev => {
            const dir = prev !== null ? (quote >= prev ? "up" : "down") : null;
            setPrevPrice(prev);
            if (dir === "up")   { setFlashUp(true);   setTimeout(() => setFlashUp(false),   420); }
            if (dir === "down") { setFlashDown(true);  setTimeout(() => setFlashDown(false), 420); }
            return quote;
          });
          setHigh(h => Math.max(h, quote));
          setLow(l  => Math.min(l, quote));
          setTickCount(c => c + 1);
          setLastTickTime(fmtTime(epoch));

          const newTick: Tick = { epoch, quote };
          const updated = [...allTicksRef.current, newTick];
          if (updated.length > MAX_STORE) updated.shift();
          allTicksRef.current = updated;
          setAllTicks(updated);
          setPoints(buildPoints(updated, maxRef.current));
        }
      } catch (_) {}
    };

    ws.onerror = () => { if (mountRef.current) { setConnError(true); setConnStatus("Connection error — retrying…"); } };
    ws.onclose = () => {
      if (!mountRef.current) return;
      clearTimers();
      setConnError(true);
      retryRef.current++;
      setConnStatus(`Disconnected — reconnecting… (attempt ${retryRef.current})`);
      retryTimer.current = setTimeout(connect, RETRY_DELAY);
    };
  }, [clearTimers, buildPoints]);

  // Reconnect when symbol changes
  useEffect(() => {
    mountRef.current = true;
    symRef.current   = sym.id;
    allTicksRef.current = [];
    setAllTicks([]);
    setPoints([]);
    setPrice(null);
    setPrevPrice(null);
    setOpenPrice(null);
    setHigh(-Infinity);
    setLow(Infinity);
    setTickCount(0);
    setConnError(false);
    retryRef.current = 0;
    setConnStatus("Connecting…");
    setLastTickTime("--");
    connect();
    return () => {
      mountRef.current = false;
      clearTimers();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [sym.id, connect, clearTimers]);

  // Recompute visible slice when maxVisible changes
  useEffect(() => {
    setPoints(buildPoints(allTicksRef.current, maxVisible));
  }, [maxVisible, buildPoints]);

  const priceChange = price !== null && openPrice !== null ? price - openPrice : null;
  const pricePct    = priceChange !== null && openPrice ? ((priceChange / openPrice) * 100).toFixed(2) : null;
  const priceColor  = flashUp ? "#00e5a0" : flashDown ? "#ff4d6a" : "#e2e8f0";

  const yMin = points.length ? Math.min(...points.map(p => p.value)) * 0.9999 : undefined;
  const yMax = points.length ? Math.max(...points.map(p => p.value)) * 1.0001 : undefined;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - 120px)",
      background: "#0a0c10", color: "#e2e8f0",
      fontFamily: "'JetBrains Mono', monospace",
      overflow: "hidden",
    }}>

      {/* ── Header bar ────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", borderBottom: "1px solid #1e2430", background: "#10141c",
        flexShrink: 0, flexWrap: "wrap", gap: 8,
      }}>
        {/* Symbol selector */}
        <select
          value={sym.id}
          onChange={e => setSym(SYMBOLS.find(s => s.id === e.target.value) || SYMBOLS[0])}
          style={{
            background: "#1a2235", border: "1px solid #1e2430", borderRadius: 4,
            color: "#e2e8f0", fontFamily: "monospace", fontSize: "0.75rem",
            padding: "4px 8px", cursor: "pointer",
          }}
        >
          {SYMBOLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        {/* Instrument badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: connError ? "#ff4d6a" : "#00e5a0",
            boxShadow: `0 0 8px ${connError ? "#ff4d6a" : "#00e5a0"}`,
            display: "inline-block", animation: "pulseDot 1.5s ease-in-out infinite",
          }}/>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{sym.label}</span>
          <span style={{
            background: "#1a2235", border: "1px solid #1e2430", borderRadius: 4,
            padding: "2px 8px", fontSize: "0.6rem", color: "#8892a4", letterSpacing: 1,
          }}>{sym.badge} · TICK</span>
        </div>

        <span style={{ fontSize: "0.65rem", color: "#8892a4" }}>{utcTime}</span>
      </div>

      {/* ── Price bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: "8px 20px", background: "#10141c",
        borderBottom: "1px solid #1e2430", flexShrink: 0, flexWrap: "wrap",
      }}>
        {/* Live price */}
        <span style={{
          fontFamily: "'Syne', 'JetBrains Mono', monospace",
          fontSize: "1.8rem", fontWeight: 800, letterSpacing: -1,
          color: priceColor, transition: "color 0.3s",
        }}>
          {price !== null ? price.toFixed(3) : "---.---"}
        </span>

        {/* Change badge */}
        {priceChange !== null && pricePct !== null && (
          <span style={{
            fontSize: "0.75rem", padding: "3px 8px", borderRadius: 4, fontWeight: 600,
            background: priceChange >= 0 ? "rgba(0,229,160,0.1)" : "rgba(255,77,106,0.1)",
            color: priceChange >= 0 ? "#00e5a0" : "#ff4d6a",
          }}>
            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(3)} ({priceChange >= 0 ? "+" : ""}{pricePct}%)
          </span>
        )}

        {/* Stats */}
        {[
          { label: "HIGH",  value: high   > -Infinity ? high.toFixed(3)  : "--" },
          { label: "LOW",   value: low    < Infinity  ? low.toFixed(3)   : "--" },
          { label: "OPEN",  value: openPrice !== null  ? openPrice.toFixed(3) : "--" },
          { label: "TICKS", value: tickCount.toString() },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: "0.55rem", color: "#8892a4", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</span>
            <span style={{ fontSize: "0.8rem", color: "#e2e8f0", fontFamily: "monospace" }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* ── Chart area ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "14px 20px", gap: 10, minHeight: 0 }}>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: "0.6rem", color: "#8892a4", marginRight: 4, letterSpacing: 1 }}>SHOW:</span>
          {[100, 200, 500].map(n => (
            <button key={n} onClick={() => setMaxVisible(n)} style={{
              background: maxVisible === n ? "rgba(0,229,160,0.05)" : "#10141c",
              border: `1px solid ${maxVisible === n ? "#00e5a0" : "#1e2430"}`,
              borderRadius: 4,
              color: maxVisible === n ? "#00e5a0" : "#8892a4",
              fontFamily: "monospace", fontSize: "0.7rem",
              padding: "3px 10px", cursor: "pointer", transition: "all 0.15s",
            }}>
              {n}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div style={{
          flex: 1, minHeight: 0,
          background: "#10141c", border: "1px solid #1e2430",
          borderRadius: 8, padding: "12px 8px 8px 8px",
          position: "relative",
        }}>
          {points.length < 2 ? (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "3px solid rgba(0,229,160,0.2)",
                borderTop: "3px solid #00e5a0",
                animation: "spin 1s linear infinite",
              }}/>
              <span style={{ fontSize: "0.7rem", color: connError ? "#ff4d6a" : "#8892a4" }}>
                {connStatus}
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 4, right: 56, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00e5a0" stopOpacity={0.18}/>
                    <stop offset="100%" stopColor="#00e5a0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2430" vertical={false}/>
                <XAxis dataKey="time"
                  tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }}
                  tickLine={false} axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  orientation="right"
                  domain={[yMin ?? "auto", yMax ?? "auto"]}
                  tick={{ fill: "#8892a4", fontSize: 9, fontFamily: "monospace" }}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  width={60}
                />
                <Tooltip content={<CustomTooltip/>}/>
                <Area
                  type="monotone" dataKey="value"
                  stroke="#00e5a0" strokeWidth={1.5}
                  fill="url(#chartGrad)"
                  dot={false} activeDot={{ r: 3, fill: "#00e5a0" }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div style={{
        padding: "6px 20px", borderTop: "1px solid #1e2430",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: "0.62rem", color: "#4a5568", flexShrink: 0, background: "#10141c",
        flexWrap: "wrap", gap: 6,
      }}>
        <span style={{ color: connError ? "#ff4d6a" : "#00e5a0" }}>{connStatus}</span>
        <span>Powered by Deriv WebSocket API · app_id {DERIV_APP_ID}</span>
        <span>Last tick: {lastTickTime}</span>
      </div>

      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
