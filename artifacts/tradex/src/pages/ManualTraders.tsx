import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, Info, BarChart2, Activity, CandlestickChart,
  Pencil, Download, Minus, Plus, ArrowUp, X, CheckSquare, Square,
} from "lucide-react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL   = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const TOKEN_KEY = "deriv_token";

const MAX_TICKS      = 100;
const OPEN_TIMEOUT   = 5_000;
const RETRY_DELAY    = 3_000;

// Deriv 1-second + standard volatility indices
const MARKETS = [
  { id: "1HZ100V", label: "Volatility 100 (1s) Index", badge: "100", dot: "#EF4444" },
  { id: "1HZ10V",  label: "Volatility 10 (1s) Index",  badge: "10",  dot: "#EF4444" },
  { id: "1HZ25V",  label: "Volatility 25 (1s) Index",  badge: "25",  dot: "#EF4444" },
  { id: "1HZ50V",  label: "Volatility 50 (1s) Index",  badge: "50",  dot: "#EF4444" },
  { id: "1HZ75V",  label: "Volatility 75 (1s) Index",  badge: "75",  dot: "#EF4444" },
  { id: "R_100",   label: "Volatility 100 Index",       badge: "100", dot: "#3B82F6" },
  { id: "R_75",    label: "Volatility 75 Index",        badge: "75",  dot: "#3B82F6" },
  { id: "R_50",    label: "Volatility 50 Index",        badge: "50",  dot: "#3B82F6" },
  { id: "R_25",    label: "Volatility 25 Index",        badge: "25",  dot: "#3B82F6" },
  { id: "R_10",    label: "Volatility 10 Index",        badge: "10",  dot: "#3B82F6" },
];

// Band delta: price × growthRate × factor (calibrated: at price~1427, rate=3 → ~0.542)
const bandDelta = (price: number, rate: number) => price * rate * 0.000127;

// Max ticks per growth rate (Deriv accumulator limits)
const MAX_TICKS_MAP: Record<number, number> = { 1: 230, 2: 115, 3: 76, 4: 57, 5: 46 };

type ChartPoint = { time: string; value: number };

function fmt(epoch: number) {
  return new Date(epoch * 1000).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function gmtNow() {
  return new Date().toLocaleString("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "UTC",
  }).replace(",", "") + " GMT";
}

// ── Custom current-price label on right edge ──────────────────────────────────
const PriceLabel = ({ viewBox, value }: { viewBox?: { x?: number; y?: number }; value: string }) => {
  const x = (viewBox?.x ?? 0) + 6;
  const y = viewBox?.y ?? 0;
  return (
    <g>
      <rect x={x - 2} y={y - 10} width={64} height={20} rx={4} fill="#111" />
      <text x={x + 30} y={y + 5} textAnchor="middle" fill="#fff" fontSize={11} fontFamily="monospace">
        {value}
      </text>
    </g>
  );
};

// ── Band label (right side) ───────────────────────────────────────────────────
const BandLabel = ({ viewBox, value, color }: { viewBox?: { x?: number; y?: number }; value: string; color: string }) => {
  const x = (viewBox?.x ?? 0) + 8;
  const y = viewBox?.y ?? 0;
  return (
    <text x={x} y={y - 4} fill={color} fontSize={10} fontFamily="monospace" fontWeight="bold">
      {value}
    </text>
  );
};

