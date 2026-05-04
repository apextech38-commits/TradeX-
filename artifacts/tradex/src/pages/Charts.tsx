import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  X, Search, Star, CandlestickChart, ChevronDown, ChevronRight,
} from "lucide-react";
import { DERIV_APP_ID } from "@/context/AuthContext";

// ── WebSocket ──────────────────────────────────────────────────────────────────
const WS_URL        = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const RETRY_DELAY   = 3_000;
const HIST_TIMEOUT  = 10_000;
const PING_INTERVAL = 25_000;
const MAX_TICKS     = 500;
const FAV_KEY       = "tradex-charts-fav-markets";

// ── Market definitions ─────────────────────────────────────────────────────────
interface Market { id: string; label: string; badge: string }

const mkts = (list: [string, string, string][]): Market[] =>
  list.map(([id, label, badge]) => ({ id, label, badge }));

const COMMODITIES_BASKET = mkts([
  ["WLDGOLD", "Gold Basket", "GLD"],
]);
const FOREX_BASKET = mkts([
  ["WLDAUD", "AUD Basket", "AUD"],
  ["WLDEUR", "EUR Basket", "EUR"],
  ["WLDGBP", "GBP Basket", "GBP"],
  ["WLDUSD", "USD Basket", "USD"],
]);
const CONTINUOUS = mkts([
  ["1HZ10V",  "Volatility 10 (1s) Index",  "10"],
  ["R_10",    "Volatility 10 Index",        "10"],
  ["1HZ15V",  "Volatility 15 (1s) Index",  "15"],
  ["1HZ25V",  "Volatility 25 (1s) Index",  "25"],
  ["R_25",    "Volatility 25 Index",        "25"],
  ["1HZ30V",  "Volatility 30 (1s) Index",  "30"],
  ["1HZ50V",  "Volatility 50 (1s) Index",  "50"],
  ["R_50",    "Volatility 50 Index",        "50"],
  ["1HZ75V",  "Volatility 75 (1s) Index",  "75"],
  ["R_75",    "Volatility 75 Index",        "75"],
  ["1HZ90V",  "Volatility 90 (1s) Index",  "90"],
  ["1HZ100V", "Volatility 100 (1s) Index", "100"],
  ["R_100",   "Volatility 100 Index",       "100"],
]);
const CRASH_BOOM = mkts([
  ["BOOM50N",    "Boom 50 Index",    "B50"],
  ["BOOM150N",   "Boom 150 Index",   "B150"],
  ["BOOM300N",   "Boom 300 Index",   "B300"],
  ["BOOM500N",   "Boom 500 Index",   "B500"],
  ["BOOM600N",   "Boom 600 Index",   "B600"],
  ["BOOM900N",   "Boom 900 Index",   "B900"],
  ["BOOM1000N",  "Boom 1000 Index",  "B1K"],
  ["CRASH50N",   "Crash 50 Index",   "C50"],
  ["CRASH300N",  "Crash 300 Index",  "C300"],
  ["CRASH500N",  "Crash 500 Index",  "C500"],
  ["CRASH600N",  "Crash 600 Index",  "C600"],
  ["CRASH900N",  "Crash 900 Index",  "C900"],
  ["CRASH1000N", "Crash 1000 Index", "C1K"],
]);
const DAILY_RESET = mkts([
  ["BRMIDX", "Bear Market Index", "BEAR"],
  ["BULIDX", "Bull Market Index", "BULL"],
]);
const JUMP = mkts([
  ["JD10",  "Jump 10 Index",  "J10"],
  ["JD25",  "Jump 25 Index",  "J25"],
  ["JD50",  "Jump 50 Index",  "J50"],
  ["JD75",  "Jump 75 Index",  "J75"],
  ["JD100", "Jump 100 Index", "J100"],
]);
const RANGE_BREAK = mkts([
  ["RB100", "Range Break 100 Index", "RB100"],
  ["RB200", "Range Break 200 Index", "RB200"],
]);
const STEP = mkts([
  ["stpRNG100", "Step Index 100", "S100"],
  ["stpRNG200", "Step Index 200", "S200"],
  ["stpRNG300", "Step Index 300", "S300"],
  ["stpRNG400", "Step Index 400", "S400"],
  ["stpRNG500", "Step Index 500", "S500"],
]);
const MAJOR_PAIRS = mkts([
  ["frxAUDJPY", "AUD/JPY", "AUDJPY"],
  ["frxAUDUSD", "AUD/USD", "AUDUSD"],
  ["frxEURAUD", "EUR/AUD", "EURAUD"],
  ["frxEURCAD", "EUR/CAD", "EURCAD"],
  ["frxEURCHF", "EUR/CHF", "EURCHF"],
  ["frxEURGBP", "EUR/GBP", "EURGBP"],
  ["frxEURJPY", "EUR/JPY", "EURJPY"],
  ["frxEURUSD", "EUR/USD", "EURUSD"],
  ["frxGBPJPY", "GBP/JPY", "GBPJPY"],
  ["frxGBPUSD", "GBP/USD", "GBPUSD"],
  ["frxUSDCAD", "USD/CAD", "USDCAD"],
  ["frxUSDCHF", "USD/CHF", "USDCHF"],
  ["frxUSDJPY", "USD/JPY", "USDJPY"],
]);
const MINOR_PAIRS = mkts([
  ["frxAUDCHF", "AUD/CHF", "AUDCHF"],
  ["frxAUDNZD", "AUD/NZD", "AUDNZD"],
  ["frxEURNZD", "EUR/NZD", "EURNZD"],
  ["frxGBPAUD", "GBP/AUD", "GBPAUD"],
  ["frxGBPCHF", "GBP/CHF", "GBPCHF"],
  ["frxGBPNOK", "GBP/NOK", "GBPNOK"],
  ["frxGBPNZD", "GBP/NZD", "GBPNZD"],
  ["frxNZDJPY", "NZD/JPY", "NZDJPY"],
  ["frxNZDUSD", "NZD/USD", "NZDUSD"],
  ["frxUSDMXN", "USD/MXN", "USDMXN"],
  ["frxUSDNOK", "USD/NOK", "USDNOK"],
  ["frxUSDPLN", "USD/PLN", "USDPLN"],
  ["frxUSDSEK", "USD/SEK", "USDSEK"],
]);
const AMERICAN_INDICES = mkts([
  ["SPC",      "US 500",       "US500"],
  ["USTECH100","US Tech 100",  "NAS"],
  ["DJI",      "Wall Street 30","DJ30"],
]);
const ASIAN_INDICES = mkts([
  ["AS51", "Australia 200", "AUS200"],
  ["HSI",  "Hong Kong 50",  "HK50"],
  ["N225", "Japan 225",     "JPN225"],
]);
const EUROPEAN_INDICES = mkts([
  ["CAC",   "France 40",      "FR40"],
  ["GER40", "Germany 40",     "GER40"],
  ["AEX",   "Netherlands 25", "NL25"],
  ["SMI",   "Swiss 20",       "CH20"],
  ["UK100", "UK 100",         "UK100"],
]);
const CRYPTOS = mkts([
  ["cryBTCUSD", "BTC/USD", "BTC"],
  ["cryETHUSD", "ETH/USD", "ETH"],
]);
const METALS = mkts([
  ["frxXAUAUD", "Gold/AUD",     "XAUAUD"],
  ["frxXAUUSD", "Gold/USD",     "XAUUSD"],
  ["frxXPTUSD", "Platinum/USD", "XPTUSD"],
  ["frxXAGUSD", "Silver/USD",   "XAGUSD"],
]);

