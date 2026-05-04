import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, BarChart2, Zap, Hash, ArrowUpDown, Layers, CircleDot,
  Info, X, Search, Star, ChevronDown, ChevronRight, CandlestickChart,
} from "lucide-react";
import { DERIV_APP_ID, OAUTH_APP_ID } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";

// ── Config ─────────────────────────────────────────────────────────────────────
const WS_URL        = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const PING_INTERVAL = 25_000;
const RETRY_DELAY   = 3_000;
const MAX_TICKS     = 120;
const REDIRECT_URI  = "https://dev-utility-hub--apexricky20.replit.app/callback";
const LOGIN_URL     = `https://oauth.deriv.com/oauth2/authorize?app_id=${OAUTH_APP_ID}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
const FAV_KEY       = "tradex-fav-markets";

// ── Market data ────────────────────────────────────────────────────────────────
interface Market { id: string; label: string; badge: string }

const mk = (id: string, label: string, badge: string): Market => ({ id, label, badge });

const COMMODITIES_BASKET: Market[] = [
  mk("WLDGOLD", "Gold Basket", "GLD"),
];
const FOREX_BASKET: Market[] = [
  mk("WLDAUD", "AUD Basket", "AUD"),
  mk("WLDEUR", "EUR Basket", "EUR"),
  mk("WLDGBP", "GBP Basket", "GBP"),
  mk("WLDUSD", "USD Basket", "USD"),
];
const CONTINUOUS: Market[] = [
  mk("1HZ10V",  "Volatility 10 (1s) Index",  "10"),
  mk("R_10",    "Volatility 10 Index",        "10"),
  mk("1HZ25V",  "Volatility 25 (1s) Index",  "25"),
  mk("R_25",    "Volatility 25 Index",        "25"),
  mk("1HZ50V",  "Volatility 50 (1s) Index",  "50"),
  mk("R_50",    "Volatility 50 Index",        "50"),
  mk("1HZ75V",  "Volatility 75 (1s) Index",  "75"),
  mk("R_75",    "Volatility 75 Index",        "75"),
  mk("1HZ100V", "Volatility 100 (1s) Index", "100"),
  mk("R_100",   "Volatility 100 Index",       "100"),
  mk("1HZ150V", "Volatility 150 (1s) Index", "150"),
  mk("1HZ200V", "Volatility 200 (1s) Index", "200"),
  mk("1HZ250V", "Volatility 250 (1s) Index", "250"),
];
const CRASH_BOOM: Market[] = [
  mk("BOOM300N",   "Boom 300 Index",   "B300"),
  mk("BOOM500N",   "Boom 500 Index",   "B500"),
  mk("BOOM600N",   "Boom 600 Index",   "B600"),
  mk("BOOM900N",   "Boom 900 Index",   "B900"),
  mk("BOOM1000N",  "Boom 1000 Index",  "B1K"),
  mk("CRASH300N",  "Crash 300 Index",  "C300"),
  mk("CRASH500N",  "Crash 500 Index",  "C500"),
  mk("CRASH600N",  "Crash 600 Index",  "C600"),
  mk("CRASH900N",  "Crash 900 Index",  "C900"),
  mk("CRASH1000N", "Crash 1000 Index", "C1K"),
];
const DAILY_RESET: Market[] = [
  mk("BRMIDX", "Bear Market Index", "BEAR"),
  mk("BULIDX", "Bull Market Index", "BULL"),
];
const JUMP: Market[] = [
  mk("JD10",  "Jump 10 Index",  "J10"),
  mk("JD25",  "Jump 25 Index",  "J25"),
  mk("JD50",  "Jump 50 Index",  "J50"),
  mk("JD75",  "Jump 75 Index",  "J75"),
  mk("JD100", "Jump 100 Index", "J100"),
];
const RANGE_BREAK: Market[] = [
  mk("RB100", "Range Break 100 Index", "RB100"),
  mk("RB200", "Range Break 200 Index", "RB200"),
];
const STEP: Market[] = [
  mk("stpRNG100", "Step Index 100", "S100"),
  mk("stpRNG200", "Step Index 200", "S200"),
  mk("stpRNG300", "Step Index 300", "S300"),
  mk("stpRNG400", "Step Index 400", "S400"),
  mk("stpRNG500", "Step Index 500", "S500"),
];
const MAJOR_PAIRS: Market[] = [
  mk("frxAUDJPY", "AUD/JPY", "AUDJPY"),
  mk("frxAUDUSD", "AUD/USD", "AUDUSD"),
  mk("frxEURAUD", "EUR/AUD", "EURAUD"),
  mk("frxEURCAD", "EUR/CAD", "EURCAD"),
  mk("frxEURCHF", "EUR/CHF", "EURCHF"),
  mk("frxEURGBP", "EUR/GBP", "EURGBP"),
  mk("frxEURJPY", "EUR/JPY", "EURJPY"),
  mk("frxEURUSD", "EUR/USD", "EURUSD"),
  mk("frxGBPAUD", "GBP/AUD", "GBPAUD"),
  mk("frxGBPJPY", "GBP/JPY", "GBPJPY"),
  mk("frxGBPUSD", "GBP/USD", "GBPUSD"),
  mk("frxUSDCAD", "USD/CAD", "USDCAD"),
  mk("frxUSDCHF", "USD/CHF", "USDCHF"),
  mk("frxUSDJPY", "USD/JPY", "USDJPY"),
];
const MINOR_PAIRS: Market[] = [
  mk("frxAUDCHF", "AUD/CHF", "AUDCHF"),
  mk("frxAUDNZD", "AUD/NZD", "AUDNZD"),
  mk("frxEURNZD", "EUR/NZD", "EURNZD"),
  mk("frxGBPCAD", "GBP/CAD", "GBPCAD"),
  mk("frxGBPCHF", "GBP/CHF", "GBPCHF"),
  mk("frxGBPNZD", "GBP/NZD", "GBPNZD"),
  mk("frxNZDJPY", "NZD/JPY", "NZDJPY"),
  mk("frxNZDUSD", "NZD/USD", "NZDUSD"),
  mk("frxUSDMXN", "USD/MXN", "USDMXN"),
  mk("frxUSDNOK", "USD/NOK", "USDNOK"),
  mk("frxUSDPLN", "USD/PLN", "USDPLN"),
  mk("frxUSDSEK", "USD/SEK", "USDSEK"),
];
const AMERICAN_INDICES: Market[] = [
  mk("SPC",       "US 500",        "US500"),
  mk("USTECH100", "US Tech 100",   "NAS"),
  mk("DJI",       "Wall Street 30","DJ30"),
];
const ASIAN_INDICES: Market[] = [
  mk("AS51", "Australia 200", "AUS200"),
  mk("HSI",  "Hong Kong 50",  "HK50"),
  mk("N225", "Japan 225",     "JPN225"),
];
const EUROPEAN_INDICES: Market[] = [
  mk("STOXX50E","Europe 50",      "EU50"),
  mk("CAC",     "France 40",      "FR40"),
  mk("GER40",   "Germany 40",     "GER40"),
  mk("AEX",     "Netherlands 25", "NL25"),
  mk("SMI",     "Swiss 20",       "CH20"),
  mk("UK100",   "UK 100",         "UK100"),
];
const CRYPTOS: Market[] = [
  mk("cryBTCUSD", "BTC/USD", "BTC"),
  mk("cryETHUSD", "ETH/USD", "ETH"),
];
const METALS: Market[] = [
  mk("frxXAUAUD", "Gold/AUD",     "XAUAUD"),
  mk("frxXAUUSD", "Gold/USD",     "XAUUSD"),
  mk("frxXPDUSD", "Palladium/USD","XPDUSD"),
  mk("frxXPTUSD", "Platinum/USD", "XPTUSD"),
];

const MARKET_GROUPS = [
  { label: "Commodities Basket",  items: COMMODITIES_BASKET,  color: "#F59E0B" },
  { label: "Forex Basket",        items: FOREX_BASKET,        color: "#22C55E" },
  { label: "Continuous Indices",  items: CONTINUOUS,          color: "#1E90FF" },
  { label: "Crash/Boom Indices",  items: CRASH_BOOM,          color: "#EF4444" },
  { label: "Daily Reset Indices", items: DAILY_RESET,         color: "#6B7280" },
  { label: "Jump Indices",        items: JUMP,                color: "#F59E0B" },
  { label: "Range Break Indices", items: RANGE_BREAK,         color: "#7C3AED" },
  { label: "Step Indices",        items: STEP,                color: "#1A1A1A" },
  { label: "Major Pairs",         items: MAJOR_PAIRS,         color: "#22C55E" },
  { label: "Minor Pairs",         items: MINOR_PAIRS,         color: "#22C55E" },
  { label: "American Indices",    items: AMERICAN_INDICES,    color: "#EF4444" },
  { label: "Asian Indices",       items: ASIAN_INDICES,       color: "#F59E0B" },
  { label: "European Indices",    items: EUROPEAN_INDICES,    color: "#1E90FF" },
  { label: "Cryptocurrencies",    items: CRYPTOS,             color: "#F59E0B" },
  { label: "Metals",              items: METALS,              color: "#FACC15" },
];

const ALL_MARKETS = MARKET_GROUPS.flatMap(g => g.items);
const DEFAULT_MKT = CONTINUOUS.find(m => m.id === "1HZ100V")!;

// ── Trade types ────────────────────────────────────────────────────────────────
interface TradeType {
  id: string; label: string; badge?: string;
  Icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const TRADE_TYPES: TradeType[] = [
  { id: "accumulators", label: "Accumulators", badge: "NEW!", Icon: TrendingUp,   category: "ACCUMULATORS" },
  { id: "call_put",     label: "Call / Put",   badge: "NEW!", Icon: BarChart2,    category: "VANILLAS" },
  { id: "turbos",       label: "Long / Short", badge: "NEW!", Icon: Zap,          category: "TURBOS" },
  { id: "multipliers",  label: "Multipliers",              Icon: ArrowUpDown,   category: "MULTIPLIERS" },
  { id: "rise_fall",    label: "Rise / Fall",              Icon: TrendingUp,    category: "UPS & DOWNS" },
  { id: "higher_lower", label: "Higher / Lower",           Icon: ArrowUpDown,   category: "UPS & DOWNS" },
  { id: "touch",        label: "Touch / No Touch",         Icon: CircleDot,     category: "TOUCH & NO TOUCH" },
  { id: "matches",      label: "Matches / Differs",        Icon: Hash,          category: "DIGITS" },
  { id: "even_odd",     label: "Even / Odd",               Icon: Hash,          category: "DIGITS" },
  { id: "over_under",   label: "Over / Under",             Icon: Layers,        category: "DIGITS" },
];

// ── Price pill SVG ─────────────────────────────────────────────────────────────
const PricePill = (props: any) => {
  const { viewBox, displayValue } = props;
  if (!viewBox) return null;
  const { x, y, width } = viewBox;
  const pw = 82, ph = 22, pr = 11;
  const bx = x + width + 6;
  return (
    <g>
      <rect x={bx} y={y - ph / 2} width={pw} height={ph} rx={pr} ry={pr} fill="#1A1A1A" />
      <text x={bx + pw / 2} y={y + 4.5} textAnchor="middle" fill="#fff"
        fontSize={11} fontWeight="bold" fontFamily="monospace">
        {displayValue}
      </text>
    </g>
  );
};

// ── Markets bottom sheet ───────────────────────────────────────────────────────
function MarketsBottomSheet({ selected, onSelect, onClose }: {
  selected: Market; onSelect: (m: Market) => void; onClose: () => void;
}) {
  const [query, setQuery]     = useState("");
  const [favIds, setFavIds]   = useState<string[]>(() => {
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

  const q           = query.trim().toLowerCase();
  const filtered    = q ? ALL_MARKETS.filter(m => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) : null;
  const favMarkets  = ALL_MARKETS.filter(m => favIds.includes(m.id));

  const MarketRow = ({ m, color }: { m: Market; color?: string }) => (
    <button
      onClick={() => { onSelect(m); onClose(); }}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#F4F6FA] transition-colors"
    >
      <button
        onClick={e => toggleFav(m.id, e)}
        className="shrink-0"
      >
        <Star className={`w-4 h-4 transition-colors ${
          favIds.includes(m.id) ? "text-[#1E90FF] fill-[#1E90FF]" : "text-[#D1D5DB] hover:text-[#1E90FF]"
        }`} />
      </button>
      <div
        className="w-10 h-7 rounded flex items-center justify-center text-[9px] font-bold text-white shrink-0"
        style={{ backgroundColor: color || "#1E90FF" }}
      >
        {m.badge.length > 4 ? m.badge.slice(0, 4) : m.badge}
      </div>
      <span className="flex-1 text-left text-[#1A1A1A] font-medium truncate">{m.label}</span>
      {m.id === selected.id && (
        <span className="w-2 h-2 rounded-full bg-[#1E90FF] shrink-0" />
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ height: "95vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] shrink-0">
          <h2 className="text-base font-bold text-[#1A1A1A]">Markets</h2>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-[#1A1A1A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-2 bg-[#F4F6FA] border border-[#E5E7EB] rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search markets…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[#9CA3AF] hover:text-[#1A1A1A]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered ? (
            <>
              <div className="px-4 py-2 text-xs text-[#6B7280] font-semibold uppercase tracking-wide bg-[#F4F6FA] border-b border-[#E5E7EB]">
                Results ({filtered.length})
              </div>
              {filtered.length === 0
                ? <p className="text-sm text-[#6B7280] text-center py-10">No markets found</p>
                : filtered.map(m => {
                    const grp = MARKET_GROUPS.find(g => g.items.some(i => i.id === m.id));
                    return <MarketRow key={m.id} m={m} color={grp?.color} />;
                  })
              }
            </>
          ) : (
            <>
              {/* Favourites */}
              <div className="border-b border-[#E5E7EB]">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, __favs: !c.__favs }))}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F4F6FA] hover:bg-[#EAECF0]"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E90FF] uppercase tracking-wide">
                    <Star className="w-3.5 h-3.5 fill-[#1E90FF]" />
                    Favorites
                  </div>
                  {collapsed.__favs
                    ? <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                    : <ChevronDown  className="w-4 h-4 text-[#9CA3AF]" />}
                </button>
                {!collapsed.__favs && (
                  favMarkets.length === 0
                    ? <p className="text-sm text-[#9CA3AF] text-center py-5 italic">There are no favorites yet.</p>
                    : favMarkets.map(m => {
                        const grp = MARKET_GROUPS.find(g => g.items.some(i => i.id === m.id));
                        return <MarketRow key={m.id} m={m} color={grp?.color} />;
                      })
                )}
              </div>

              {/* All groups */}
              {MARKET_GROUPS.map(g => (
                <div key={g.label} className="border-b border-[#E5E7EB]">
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [g.label]: !c[g.label] }))}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F4F6FA] hover:bg-[#EAECF0]"
                  >
                    <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wide">{g.label}</span>
                    {collapsed[g.label]
                      ? <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
                      : <ChevronDown  className="w-4 h-4 text-[#9CA3AF]" />}
                  </button>
                  {!collapsed[g.label] && g.items.map(m => (
                    <MarketRow key={m.id} m={m} color={g.color} />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Trade types bottom sheet ───────────────────────────────────────────────────
function TradeTypesBottomSheet({ selected, onSelect, onClose }: {
  selected: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const categories = Array.from(new Set(TRADE_TYPES.map(t => t.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] shrink-0">
          <h2 className="text-base font-bold text-[#1A1A1A]">Trade Types</h2>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-[#1A1A1A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Learn link */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] shrink-0">
          <button className="flex items-center gap-2 text-sm text-[#6B7280]">
            <span>Learn more about trade types</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pb-4">
          {categories.map(cat => {
            const types = TRADE_TYPES.filter(t => t.category === cat);
            return (
              <div key={cat} className="py-1">
                <div className="flex items-center gap-2 px-4 py-2">
                  <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wide">{cat}</span>
                  {types[0]?.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#22C55E] text-white rounded">
                      {types[0].badge}
                    </span>
                  )}
                </div>
                {types.map(t => {
                  const isActive = selected === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { onSelect(t.id); onClose(); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        isActive ? "bg-[#E8F4FF]" : "hover:bg-[#F4F6FA]"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? "bg-[#1E90FF]" : "bg-[#F4F6FA]"
                      }`}>
                        <t.Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#6B7280]"}`} />
                      </div>
                      <span className={`flex-1 text-sm font-medium text-left ${isActive ? "text-[#1E90FF]" : "text-[#1A1A1A]"}`}>
                        {t.label}
                      </span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-[#1E90FF] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Point type ─────────────────────────────────────────────────────────────────
type Point = { idx: number; value: number };

// ── Main component ─────────────────────────────────────────────────────────────
export default function ManualTraders() {
  const { isLoggedIn } = useAuth();

  // Market & chart state
  const [sym, setSym]               = useState<Market>(DEFAULT_MKT);
  const [showMarkets, setShowMarkets]    = useState(false);
  const [showTradeTypes, setShowTradeTypes] = useState(false);
  const [points, setPoints]         = useState<Point[]>([]);
  const [price, setPrice]           = useState<number | null>(null);
  const [prevPrice, setPrevPrice]   = useState<number | null>(null);
  const [connStatus, setConnStatus] = useState<"connecting" | "live" | "error">("connecting");

  // Trade state
  const [tradeTypeId, setTradeTypeId] = useState("accumulators");
  const [stake, setStake]           = useState(10);
  const [stakeInput, setStakeInput] = useState("10");
  const [growthRate, setGrowthRate] = useState(3);
  const [takeProfitOn, setTakeProfitOn] = useState(false);
  const [takeProfit, setTakeProfit] = useState("");
  const [buyStatus, setBuyStatus]   = useState<string | null>(null);

  // WS refs
  const wsRef      = useRef<WebSocket | null>(null);
  const mountRef   = useRef(true);
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const symRef     = useRef(sym.id);
  const subIdRef   = useRef<string | null>(null);
  const ticksRef   = useRef<{ epoch: number; quote: number }[]>([]);
  const tickIdxRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current);  retryRef.current = null; }
    if (pingRef.current)  { clearInterval(pingRef.current);  pingRef.current  = null; }
  }, []);

  const buildPoints = (ticks: { epoch: number; quote: number }[]): Point[] =>
    ticks.slice(-MAX_TICKS).map((t, i) => ({ idx: i, value: t.quote }));

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
        style: "ticks",
        subscribe: 1,
      }));
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
          const { prices, times } = msg.history as { prices: number[]; times: number[] };
          const ticks = times.map((t, i) => ({ epoch: t, quote: prices[i] }));
          ticksRef.current = ticks;
          setPoints(buildPoints(ticks));
          if (prices.length > 0) {
            const last = prices[prices.length - 1];
            const prev = prices.length > 1 ? prices[prices.length - 2] : last;
            setPrice(last); setPrevPrice(prev);
          }
          setConnStatus("live");
          if (msg.subscription?.id) subIdRef.current = msg.subscription.id;
        }

        if (msg.msg_type === "tick") {
          if (msg.subscription?.id) subIdRef.current = msg.subscription.id;
          const quote: number = msg.tick.quote;
          const epoch: number = msg.tick.epoch;
          setPrice(q => { setPrevPrice(q); return quote; });
          const next = [...ticksRef.current, { epoch, quote }];
          if (next.length > MAX_TICKS * 2) next.shift();
          ticksRef.current = next;
          setPoints(buildPoints(next));
          setConnStatus("live");
        }
      } catch (_) {}
    };

    ws.onerror = () => { if (mountRef.current) setConnStatus("error"); };
    ws.onclose = () => {
      if (!mountRef.current) return;
      clearTimers(); setConnStatus("error");
      retryRef.current = setTimeout(connect, RETRY_DELAY);
    };
  }, [clearTimers]);

  useEffect(() => {
    mountRef.current = true;
    const prevId = symRef.current;
    symRef.current = sym.id;

    if (wsRef.current?.readyState === WebSocket.OPEN && subIdRef.current && prevId !== sym.id) {
      wsRef.current.send(JSON.stringify({ forget: subIdRef.current }));
    }

    ticksRef.current = [];
    tickIdxRef.current = 0;
    setPoints([]); setPrice(null); setPrevPrice(null);
    setConnStatus("connecting");
    connect();

    return () => {
      mountRef.current = false;
      clearTimers();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [sym.id, connect, clearTimers]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const tradeTypeMeta = TRADE_TYPES.find(t => t.id === tradeTypeId) || TRADE_TYPES[0];
  const priceChange   = price != null && prevPrice != null ? price - prevPrice : null;
  const priceUp       = priceChange == null ? null : priceChange >= 0;
  const dp            = price != null ? (price > 100 ? 2 : price > 10 ? 4 : 5) : 2;

  const values = points.map(p => p.value);
  const minV   = values.length ? Math.min(...values) : 0;
  const maxV   = values.length ? Math.max(...values) : 0;
  const pad    = ((maxV - minV) * 0.3) || 1;

  // Computed trade info (accumulator)
  const maxPayout = (stake * 6000 / 10).toFixed(2);
  const maxTicks  = 85;

  // ── Buy handler ─────────────────────────────────────────────────────────────
  const handleBuy = () => {
    if (!isLoggedIn) {
      window.location.href = LOGIN_URL;
      return;
    }
    const token = localStorage.getItem("deriv_token");
    if (!token) { setBuyStatus("No token — please log in"); return; }

    setBuyStatus("Placing...");
    const buyWs = new WebSocket(WS_URL);

    buyWs.onopen = () => {
      buyWs.send(JSON.stringify({ authorize: token }));
    };

    buyWs.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) { setBuyStatus(`Error: ${msg.error.message}`); buyWs.close(); return; }
        if (msg.msg_type === "authorize") {
          const tp = takeProfitOn && takeProfit ? parseFloat(takeProfit) : undefined;
          const params: Record<string, unknown> = {
            amount: stake, basis: "stake",
            contract_type: tradeTypeId === "accumulators" ? "ACCU" :
              tradeTypeId === "rise_fall" ? "CALL" :
              tradeTypeId === "multipliers" ? "MULTUP" : "CALL",
            currency: "USD",
            symbol: sym.id,
            growth_rate: tradeTypeId === "accumulators" ? growthRate / 100 : undefined,
          };
          if (tp) params.limit_order = { take_profit: tp };

          buyWs.send(JSON.stringify({ proposal: 1, subscribe: 0, ...params }));
        }
        if (msg.msg_type === "proposal") {
          buyWs.send(JSON.stringify({ buy: msg.proposal.id, price: stake }));
        }
        if (msg.msg_type === "buy") {
          setBuyStatus(`✓ Open — #${msg.buy.contract_id}`);
          buyWs.close();
          setTimeout(() => setBuyStatus(null), 4000);
        }
      } catch (_) {}
    };

    buyWs.onerror = () => { setBuyStatus("WS error"); };
  };

  // ── Stake helpers ────────────────────────────────────────────────────────────
  const adjustStake = (delta: number) => {
    setStake(s => { const n = Math.max(1, s + delta); setStakeInput(String(n)); return n; });
  };

  const connDot =
    connStatus === "live"  ? "bg-[#22C55E]" :
    connStatus === "error" ? "bg-[#EF4444] animate-pulse" :
                             "bg-[#F59E0B] animate-pulse";

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] bg-[#F4F6FA]">

      {/* Modals */}
      {showMarkets && (
        <MarketsBottomSheet
          selected={sym}
          onSelect={s => { setSym(s); }}
          onClose={() => setShowMarkets(false)}
        />
      )}
      {showTradeTypes && (
        <TradeTypesBottomSheet
          selected={tradeTypeId}
          onSelect={id => setTradeTypeId(id)}
          onClose={() => setShowTradeTypes(false)}
        />
      )}

      {/* ── Market selector card ───────────────────────────────────────────── */}
      <button
        onClick={() => setShowMarkets(true)}
        className="mx-3 mt-3 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
      >
        {/* Badge */}
        <div className="w-12 h-12 rounded-xl bg-[#1E90FF]/10 flex items-center justify-center shrink-0">
          <CandlestickChart className="w-6 h-6 text-[#1E90FF]" />
        </div>

        {/* Name + price */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-base font-bold text-[#1A1A1A] truncate">{sym.label}</div>
          {price != null ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-sm font-mono font-bold ${priceUp === false ? "text-[#EF4444]" : "text-[#22C55E]"}`}>
                {price.toFixed(dp)}
              </span>
              {priceChange != null && prevPrice != null && (
                <span className={`text-xs ${priceUp === false ? "text-[#EF4444]" : "text-[#22C55E]"}`}>
                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(dp)}
                  {" "}({Math.abs(priceChange / prevPrice * 100).toFixed(2)}%)
                  {" "}{priceUp === false ? "▼" : "▲"}
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-[#9CA3AF] mt-0.5 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${connDot}`} />
              Connecting…
            </div>
          )}
        </div>

        <ChevronDown className="w-5 h-5 text-[#6B7280] shrink-0" />
      </button>

      {/* ── Chart ─────────────────────────────────────────────────────────────── */}
      <div className="mx-3 mt-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden relative" style={{ height: 300 }}>

        {/* 1T label bottom-left */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 text-[#9CA3AF] pointer-events-none">
          <CandlestickChart className="w-3 h-3" />
          <span className="text-[11px] font-semibold">1 T</span>
        </div>

        {/* Status dot top-right */}
        <div className="absolute top-3 right-3 z-10">
          <span className={`w-2 h-2 rounded-full inline-block ${connDot}`} />
        </div>

        {points.length < 2 ? (
          <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm gap-2">
            <div className={`w-4 h-4 border-2 rounded-full animate-spin ${
              connStatus === "error"
                ? "border-[#EF4444]/30 border-t-[#EF4444]"
                : "border-[#1E90FF]/30 border-t-[#1E90FF]"
            }`} />
            {connStatus === "error" ? "Reconnecting…" : "Loading live feed…"}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 10, right: 96, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <YAxis
                domain={[minV - pad, maxV + pad]}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                width={62}
                tickFormatter={(v: number) => v.toFixed(dp)}
              />
              {price != null && (
                <ReferenceLine
                  y={price}
                  stroke="#1A1A1A"
                  strokeDasharray="5 3"
                  strokeWidth={1}
                  label={<PricePill displayValue={price.toFixed(dp)} />}
                />
              )}
              <Line
                type="linear"
                dataKey="value"
                stroke="#1A1A1A"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Trade panel ───────────────────────────────────────────────────────── */}
      <div className="mx-3 mt-2 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden mb-3">

        {/* Learn row */}
        <button className="w-full flex items-center gap-2 px-4 py-3 border-b border-[#E5E7EB] hover:bg-[#F4F6FA] transition-colors">
          <CandlestickChart className="w-4 h-4 text-[#1E90FF]" />
          <span className="text-sm text-[#1E90FF] font-medium">Learn about this trade type</span>
          <ChevronRight className="w-4 h-4 text-[#1E90FF] ml-auto" />
        </button>

        {/* Trade type selector */}
        <button
          onClick={() => setShowTradeTypes(true)}
          className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#E5E7EB] hover:bg-[#F4F6FA] transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1E90FF]/10 flex items-center justify-center shrink-0">
            <tradeTypeMeta.Icon className="w-4 h-4 text-[#1E90FF]" />
          </div>
          <span className="text-sm font-bold text-[#1A1A1A] flex-1 text-left">{tradeTypeMeta.label}</span>
          {tradeTypeMeta.badge && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#22C55E] text-white rounded mr-1">
              {tradeTypeMeta.badge}
            </span>
          )}
          {tradeTypeId === "accumulators" && (
            <div className="flex items-center gap-1 mr-1">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={e => { e.stopPropagation(); setGrowthRate(r); }}
                  className={`w-7 h-7 text-xs font-bold rounded-full transition-colors ${
                    growthRate === r ? "bg-[#1E90FF] text-white" : "bg-[#F4F6FA] text-[#6B7280] hover:bg-[#E5E7EB]"
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          )}
          <span className="text-sm font-bold text-[#1A1A1A]">{tradeTypeId === "accumulators" ? `${growthRate}%` : ""}</span>
          <Info className="w-4 h-4 text-[#9CA3AF]" />
          <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
        </button>

        {/* Stake row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#E5E7EB]">
          <button
            onClick={() => adjustStake(-1)}
            className="w-9 h-9 rounded-full bg-[#F4F6FA] border border-[#E5E7EB] flex items-center justify-center text-[#1A1A1A] text-xl font-bold hover:bg-[#E5E7EB] transition-colors shrink-0"
          >
            −
          </button>
          <div className="flex-1 text-center">
            <input
              type="number"
              value={stakeInput}
              onChange={e => {
                setStakeInput(e.target.value);
                const n = parseFloat(e.target.value);
                if (!isNaN(n) && n >= 1) setStake(n);
              }}
              onBlur={() => {
                const n = parseFloat(stakeInput);
                if (isNaN(n) || n < 1) { setStake(1); setStakeInput("1"); }
                else { setStake(n); setStakeInput(String(n)); }
              }}
              className="w-full text-center text-2xl font-bold text-[#1A1A1A] border-none outline-none bg-transparent"
              min={1}
              step={1}
            />
          </div>
          <button
            onClick={() => adjustStake(1)}
            className="w-9 h-9 rounded-full bg-[#F4F6FA] border border-[#E5E7EB] flex items-center justify-center text-[#1A1A1A] text-xl font-bold hover:bg-[#E5E7EB] transition-colors shrink-0"
          >
            +
          </button>
          <span className="text-sm text-[#9CA3AF] font-medium shrink-0 w-12 text-right">Stake</span>
        </div>

        {/* Take profit row */}
        <div className="border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setTakeProfitOn(v => !v)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                takeProfitOn ? "bg-[#1E90FF] border-[#1E90FF]" : "border-[#D1D5DB] bg-white"
              }`}
            >
              {takeProfitOn && <span className="text-white text-xs font-bold">✓</span>}
            </button>
            <span className="flex-1 text-sm font-bold text-[#1A1A1A]">Take profit</span>
            <Info className="w-4 h-4 text-[#9CA3AF]" />
          </div>
          {takeProfitOn && (
            <div className="px-4 pb-3">
              <input
                type="number"
                value={takeProfit}
                onChange={e => setTakeProfit(e.target.value)}
                placeholder="Enter take profit amount"
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#1E90FF] bg-[#F4F6FA]"
                min={0}
                step={0.01}
              />
            </div>
          )}
        </div>

        {/* Max payout */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
          <span className="text-sm text-[#9CA3AF]">Max. payout</span>
          <span className="text-sm font-bold text-[#1A1A1A] underline underline-offset-2">
            {Number(maxPayout) > 6000 ? "6,000.00" : parseFloat(maxPayout).toFixed(2)} USD
          </span>
        </div>

        {/* Max ticks */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
          <span className="text-sm text-[#9CA3AF]">Max. ticks</span>
          <span className="text-sm font-bold text-[#1A1A1A] underline underline-offset-2">{maxTicks} ticks</span>
        </div>

        {/* Buy button */}
        <div className="p-0">
          <button
            onClick={handleBuy}
            className="w-full h-14 bg-[#1E90FF] hover:bg-[#1a7fe0] active:bg-[#1670c8] text-white font-bold text-base flex items-center justify-center gap-2 transition-colors rounded-b-2xl"
          >
            <TrendingUp className="w-5 h-5" />
            {buyStatus ?? "Buy"}
          </button>
        </div>
      </div>
    </div>
  );
}