export default function ManualTraders() {
  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();
  const isDark = theme === "dark";

  // Market
  const [market, setMarket]           = useState(MARKETS[0]);
  const [showMarketMenu, setShowMarketMenu] = useState(false);

  // Chart data
  const [data, setData]               = useState<ChartPoint[]>([]);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice]     = useState<number | null>(null);
  const [connected, setConnected]     = useState(false);
  const [statusLabel, setStatusLabel] = useState("Connecting...");
  const [chartType, setChartType]     = useState<"line"|"area">("line");

  // Trade panel
  const [growthRate, setGrowthRate]   = useState(3);
  const [stake, setStake]             = useState(10);
  const [currency, setCurrency]       = useState("AUD");
  const [takeProfit, setTakeProfit]   = useState(false);
  const [trading, setTrading]         = useState(false);
  const [tradeMsg, setTradeMsg]       = useState("");
  const [timestamps, setTimestamps]   = useState<string[]>([]);

  // WS refs
  const wsRef         = useRef<WebSocket | null>(null);
  const mountRef      = useRef(true);
  const retryRef      = useRef(0);
  const openTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symRef        = useRef(market.id);

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
      setConnected(false);
      setStatusLabel(`Reconnecting... (attempt ${retryRef.current})`);
      retryTimer.current = setTimeout(connect, RETRY_DELAY);
    }, OPEN_TIMEOUT);

    ws.onopen = () => {
      if (!mountRef.current) return;
      clearTimers();
      retryRef.current = 0;
      setConnected(true);
      setStatusLabel("Live");
      setTimestamps([gmtNow()]);

      const sym   = symRef.current;
      const token = localStorage.getItem(TOKEN_KEY);

      const requestHistory = () => ws.send(JSON.stringify({
        ticks_history: sym,
        count: MAX_TICKS,
        end: "latest",
        start: 1,
        style: "ticks",
        subscribe: 1,
      }));

      if (token) {
        ws.send(JSON.stringify({ authorize: token }));
        (ws as any).__pending = requestHistory;
      } else {
        requestHistory();
      }
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) { console.warn("[MT WS]", msg.error.message); return; }

        if (msg.msg_type === "authorize") {
          const fn = (ws as any).__pending;
          if (fn) { fn(); delete (ws as any).__pending; }
          return;
        }

        if (msg.msg_type === "history") {
          const { prices, times } = msg.history as { prices: number[]; times: number[] };
          const pts: ChartPoint[] = prices.map((p, i) => ({ time: fmt(times[i]), value: p }));
          setData(pts.slice(-MAX_TICKS));
          if (prices.length > 0) {
            setLatestPrice(prices[prices.length - 1]);
            if (prices.length > 1) setPrevPrice(prices[prices.length - 2]);
          }
          return;
        }

        if (msg.msg_type === "tick") {
          const { quote, epoch } = msg.tick;
          setLatestPrice(q => { setPrevPrice(q); return quote; });
          setData(prev => {
            const next = [...prev, { time: fmt(epoch), value: quote }];
            return next.length > MAX_TICKS ? next.slice(-MAX_TICKS) : next;
          });
        }
      } catch (_) {}
    };

    ws.onerror = () => { if (mountRef.current) setConnected(false); };
    ws.onclose = () => {
      if (!mountRef.current) return;
      clearTimers();
      setConnected(false);
      retryRef.current++;
      setStatusLabel(`Reconnecting... (attempt ${retryRef.current})`);
      retryTimer.current = setTimeout(connect, RETRY_DELAY);
    };
  }, [clearTimers]);

  useEffect(() => {
    mountRef.current = true;
    symRef.current   = market.id;
    setData([]);
    setLatestPrice(null);
    setPrevPrice(null);
    setConnected(false);
    retryRef.current = 0;
    setStatusLabel("Connecting...");
    connect();
    return () => {
      mountRef.current = false;
      clearTimers();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [market.id, connect, clearTimers]);

  // ── Trade execution ──────────────────────────────────────────────────────────
  const placeTrade = () => {
    if (!isLoggedIn) { setTradeMsg("Please log in to trade"); return; }
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setTradeMsg("No token found"); return; }

    setTrading(true);
    setTradeMsg("Connecting...");

    const ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ authorize: token }));
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) { setTradeMsg(`Error: ${msg.error.message}`); setTrading(false); ws.close(); return; }
        if (msg.msg_type === "authorize") {
          setTradeMsg("Placing trade...");
          ws.send(JSON.stringify({
            buy: 1,
            price: stake,
            parameters: {
              amount: stake,
              basis: "stake",
              contract_type: "ACCU",
              currency: currency,
              growth_rate: growthRate / 100,
              symbol: market.id,
            },
          }));
          return;
        }
        if (msg.msg_type === "buy") {
          const t = gmtNow();
          setTimestamps(p => [t, ...p].slice(0, 2));
          setTradeMsg(`Contract #${msg.buy.contract_id} opened`);
          setTrading(false);
          ws.close();
        }
      } catch (_) { setTrading(false); ws.close(); }
    };
    ws.onerror = () => { setTradeMsg("WebSocket error"); setTrading(false); };
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const lp        = latestPrice ?? 0;
  const delta     = bandDelta(lp, growthRate);
  const upperBand = lp + delta;
  const lowerBand = lp - delta;
  const maxTicks  = MAX_TICKS_MAP[growthRate] ?? 76;
  const maxPayout = Math.min(stake * Math.pow(1 + growthRate / 100, maxTicks), 50000);
  const priceChange   = latestPrice !== null && prevPrice !== null ? latestPrice - prevPrice : 0;
  const pricePct      = prevPrice ? ((priceChange / prevPrice) * 100).toFixed(2) : "0.00";
  const isUp          = priceChange >= 0;
  const isRetrying    = statusLabel.startsWith("Reconnecting");

  // Last 10 digits
  const lastDigits = data.slice(-10).map(d => Math.abs(Math.round(d.value * 100) % 10));

  // Chart colors
  const lineColor  = "#3B82F6";
  const gridColor  = isDark ? "#1F2933" : "#e5e7eb";
  const tooltipBg  = isDark ? "#121821" : "#fff";
  const tooltipBd  = isDark ? "#1F2933" : "#e5e7eb";

  // Y domain (tight around price)
  const values  = data.map(d => d.value);
  const minVal  = values.length ? Math.min(...values) - delta * 3 : 0;
  const maxVal  = values.length ? Math.max(...values) + delta * 3 : 1;

  const toolbarItems = [
    { label: "1T",  icon: null,                              act: () => {} },
    { label: null,  icon: <Activity className="w-4 h-4"/>,   act: () => setChartType("line") },
    { label: null,  icon: <CandlestickChart className="w-4 h-4"/>, act: () => setChartType("area") },
    { label: null,  icon: <BarChart2 className="w-4 h-4"/>,  act: () => {} },
    { label: null,  icon: <Pencil className="w-4 h-4"/>,     act: () => {} },
    { label: null,  icon: <Download className="w-4 h-4"/>,   act: () => {} },
  ];

  return (
    <div className="flex h-[calc(100vh-56px-52px)] overflow-hidden bg-background">

      {/* ── LEFT — chart area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Market selector card — overlaid top-left */}
        <div className="absolute top-3 left-14 z-20">
          <button
            onClick={() => setShowMarketMenu(v => !v)}
            className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-md hover:border-primary transition-colors"
          >
            {/* Badge */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs font-bold text-foreground">
                {market.badge}
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-card" style={{background: market.dot}}/>
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-foreground leading-tight">{market.label}</div>
              {latestPrice !== null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-mono">{latestPrice.toFixed(2)}</span>
                  <span className={isUp ? "text-[#22C55E]" : "text-[#EF4444]"}>
                    {isUp ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)} ({pricePct}%)
                  </span>
                </div>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${showMarketMenu ? "rotate-180" : ""}`}/>
          </button>

          {/* Market dropdown */}
          {showMarketMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMarketMenu(false)}/>
              <div className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                {MARKETS.map(m => (
                  <button key={m.id} onClick={() => { setMarket(m); setShowMarketMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                      m.id === market.id ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-secondary"}`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{background: m.dot}}/>
                    {m.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Connection status — top right of chart */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`w-2 h-2 rounded-full ${
            connected   ? "bg-[#22C55E]" :
            isRetrying  ? "bg-[#EF4444] animate-pulse" :
                          "bg-[#FACC15] animate-pulse"
          }`}/>
          {statusLabel}
        </div>

        {/* Vertical chart toolbar */}
        <div className="absolute left-0 top-0 bottom-0 z-10 flex flex-col items-center justify-center gap-1 px-1 border-r border-border bg-card/80 w-12">
          {toolbarItems.map((t, i) => (
            <button key={i} onClick={t.act}
              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors text-xs font-bold">
              {t.icon ?? t.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="flex-1 pl-12 pt-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0">
            {data.length < 2 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className={`w-10 h-10 rounded-full border-4 animate-spin mx-auto ${
                    isRetrying ? "border-[#EF4444]/20 border-t-[#EF4444]" : "border-primary/20 border-t-primary"
                  }`}/>
                  <p className="text-sm text-muted-foreground">{statusLabel}</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{top: 20, right: 80, left: 0, bottom: 8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
                  <XAxis dataKey="time" tick={{fontSize: 9, fill: isDark ? "#6B7280" : "#9ca3af"}}
                    interval="preserveStartEnd" tickLine={false} axisLine={false}/>
                  <YAxis domain={[minVal, maxVal]} tick={{fontSize: 9, fill: isDark ? "#6B7280" : "#9ca3af"}}
                    tickLine={false} axisLine={false} width={64}
                    tickFormatter={(v: number) => v.toFixed(2)}/>
                  <Tooltip
                    contentStyle={{background: tooltipBg, border: `1px solid ${tooltipBd}`, borderRadius: 8, fontSize: 11}}
                    formatter={(v: number) => [v.toFixed(3), "Price"]}
                    labelStyle={{color: isDark ? "#9ca3af" : "#6b7280"}}/>

                  {/* Accumulator bands */}
                  {lp > 0 && (
                    <>
                      {/* Shaded band area */}
                      <ReferenceArea y1={lowerBand} y2={upperBand}
                        fill="#3B82F6" fillOpacity={0.06} ifOverflow="extendDomain"/>

                      {/* Upper band line */}
                      <ReferenceLine y={upperBand} stroke="#3B82F6" strokeDasharray="4 3" strokeWidth={1.5}
                        label={<BandLabel value={`+${delta.toFixed(3)}`} color="#3B82F6"/>}
                        ifOverflow="extendDomain"/>

                      {/* Lower band line */}
                      <ReferenceLine y={lowerBand} stroke="#3B82F6" strokeDasharray="4 3" strokeWidth={1.5}
                        label={<BandLabel value={`-${delta.toFixed(3)}`} color="#3B82F6"/>}
                        ifOverflow="extendDomain"/>

                      {/* Current price line */}
                      <ReferenceLine y={lp} stroke="#111" strokeWidth={1} strokeDasharray="2 2"
                        label={<PriceLabel value={lp.toFixed(2)}/>}
                        ifOverflow="extendDomain"/>
                    </>
                  )}

                  <Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={1.5}
                    dot={false} activeDot={{r: 3, fill: lineColor}} isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Stats bar */}
          <div className="shrink-0 border-t border-border bg-card/60 flex items-center gap-3 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
              <span>Stats</span>
              <Info className="w-3.5 h-3.5"/>
            </div>
            <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
              {lastDigits.map((d, i) => (
                <span key={i} className="text-xs font-mono font-bold text-foreground bg-secondary rounded px-1.5 py-0.5 shrink-0">
                  {d}
                </span>
              ))}
            </div>
            <button className="text-muted-foreground hover:text-primary shrink-0">
              <ArrowUp className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT — trade panel ────────────────────────────────────────────────── */}
      <div className="w-64 shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto">

        {/* Header */}
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <a href="#" className="text-xs text-primary hover:underline block mb-3">Learn about this trade type</a>
          <div className="flex items-center gap-2">
            <button className="text-muted-foreground hover:text-foreground">
              <span className="text-lg leading-none">‹</span>
            </button>
            <Activity className="w-4 h-4 text-primary shrink-0"/>
            <span className="text-base font-bold text-foreground">Accumulators</span>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-5">
          {/* Growth rate */}
          <div>
            <div className="text-xs text-muted-foreground text-center mb-2 font-medium">Growth rate</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => setGrowthRate(r)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded transition-colors ${
                    growthRate === r
                      ? "bg-foreground text-background"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}>
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {/* Stake */}
          <div>
            <div className="text-xs text-muted-foreground text-center mb-2 font-medium">Stake</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setStake(s => Math.max(1, +(s - 1).toFixed(2)))}
                className="w-8 h-8 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center shrink-0 transition-colors">
                <Minus className="w-3.5 h-3.5 text-foreground"/>
              </button>
              <input type="number" value={stake} min="1" step="1"
                onChange={e => setStake(Math.max(1, Number(e.target.value)))}
                className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-sm font-bold text-foreground text-center focus:outline-none focus:border-primary h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
              <button onClick={() => setStake(s => +(s + 1).toFixed(2))}
                className="w-8 h-8 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center shrink-0 transition-colors">
                <Plus className="w-3.5 h-3.5 text-foreground"/>
              </button>
              <button className="flex items-center gap-0.5 bg-secondary hover:bg-secondary/80 px-2 py-1.5 rounded text-xs font-semibold text-foreground transition-colors h-8 shrink-0">
                <span className="text-muted-foreground text-xs leading-none">‹</span>
                <span className="ml-0.5">{currency}</span>
              </button>
            </div>
          </div>

          {/* Take profit */}
          <button onClick={() => setTakeProfit(v => !v)}
            className="flex items-center gap-2 w-full text-left">
            {takeProfit
              ? <CheckSquare className="w-4 h-4 text-primary shrink-0"/>
              : <Square className="w-4 h-4 text-muted-foreground shrink-0"/>}
            <span className="text-sm text-foreground">Take profit</span>
            <Info className="w-3.5 h-3.5 text-muted-foreground ml-auto shrink-0"/>
          </button>

          {/* Max. payout / ticks */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Max. payout</span>
              <span className="text-foreground font-semibold font-mono">
                {maxPayout >= 10000
                  ? `${(maxPayout / 1000).toFixed(1)}k`
                  : maxPayout.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Max. ticks</span>
              <span className="text-foreground font-semibold">{maxTicks}</span>
            </div>
          </div>

          {/* Band info */}
          {lp > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 space-y-1">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Accumulator Band</div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#22C55E]">+{delta.toFixed(3)}</span>
                <span className="text-foreground">{lp.toFixed(3)}</span>
                <span className="text-[#EF4444]">-{delta.toFixed(3)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Trade message */}
        {tradeMsg && (
          <div className="mx-4 mb-2 flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
            <span className="text-xs text-foreground flex-1">{tradeMsg}</span>
            <button onClick={() => setTradeMsg("")} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="w-3.5 h-3.5"/>
            </button>
          </div>
        )}

        {/* Timestamps */}
        <div className="mx-4 mb-3 space-y-1">
          {(timestamps.length > 0 ? timestamps : [gmtNow()]).slice(0, 2).map((ts, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0"/>
              {ts}
            </div>
          ))}
        </div>

        {/* Buy button */}
        <div className="p-4 border-t border-border shrink-0">
          <button
            onClick={placeTrade}
            disabled={trading}
            className="w-full py-3 bg-[#22C55E] hover:bg-[#16a34a] disabled:opacity-60 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            {trading ? "Placing trade..." : `Buy ${stake} ${currency}`}
          </button>
        </div>
      </div>
    </div>
  );
}