const ALL_GROUPS = [
  { label: "Commodities Basket",  items: COMMODITIES_BASKET  },
  { label: "Forex Basket",        items: FOREX_BASKET        },
  { label: "Continuous Indices",  items: CONTINUOUS          },
  { label: "Crash/Boom Indices",  items: CRASH_BOOM          },
  { label: "Daily Reset Indices", items: DAILY_RESET         },
  { label: "Jump Indices",        items: JUMP                },
  { label: "Range Break Indices", items: RANGE_BREAK         },
  { label: "Step Indices",        items: STEP                },
  { label: "Major Pairs",         items: MAJOR_PAIRS         },
  { label: "Minor Pairs",         items: MINOR_PAIRS         },
  { label: "American Indices",    items: AMERICAN_INDICES    },
  { label: "Asian Indices",       items: ASIAN_INDICES       },
  { label: "European Indices",    items: EUROPEAN_INDICES    },
  { label: "Cryptocurrencies",    items: CRYPTOS             },
  { label: "Metals",              items: METALS              },
];

const ALL_MARKETS = ALL_GROUPS.flatMap(g => g.items);
const DEFAULT_MKT = CONTINUOUS.find(m => m.id === "R_100")!;

// ── Price box SVG label ────────────────────────────────────────────────────────
const PriceBoxLabel = (props: any) => {
  const { viewBox, displayValue } = props;
  if (!viewBox) return null;
  const { x, y, width } = viewBox;
  const bx = x + width + 4;
  return (
    <g>
      <rect x={bx} y={y - 10} width={72} height={20} rx={3} fill="#111827" />
      <text x={bx + 36} y={y + 5} textAnchor="middle" fill="#fff"
        fontSize={11} fontWeight="bold" fontFamily="monospace">
        {displayValue}
      </text>
    </g>
  );
};

