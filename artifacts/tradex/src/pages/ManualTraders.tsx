import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight, Plus, Minus, Info } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/context/AuthContext";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL         = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const PING_INTERVAL  = 25_000;
const HIST_TIMEOUT   = 10_000;
const RETRY_DELAY    = 3_000;
const MAX_STORE      = 500;

// ── Symbols ───────────────────────────────────────────────────────────────────
const SYMBOLS = [
  { id: "1HZ100V", label: "Volatility 100 (1s) Index",  pip: 2 },
  { id: "1HZ10V",  label: "Volatility 10 (1s) Index",   pip: 3 },
  { id: "R_100",   label: "Volatility 100 Index",        pip: 2 },
  { id: "R_75",    label: "Volatility 75 Index",         pip: 2 },
  { id: "R_50",    label: "Volatility 50 Index",         pip: 2 },
  { id: "R_25",    label: "Volatility 25 Index",         pip: 3 },
  { id: "R_10",    label: "Volatility 10 Index",         pip: 3 },
];

// ── Trade types ───────────────────────────────────────────────────────────────
const TRADE_TYPES = [
  { id: "ACCU",       label: "Accumulators"      },
  { id: "MULTUP",     label: "Multipliers"        },
  { id: "CALL_PUT",   label: "Rise / Fall"        },
  { id: "HIGH_LOW",   label: "Higher / Lower"     },
  { id: "TOUCH",      label: "Touch / No Touch"   },
  { id: "IN_OUT",     label: "In / Out"           },
  { id: "EVEN_ODD",   label: "Even / Odd"         },
  { id: "MATCH_DIFF", label: "Matches / Differs"  },
  { id: "OVER_UNDER", label: "Over / Under"       },
];

type Tick  = { epoch: number; quote: number };
type Point = { time: string; value: number };

function fmtTime(epoch: number) {
  return new Date(epoch * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-1.5 text-xs font-mono shadow-md">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-foreground font-semibold">{Number(payload[0].value).toFixed(3)}</div>
    </div>
  );
};

// ── Stake input ───────────────────────────────────────────────────────────────
function StakeInput({ value, onChange, currency }: { value: number; onChange: (v: number) => void; currency: string }) {
  const step = value >= 100 ? 10 : value >= 10 ? 1 : 0.5;
  return (
    <div className="flex items-center gap-0 border border-border rounded-lg overflow-hidden bg-background">
      <button onClick={() => onChange(Math.max(0.5, +(value - step).toFixed(2)))}
        className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number" min="0.5" step={step}
        value={value}
        onChange={e => onChange(Math.max(0.5, +e.target.value || 0.5))}
        className="flex-1 text-center text-sm font-semibold text-foreground bg-transparent border-none outline-none w-16"
      />
      <button onClick={() => onChange(+(value + step).toFixed(2))}
        className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <Plus className="w-3.5 h-3.5" />
      </button>
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-l border-border bg-secondary/50">
        {currency}
      </div>
    </div>
  );
}