// ── Markets Modal ──────────────────────────────────────────────────────────────
function MarketsModal({ selected, onSelect, onClose }: {
  selected: Market; onSelect: (m: Market) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [favIds, setFavIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavIds(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };

  const q = query.trim().toLowerCase();
  const filtered = q ? ALL_MARKETS.filter(m => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) : null;
  const favMarkets = ALL_MARKETS.filter(m => favIds.includes(m.id));

  const MarketRow = ({ m }: { m: Market }) => (
    <button
      onClick={() => { onSelect(m); onClose(); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left hover:bg-secondary/60 ${
        m.id === selected.id ? "bg-primary/8 text-primary font-semibold" : "text-foreground"
      }`}
    >
      <div className="w-9 h-6 rounded bg-secondary flex items-center justify-center text-[9px] font-bold text-foreground border border-border flex-shrink-0 leading-none">
        {m.badge}
      </div>
      <span className="flex-1 truncate">{m.label}</span>
      {m.id === selected.id && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mr-1" />
      )}
      <button
        onClick={e => toggleFav(m.id, e)}
        className="flex-shrink-0 ml-1 p-0.5"
      >
        <Star className={`w-4 h-4 transition-colors ${
          favIds.includes(m.id) ? "text-[#FACC15] fill-[#FACC15]" : "text-muted-foreground hover:text-[#FACC15]"
        }`} />
      </button>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl flex flex-col w-full max-w-lg h-[88vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">Select Market</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search markets…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered ? (
            <>
              <div className="px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide border-b border-border/60">
                Results ({filtered.length})
              </div>
              {filtered.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-10">No markets found</p>
                : filtered.map(m => <MarketRow key={m.id} m={m} />)
              }
            </>
          ) : (
            <>
              {/* Favourites */}
              <div className="border-b border-border">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, __favs: !c.__favs }))}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#FACC15] uppercase tracking-wide">
                    <Star className="w-3.5 h-3.5 fill-[#FACC15]" />
                    Favourites
                  </div>
                  {collapsed.__favs
                    ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown  className="w-4 h-4 text-muted-foreground" />}
                </button>
                {!collapsed.__favs && (
                  favMarkets.length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-4">No favourites yet</p>
                    : favMarkets.map(m => <MarketRow key={m.id} m={m} />)
                )}
              </div>

              {/* All groups */}
              {ALL_GROUPS.map(g => (
                <div key={g.label} className="border-b border-border/60">
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [g.label]: !c[g.label] }))}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">{g.label}</span>
                    {collapsed[g.label]
                      ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown  className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  {!collapsed[g.label] && g.items.map(m => <MarketRow key={m.id} m={m} />)}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tick type ──────────────────────────────────────────────────────────────────
type Point = { time: string; value: number };

function fmtTime(epoch: number) {
  return new Date(epoch * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Charts() {
  const [sym, setSym]           = useState<Market>(DEFAULT_MKT);
  const [showModal, setModal]   = useState(false);
  const [points, setPoints]     = useState<Point[]>([]);
  const [price, setPrice]       = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [connStatus, setConnStatus] = useState<"connecting"|"live"|"error">("connecting");

  const wsRef       = useRef<WebSocket | null>(null);
  const mountRef    = useRef(true);
  const retryRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const histRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const symRef      = useRef(sym.id);
  const subIdRef    = useRef<string | null>(null);
  const allTicksRef = useRef<{ epoch: number; quote: number }[]>([]);

  const clearTimers = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current);  retryRef.current = null; }
    if (histRef.current)  { clearTimeout(histRef.current);   histRef.current  = null; }
    if (pingRef.current)  { clearInterval(pingRef.current);  pingRef.current  = null; }
  }, []);

  const buildPoints = (ticks: { epoch: number; quote: number }[]) =>
    ticks.slice(-MAX_TICKS).map(t => ({ time: fmtTime(t.epoch), value: t.quote }));

  const connect = useCallback(() => {
    if (!mountRef.current) return;
    clearTimers();
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    subIdRef.current = null;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    setConnStatus("connecting");

    ws.onopen = () => {
      if (!mountRef.current) return;
      ws.send(JSON.stringify({
        ticks_history: symRef.current,
        count: 100,
        end: "latest",
        start: 1,
        style: "ticks",
        subscribe: 1,
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
          ws.onclose = null; ws.close(); clearTimers();
          setConnStatus("error");
          retryRef.current = setTimeout(connect, RETRY_DELAY);
          return;
        }
        if (msg.msg_type === "pong") return;

        if (msg.msg_type === "history") {
          if (histRef.current) { clearTimeout(histRef.current); histRef.current = null; }
          const { prices, times } = msg.history as { prices: number[]; times: number[] };
          const ticks = times.map((t, i) => ({ epoch: t, quote: prices[i] }));
          allTicksRef.current = ticks;
          setPoints(buildPoints(ticks));
          if (prices.length > 0) {
            const last = prices[prices.length - 1];
            const prev = prices.length > 1 ? prices[prices.length - 2] : last;
            setPrice(last);
            setPrevPrice(prev);
          }
          setConnected(true);
          setConnStatus("live");
          // store subscription id if provided
          if (msg.subscription?.id) subIdRef.current = msg.subscription.id;
        }

        if (msg.msg_type === "tick") {
          if (msg.subscription?.id) subIdRef.current = msg.subscription.id;
          const quote: number = msg.tick.quote;
          const epoch: number = msg.tick.epoch;
          setPrice(q => { setPrevPrice(q); return quote; });
          const next = [...allTicksRef.current, { epoch, quote }];
          if (next.length > MAX_TICKS * 2) next.shift();
          allTicksRef.current = next;
          setPoints(buildPoints(next));
          setConnected(true);
          setConnStatus("live");
        }
      } catch (_) {}
    };

    ws.onerror = () => { if (mountRef.current) { setConnected(false); setConnStatus("error"); } };
    ws.onclose = () => {
      if (!mountRef.current) return;
      clearTimers(); setConnected(false); setConnStatus("error");
      retryRef.current = setTimeout(connect, RETRY_DELAY);
    };
  }, [clearTimers]);

  // When symbol changes: forget old subscription, then reconnect
  useEffect(() => {
    mountRef.current = true;
    const prevSymId = symRef.current;
    symRef.current  = sym.id;

    // If WS is open and we have a sub id, forget it before re-subscribing
    if (
      wsRef.current?.readyState === WebSocket.OPEN &&
      subIdRef.current &&
      prevSymId !== sym.id
    ) {
      wsRef.current.send(JSON.stringify({ forget: subIdRef.current }));
    }

    allTicksRef.current = [];
    setPoints([]); setPrice(null); setPrevPrice(null);
    setConnected(false); setConnStatus("connecting");
    connect();

    return () => {
      mountRef.current = false;
      clearTimers();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [sym.id, connect, clearTimers]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const priceChange = price != null && prevPrice != null ? price - prevPrice : null;
  const priceUp     = priceChange == null ? null : priceChange >= 0;

  const values = points.map(p => p.value);
  const minV   = values.length ? Math.min(...values) : 0;
  const maxV   = values.length ? Math.max(...values) : 0;
  const pad    = ((maxV - minV) * 0.25) || 1;

  const dp = price != null
    ? price > 1000 ? 2 : price > 10 ? 4 : 5
    : 2;

  const connDot =
    connStatus === "live"       ? "bg-[#22C55E]" :
    connStatus === "error"      ? "bg-[#EF4444] animate-pulse" :
                                  "bg-[#FACC15] animate-pulse";

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] bg-background pb-4">

      {/* Market modal */}
      {showModal && (
        <MarketsModal
          selected={sym}
          onSelect={setSym}
          onClose={() => setModal(false)}
        />
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 flex-wrap gap-y-2">

        {/* Market selector card */}
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3.5 py-2.5 hover:border-primary/60 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connDot}`} />
            <div className="w-9 h-8 rounded-lg bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground border border-border">
              {sym.badge}
            </div>
            <CandlestickChart className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-sm font-bold text-foreground leading-tight truncate max-w-[200px]">
              {sym.label}
            </div>
            {price != null ? (
              <div className={`text-xs font-mono flex items-center gap-1 mt-0.5 ${priceUp === false ? "text-[#EF4444]" : "text-[#22C55E]"}`}>
                <span>{priceUp ? "▲" : "▼"}</span>
                <span className="font-bold">{price.toFixed(dp)}</span>
                {priceChange != null && prevPrice != null && (
                  <span>
                    {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(dp)}
                    {" "}({Math.abs(priceChange / prevPrice * 100).toFixed(2)}%)
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-0.5">Connecting…</div>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-0.5 flex-shrink-0" />
        </button>
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────────── */}
      <div className="px-4 flex-1">
        <div className="relative bg-card border border-border rounded-xl overflow-hidden shadow-sm" style={{ height: "calc(100vh - 220px)", minHeight: 320 }}>
          {points.length < 2 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <div className={`w-4 h-4 border-2 rounded-full animate-spin ${
                connStatus === "error"
                  ? "border-[#EF4444]/30 border-t-[#EF4444]"
                  : "border-primary/30 border-t-primary"
              }`} />
              {connStatus === "error" ? "Reconnecting…" : "Connecting to live feed…"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 24, right: 86, left: 4, bottom: 32 }}
              >
                <defs>
                  <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#9CA3AF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#9CA3AF" stopOpacity={0.03} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: "#9CA3AF", fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E5E7EB", strokeWidth: 1 }}
                  interval="preserveStartEnd"
                  minTickGap={60}
                />
                <YAxis
                  domain={[minV - pad, maxV + pad]}
                  tick={{ fontSize: 9, fill: "#9CA3AF", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={62}
                  tickFormatter={(v: number) => v.toFixed(dp)}
                />

                {/* Dotted current price line + right-edge label box */}
                {price != null && (
                  <ReferenceLine
                    y={price}
                    stroke="#374151"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={<PriceBoxLabel displayValue={price.toFixed(dp)} />}
                  />
                )}

                <Area
                  type="linear"
                  dataKey="value"
                  stroke="#6B7280"
                  strokeWidth={1.5}
                  fill="url(#chartFill)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Bottom-left overlay: 1T + candlestick icon */}
          <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-card/80 border border-border rounded-md px-2 py-1 text-xs font-mono text-muted-foreground">
            <span className="font-bold text-foreground">1T</span>
            <CandlestickChart className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