// ── Trade panel for each type ─────────────────────────────────────────────────
function TradePanel({
  type, stake, setStake, currency,
  price, symId,
}: {
  type: typeof TRADE_TYPES[0];
  stake: number;
  setStake: (v: number) => void;
  currency: string;
  price: number | null;
  symId: string;
}) {
  const [growthRate, setGrowthRate]   = useState(3);
  const [multiplier, setMultiplier]   = useState(10);
  const [duration, setDuration]       = useState(5);
  const [durUnit, setDurUnit]         = useState<"t"|"m"|"h">("t");
  const [barrier, setBarrier]         = useState("+1.00");
  const [digit, setDigit]             = useState(5);
  const [takeProfit, setTakeProfit]   = useState(false);
  const [tpValue, setTpValue]         = useState(10);
  const [stopLoss, setStopLoss]       = useState(false);
  const [slValue, setSlValue]         = useState(5);
  const { isLoggedIn }                = useAuth();

  const maxPayout = stake * (1 + growthRate / 100) * 100;

  const BuyButton = ({ label, color }: { label: string; color: string }) => (
    <button
      className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
      style={{ background: color }}
      onClick={() => {
        if (!isLoggedIn) {
          window.dispatchEvent(new CustomEvent("tradex:open-login"));
          return;
        }
        alert(`${label} trade placed! (Connect your Deriv account for live trading)`);
      }}
    >
      {label}
    </button>
  );

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      {children}
    </div>
  );

  // ACCUMULATORS
  if (type.id === "ACCU") return (
    <div className="space-y-4">
      <Section label="Growth rate">
        <div className="flex gap-1.5">
          {[1,2,3,4,5].map(r => (
            <button key={r} onClick={() => setGrowthRate(r)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                growthRate === r
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              }`}>
              {r}%
            </button>
          ))}
        </div>
      </Section>
      <Section label="Stake">
        <StakeInput value={stake} onChange={setStake} currency={currency} />
      </Section>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="tp" checked={takeProfit} onChange={e => setTakeProfit(e.target.checked)}
          className="w-4 h-4 accent-primary" />
        <label htmlFor="tp" className="text-sm text-foreground">Take profit</label>
      </div>
      {takeProfit && (
        <Section label="Take profit amount">
          <StakeInput value={tpValue} onChange={setTpValue} currency={currency} />
        </Section>
      )}
      <div className="pt-1 space-y-1.5 text-sm border-t border-border">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max. payout</span>
          <span className="text-foreground font-medium">{(stake * 6000).toLocaleString("en", { maximumFractionDigits: 2 })} {currency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Max. ticks</span>
          <span className="text-foreground font-medium">6,000</span>
        </div>
      </div>
      <BuyButton label="Buy" color="#22C55E" />
    </div>
  );

  // MULTIPLIERS
  if (type.id === "MULTUP") return (
    <div className="space-y-4">
      <Section label="Multiplier">
        <div className="flex gap-1.5 flex-wrap">
          {[10,20,30,40,50].map(m => (
            <button key={m} onClick={() => setMultiplier(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                multiplier === m
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              }`}>
              ×{m}
            </button>
          ))}
        </div>
      </Section>
      <Section label="Stake">
        <StakeInput value={stake} onChange={setStake} currency={currency} />
      </Section>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="mtp" checked={takeProfit} onChange={e => setTakeProfit(e.target.checked)}
          className="w-4 h-4 accent-primary" />
        <label htmlFor="mtp" className="text-sm text-foreground">Take profit</label>
      </div>
      {takeProfit && (
        <Section label="Take profit">
          <StakeInput value={tpValue} onChange={setTpValue} currency={currency} />
        </Section>
      )}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="msl" checked={stopLoss} onChange={e => setStopLoss(e.target.checked)}
          className="w-4 h-4 accent-primary" />
        <label htmlFor="msl" className="text-sm text-foreground">Stop loss</label>
      </div>
      {stopLoss && (
        <Section label="Stop loss">
          <StakeInput value={slValue} onChange={setSlValue} currency={currency} />
        </Section>
      )}
      <div className="pt-1 space-y-1.5 text-sm border-t border-border">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Commission</span>
          <span className="text-foreground font-medium">{(stake * 0.03).toFixed(2)} {currency}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BuyButton label="▲ Up" color="#22C55E" />
        <BuyButton label="▼ Down" color="#EF4444" />
      </div>
    </div>
  );

  // RISE / FALL & HIGHER / LOWER
  if (type.id === "CALL_PUT" || type.id === "HIGH_LOW") return (
    <div className="space-y-4">
      <Section label="Duration">
        <div className="flex gap-2">
          <input
            type="number" min="1" max="365" value={duration}
            onChange={e => setDuration(+e.target.value || 1)}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center outline-none focus:border-primary"
          />
          <div className="flex border border-border rounded-lg overflow-hidden">
            {(["t","m","h"] as const).map(u => (
              <button key={u} onClick={() => setDurUnit(u)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  durUnit === u ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}>
                {u === "t" ? "Ticks" : u === "m" ? "Min" : "Hours"}
              </button>
            ))}
          </div>
        </div>
      </Section>
      {type.id === "HIGH_LOW" && (
        <Section label="Barrier">
          <input
            type="text" value={barrier} onChange={e => setBarrier(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </Section>
      )}
      <Section label="Stake">
        <StakeInput value={stake} onChange={setStake} currency={currency} />
      </Section>
      <div className="pt-1 space-y-1.5 text-sm border-t border-border">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payout</span>
          <span className="text-[#22C55E] font-semibold">{(stake * 1.95).toFixed(2)} {currency}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BuyButton label={type.id === "HIGH_LOW" ? "▲ Higher" : "▲ Rise"} color="#22C55E" />
        <BuyButton label={type.id === "HIGH_LOW" ? "▼ Lower"  : "▼ Fall"} color="#EF4444" />
      </div>
    </div>
  );

  // TOUCH / NO TOUCH
  if (type.id === "TOUCH") return (
    <div className="space-y-4">
      <Section label="Duration">
        <div className="flex gap-2">
          <input type="number" min="1" value={duration} onChange={e => setDuration(+e.target.value || 1)}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center outline-none focus:border-primary" />
          <select className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
            <option>Days</option><option>Hours</option><option>Min</option>
          </select>
        </div>
      </Section>
      <Section label="Barrier">
        <input type="text" value={barrier} onChange={e => setBarrier(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
      </Section>
      <Section label="Stake">
        <StakeInput value={stake} onChange={setStake} currency={currency} />
      </Section>
      <div className="grid grid-cols-2 gap-2">
        <BuyButton label="Touch" color="#22C55E" />
        <BuyButton label="No Touch" color="#EF4444" />
      </div>
    </div>
  );

  // IN / OUT
  if (type.id === "IN_OUT") return (
    <div className="space-y-4">
      <Section label="Duration">
        <div className="flex gap-2">
          <input type="number" min="1" value={duration} onChange={e => setDuration(+e.target.value || 1)}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground text-center outline-none focus:border-primary" />
          <select className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
            <option>Days</option><option>Hours</option>
          </select>
        </div>
      </Section>
      <Section label="High barrier">
        <input type="text" placeholder="+1.00" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
      </Section>
      <Section label="Low barrier">
        <input type="text" placeholder="-1.00" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
      </Section>
      <Section label="Stake">
        <StakeInput value={stake} onChange={setStake} currency={currency} />
      </Section>
      <div className="grid grid-cols-2 gap-2">
        <BuyButton label="Ends Between" color="#22C55E" />
        <BuyButton label="Ends Outside" color="#EF4444" />
      </div>
    </div>
  );

  // EVEN / ODD
  if (type.id === "EVEN_ODD") return (
    <div className="space-y-4">
      <Section label="Duration (ticks)">
        <div className="flex gap-1.5 flex-wrap">
          {[1,2,3,4,5].map(t => (
            <button key={t} onClick={() => setDuration(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                duration === t ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              }`}>{t}</button>
          ))}
        </div>
      </Section>
      <Section label="Stake">
        <StakeInput value={stake} onChange={setStake} currency={currency} />
      </Section>
      <div className="pt-1 text-sm border-t border-border">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Payout</span>
          <span className="text-[#22C55E] font-semibold">{(stake * 1.95).toFixed(2)} {currency}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BuyButton label="Even" color="#22C55E" />
        <BuyButton label="Odd"  color="#EF4444" />
      </div>
    </div>
  );

  // MATCHES / DIFFERS
  if (type.id === "MATCH_DIFF") return (
    <div className="space-y-4">
      <Section label="Last digit prediction">
        <div className="flex gap-1 flex-wrap">
          {[0,1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => setDigit(d)}
              className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                digit === d ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              }`}>{d}</button>
          ))}
        </div>
      </Section>
      <Section label="Duration (ticks)">
        <div className="flex gap-1.5">
          {[1,2,3,4,5].map(t => (
            <button key={t} onClick={() => setDuration(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                duration === t ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              }`}>{t}</button>
          ))}
        </div>
      </Section>
      <Section label="Stake">
        <StakeInput value={stake} onChange={setStake} currency={currency} />
      </Section>
      <div className="grid grid-cols-2 gap-2">
        <BuyButton label="Matches" color="#22C55E" />
        <BuyButton label="Differs" color="#EF4444" />
      </div>
    </div>
  );

  // OVER / UNDER
  if (type.id === "OVER_UNDER") return (
    <div className="space-y-4">
      <Section label="Last digit prediction">
        <div className="flex gap-1 flex-wrap">
          {[0,1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => setDigit(d)}
              className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                digit === d ? "bg-primary text-white border-primary" : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              }`}>{d}</button>
          ))}
        </div>
      </Section>
      <Section label="Duration (ticks)">
        <div className="flex gap-1.5">
          {[1,2,3,4,5].map(t => (
            <button key={t} onClick={() => setDuration(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                duration === t ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
              }`}>{t}</button>
          ))}
        </div>
      </Section>
      <Section label="Stake">
        <StakeInput value={stake} onChange={setStake} currency={currency} />
      </Section>
      <div className="grid grid-cols-2 gap-2">
        <BuyButton label={`Over ${digit}`}  color="#22C55E" />
        <BuyButton label={`Under ${digit}`} color="#EF4444" />
      </div>
    </div>
  );

  return null;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ManualTraders() {
  const { theme }     = useTheme();
  const { currency }  = useAuth();
  const isDark        = theme === "dark";

  const [sym, setSym]             = useState(SYMBOLS[0]);
  const [tradeTypeIdx, setTypeIdx]= useState(0);
  const [points, setPoints]       = useState<Point[]>([]);
  const [price, setPrice]         = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [openPrice, setOpenPrice] = useState<number | null>(null);
  const [stake, setStake]         = useState(10);
  const [connOk, setConnOk]       = useState<boolean | null>(null);

  const wsRef         = useRef<WebSocket | null>(null);
  const mountRef      = useRef(true);
  const retryRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const histRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const allTicksRef   = useRef<Tick[]>([]);
  const symRef        = useRef(sym.id);

  const clearAll = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current);  retryRef.current = null; }
    if (histRef.current)  { clearTimeout(histRef.current);   histRef.current  = null; }
    if (pingRef.current)  { clearInterval(pingRef.current);  pingRef.current  = null; }
  }, []);

  const connect = useCallback(() => {
    if (!mountRef.current) return;
    clearAll();
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountRef.current) return;
      ws.send(JSON.stringify({
        ticks_history: symRef.current,
        adjust_start_time: 1,
        count: MAX_STORE,
        end: "latest",
        start: 1,
        style: "ticks",
      }));
      histRef.current = setTimeout(() => {
        if (!mountRef.current) return;
        ws.onclose = null; ws.close();
        retryRef.current = setTimeout(connect, RETRY_DELAY);
      }, HIST_TIMEOUT);
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
      }, PING_INTERVAL);
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) {
          ws.onclose = null; ws.close(); clearAll();
          retryRef.current = setTimeout(connect, RETRY_DELAY);
          return;
        }
        if (msg.msg_type === "pong") return;

        if (msg.msg_type === "history") {
          if (histRef.current) { clearTimeout(histRef.current); histRef.current = null; }
          const { prices, times } = msg.history as { prices: number[]; times: number[] };
          const ticks = times.map((t, i) => ({ epoch: t, quote: prices[i] }));
          allTicksRef.current = ticks;
          setPoints(ticks.slice(-MAX_STORE).map(t => ({ time: fmtTime(t.epoch), value: t.quote })));
          if (prices.length > 0) {
            setOpenPrice(prices[0]);
            setPrice(prices[prices.length - 1]);
          }
          setConnOk(true);
          ws.send(JSON.stringify({ ticks: symRef.current, subscribe: 1 }));
          return;
        }

        if (msg.msg_type === "tick") {
          const { quote, epoch } = msg.tick as { quote: number; epoch: number };
          setPrice(prev => { setPrevPrice(prev); return quote; });
          const updated = [...allTicksRef.current, { epoch, quote }];
          if (updated.length > MAX_STORE) updated.shift();
          allTicksRef.current = updated;
          setPoints(updated.map(t => ({ time: fmtTime(t.epoch), value: t.quote })));
        }
      } catch (_) {}
    };

    ws.onerror = () => { if (mountRef.current) setConnOk(false); };
    ws.onclose = () => {
      if (!mountRef.current) return;
      clearAll(); setConnOk(false);
      retryRef.current = setTimeout(connect, RETRY_DELAY);
    };
  }, [clearAll]);

  useEffect(() => {
    mountRef.current    = true;
    symRef.current      = sym.id;
    allTicksRef.current = [];
    setPoints([]); setPrice(null); setPrevPrice(null); setOpenPrice(null);
    setConnOk(null);
    connect();
    return () => {
      mountRef.current = false;
      clearAll();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [sym.id, connect, clearAll]);

  const tradeType   = TRADE_TYPES[tradeTypeIdx];
  const priceChange = price !== null && openPrice !== null ? price - openPrice : null;
  const pricePct    = priceChange !== null && openPrice
    ? ((priceChange / openPrice) * 100).toFixed(2) : null;
  const isUp        = priceChange !== null ? priceChange >= 0 : null;
  const priceDp     = sym.pip;

  const gridColor = isDark ? "hsl(210 24% 16%)" : "hsl(220 13% 91%)";
  const axisColor = isDark ? "hsl(218 11% 65%)" : "hsl(215 28% 34%)";
  const PRIMARY   = "#3B82F6";

  const yMin = points.length ? Math.min(...points.map(p => p.value)) * 0.9999 : undefined;
  const yMax = points.length ? Math.max(...points.map(p => p.value)) * 1.0001 : undefined;

  return (
    <div className="flex h-full bg-background" style={{ height: "calc(100vh - 120px)" }}>

      {/* ── Left: Chart ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col border-r border-border">

        {/* Symbol header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-card border-b border-border shrink-0 flex-wrap gap-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connOk === true ? "bg-[#22C55E]" : connOk === false ? "bg-[#EF4444]" : "bg-[#FACC15] animate-pulse"}`}/>
            <select
              value={sym.id}
              onChange={e => setSym(SYMBOLS.find(s => s.id === e.target.value) || SYMBOLS[0])}
              className="bg-transparent border-none text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              {SYMBOLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-1">
            <span className={`text-lg font-bold font-mono ${
              price !== null && prevPrice !== null
                ? price > prevPrice ? "text-[#22C55E]" : price < prevPrice ? "text-[#EF4444]" : "text-foreground"
                : "text-foreground"
            }`}>
              {price !== null ? price.toFixed(priceDp) : "--"}
            </span>
            {priceChange !== null && pricePct !== null && (
              <span className={`text-xs font-medium ${isUp ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
                {isUp ? "+" : ""}{priceChange.toFixed(priceDp)} ({isUp ? "+" : ""}{pricePct}%) {isUp ? "▲" : "▼"}
              </span>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 bg-background p-3 relative">
          {points.length < 2 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-7 h-7 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin"/>
              <span className="text-xs text-muted-foreground">
                {connOk === null ? "Connecting…" : connOk === false ? "Reconnecting…" : "Loading chart…"}
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 56, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.15}/>
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
                  tickFormatter={(v: number) => v.toFixed(priceDp)}
                  width={62}
                />
                <Tooltip content={<ChartTooltip/>}/>
                <Area type="monotone" dataKey="value"
                  stroke={PRIMARY} strokeWidth={1.5}
                  fill="url(#mtGrad)"
                  dot={false} activeDot={{ r: 3, fill: PRIMARY }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Right: Trade panel ───────────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col bg-card overflow-y-auto">

        {/* Learn link */}
        <div className="flex items-center justify-end gap-1 px-4 py-2 border-b border-border shrink-0">
          <Info className="w-3.5 h-3.5 text-muted-foreground"/>
          <span className="text-xs text-muted-foreground">Learn about this trade type</span>
        </div>

        {/* Trade type nav */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
          <button
            onClick={() => setTypeIdx(i => (i - 1 + TRADE_TYPES.length) % TRADE_TYPES.length)}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4"/>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">{tradeType.label}</span>
          </div>
          <button
            onClick={() => setTypeIdx(i => (i + 1) % TRADE_TYPES.length)}
            className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ChevronRight className="w-4 h-4"/>
          </button>
        </div>

        {/* Trade type quick-pick dots */}
        <div className="flex justify-center gap-1 py-2 border-b border-border shrink-0">
          {TRADE_TYPES.map((_, i) => (
            <button key={i} onClick={() => setTypeIdx(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === tradeTypeIdx ? "bg-primary w-3" : "bg-border hover:bg-muted-foreground"}`}/>
          ))}
        </div>

        {/* Trade form */}
        <div className="p-4 flex-1">
          <TradePanel
            type={tradeType}
            stake={stake}
            setStake={setStake}
            currency={currency || "USD"}
            price={price}
            symId={sym.id}
          />
        </div>
      </div>
    </div>
  );
}
