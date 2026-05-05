import { useState, useEffect, useRef, useCallback } from "react";
import {
  TrendingUp, BarChart2, Zap, Hash, ArrowUpDown, Layers, CircleDot,
  Info, X, Search, Star, ChevronDown, ChevronRight, CandlestickChart,
} from "lucide-react";
import { DERIV_APP_ID } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";
import LightweightChart from "@/components/LightweightChart";
import AuthGateModal from "@/components/AuthGateModal";

const WS_URL        = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const PING_INTERVAL = 25_000;
const RETRY_DELAY   = 3_000;
const FAV_KEY       = "tradex-fav-markets";

interface Market { id: string; label: string; badge: string }
const mk = (id: string, label: string, badge: string): Market => ({ id, label, badge });

const COMMODITIES_BASKET: Market[] = [mk("WLDGOLD", "Gold Basket", "GLD")];
const FOREX_BASKET: Market[] = [
  mk("WLDAUD","AUD Basket","AUD"),mk("WLDEUR","EUR Basket","EUR"),
  mk("WLDGBP","GBP Basket","GBP"),mk("WLDUSD","USD Basket","USD"),
];
const CONTINUOUS: Market[] = [
  mk("1HZ10V","Volatility 10 (1s) Index","10"),mk("R_10","Volatility 10 Index","10"),
  mk("1HZ25V","Volatility 25 (1s) Index","25"),mk("R_25","Volatility 25 Index","25"),
  mk("1HZ50V","Volatility 50 (1s) Index","50"),mk("R_50","Volatility 50 Index","50"),
  mk("1HZ75V","Volatility 75 (1s) Index","75"),mk("R_75","Volatility 75 Index","75"),
  mk("1HZ100V","Volatility 100 (1s) Index","100"),mk("R_100","Volatility 100 Index","100"),
  mk("1HZ150V","Volatility 150 (1s) Index","150"),
  mk("1HZ200V","Volatility 200 (1s) Index","200"),
  mk("1HZ250V","Volatility 250 (1s) Index","250"),
];
const CRASH_BOOM: Market[] = [
  mk("BOOM300N","Boom 300 Index","B300"),mk("BOOM500N","Boom 500 Index","B500"),
  mk("BOOM600N","Boom 600 Index","B600"),mk("BOOM900N","Boom 900 Index","B900"),
  mk("BOOM1000N","Boom 1000 Index","B1K"),
  mk("CRASH300N","Crash 300 Index","C300"),mk("CRASH500N","Crash 500 Index","C500"),
  mk("CRASH600N","Crash 600 Index","C600"),mk("CRASH900N","Crash 900 Index","C900"),
  mk("CRASH1000N","Crash 1000 Index","C1K"),
];
const DAILY_RESET: Market[] = [mk("BRMIDX","Bear Market Index","BEAR"),mk("BULIDX","Bull Market Index","BULL")];
const JUMP: Market[] = [
  mk("JD10","Jump 10 Index","J10"),mk("JD25","Jump 25 Index","J25"),
  mk("JD50","Jump 50 Index","J50"),mk("JD75","Jump 75 Index","J75"),
  mk("JD100","Jump 100 Index","J100"),
];
const RANGE_BREAK: Market[] = [mk("RB100","Range Break 100 Index","RB100"),mk("RB200","Range Break 200 Index","RB200")];
const STEP: Market[] = [
  mk("stpRNG100","Step Index 100","S100"),mk("stpRNG200","Step Index 200","S200"),
  mk("stpRNG300","Step Index 300","S300"),mk("stpRNG400","Step Index 400","S400"),
  mk("stpRNG500","Step Index 500","S500"),
];
const MAJOR_PAIRS: Market[] = [
  mk("frxAUDJPY","AUD/JPY","AUDJPY"),mk("frxAUDUSD","AUD/USD","AUDUSD"),
  mk("frxEURAUD","EUR/AUD","EURAUD"),mk("frxEURCAD","EUR/CAD","EURCAD"),
  mk("frxEURCHF","EUR/CHF","EURCHF"),mk("frxEURGBP","EUR/GBP","EURGBP"),
  mk("frxEURJPY","EUR/JPY","EURJPY"),mk("frxEURUSD","EUR/USD","EURUSD"),
  mk("frxGBPAUD","GBP/AUD","GBPAUD"),mk("frxGBPJPY","GBP/JPY","GBPJPY"),
  mk("frxGBPUSD","GBP/USD","GBPUSD"),mk("frxUSDCAD","USD/CAD","USDCAD"),
  mk("frxUSDCHF","USD/CHF","USDCHF"),mk("frxUSDJPY","USD/JPY","USDJPY"),
];
const MINOR_PAIRS: Market[] = [
  mk("frxAUDCHF","AUD/CHF","AUDCHF"),mk("frxAUDNZD","AUD/NZD","AUDNZD"),
  mk("frxEURNZD","EUR/NZD","EURNZD"),mk("frxGBPCAD","GBP/CAD","GBPCAD"),
  mk("frxGBPCHF","GBP/CHF","GBPCHF"),mk("frxGBPNZD","GBP/NZD","GBPNZD"),
  mk("frxNZDJPY","NZD/JPY","NZDJPY"),mk("frxNZDUSD","NZD/USD","NZDUSD"),
  mk("frxUSDMXN","USD/MXN","USDMXN"),mk("frxUSDNOK","USD/NOK","USDNOK"),
  mk("frxUSDPLN","USD/PLN","USDPLN"),mk("frxUSDSEK","USD/SEK","USDSEK"),
];
const AMERICAN_INDICES: Market[] = [
  mk("SPC","US 500","US500"),mk("USTECH100","US Tech 100","NAS"),mk("DJI","Wall Street 30","DJ30"),
];
const ASIAN_INDICES: Market[] = [
  mk("AS51","Australia 200","AUS200"),mk("HSI","Hong Kong 50","HK50"),mk("N225","Japan 225","JPN225"),
];
const EUROPEAN_INDICES: Market[] = [
  mk("STOXX50E","Europe 50","EU50"),mk("CAC","France 40","FR40"),mk("GER40","Germany 40","GER40"),
  mk("AEX","Netherlands 25","NL25"),mk("SMI","Swiss 20","CH20"),mk("UK100","UK 100","UK100"),
];
const CRYPTOS: Market[] = [mk("cryBTCUSD","BTC/USD","BTC"),mk("cryETHUSD","ETH/USD","ETH")];
const METALS: Market[] = [
  mk("frxXAUAUD","Gold/AUD","XAUAUD"),mk("frxXAUUSD","Gold/USD","XAUUSD"),
  mk("frxXPDUSD","Palladium/USD","XPDUSD"),mk("frxXPTUSD","Platinum/USD","XPTUSD"),
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

interface TradeType {
  id: string; label: string; badge?: string;
  Icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const TRADE_TYPES: TradeType[] = [
  { id: "accumulators", label: "Accumulators", badge: "NEW!", Icon: TrendingUp,  category: "ACCUMULATORS" },
  { id: "call_put",     label: "Call / Put",   badge: "NEW!", Icon: BarChart2,   category: "VANILLAS" },
  { id: "turbos",       label: "Long / Short", badge: "NEW!", Icon: Zap,         category: "TURBOS" },
  { id: "multipliers",  label: "Multipliers",              Icon: ArrowUpDown,  category: "MULTIPLIERS" },
  { id: "rise_fall",    label: "Rise / Fall",              Icon: TrendingUp,   category: "UPS & DOWNS" },
  { id: "higher_lower", label: "Higher / Lower",           Icon: ArrowUpDown,  category: "UPS & DOWNS" },
  { id: "touch",        label: "Touch / No Touch",         Icon: CircleDot,    category: "TOUCH & NO TOUCH" },
  { id: "matches",      label: "Matches / Differs",        Icon: Hash,         category: "DIGITS" },
  { id: "even_odd",     label: "Even / Odd",               Icon: Hash,         category: "DIGITS" },
  { id: "over_under",   label: "Over / Under",             Icon: Layers,       category: "DIGITS" },
];

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

  const q          = query.trim().toLowerCase();
  const filtered   = q ? ALL_MARKETS.filter(m => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) : null;
  const favMarkets = ALL_MARKETS.filter(m => favIds.includes(m.id));

  const MarketRow = ({ m, color }: { m: Market; color?: string }) => (
    <button
      onClick={() => { onSelect(m); onClose(); }}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#F4F6FA] transition-colors"
    >
      <button onClick={e => toggleFav(m.id, e)} className="shrink-0">
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
      {m.id === selected.id && <span className="w-2 h-2 rounded-full bg-[#1E90FF] shrink-0" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col" style={{ height: "90vh" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] shrink-0">
          <h2 className="text-base font-bold text-[#1A1A1A]">Markets</h2>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-4 py-3 border-b border-[#E5E7EB] shrink-0">
          <div className="flex items-center gap-2 bg-[#F4F6FA] border border-[#E5E7EB] rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            <input
              autoFocus type="text" placeholder="Search markets…"
              value={query} onChange={e => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] outline-none"
            />
            {query && <button onClick={() => setQuery("")}><X className="w-4 h-4 text-[#9CA3AF]" /></button>}
          </div>
        </div>
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
              <div className="border-b border-[#E5E7EB]">
                <button
                  onClick={() => setCollapsed(c => ({ ...c, __favs: !c.__favs }))}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F4F6FA] hover:bg-[#EAECF0]"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E90FF] uppercase tracking-wide">
                    <Star className="w-3.5 h-3.5 fill-[#1E90FF]" /> Favorites
                  </div>
                  {collapsed.__favs ? <ChevronRight className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />}
                </button>
                {!collapsed.__favs && (
                  favMarkets.length === 0
                    ? <p className="text-sm text-[#9CA3AF] text-center py-5 italic">No favorites yet.</p>
                    : favMarkets.map(m => {
                        const grp = MARKET_GROUPS.find(g => g.items.some(i => i.id === m.id));
                        return <MarketRow key={m.id} m={m} color={grp?.color} />;
                      })
                )}
              </div>
              {MARKET_GROUPS.map(g => (
                <div key={g.label} className="border-b border-[#E5E7EB]">
                  <button
                    onClick={() => setCollapsed(c => ({ ...c, [g.label]: !c[g.label] }))}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F4F6FA] hover:bg-[#EAECF0]"
                  >
                    <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wide">{g.label}</span>
                    {collapsed[g.label] ? <ChevronRight className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />}
                  </button>
                  {!collapsed[g.label] && g.items.map(m => <MarketRow key={m.id} m={m} color={g.color} />)}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TradeTypesBottomSheet({ selected, onSelect, onClose }: {
  selected: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const categories = Array.from(new Set(TRADE_TYPES.map(t => t.category)));
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] shrink-0">
          <h2 className="text-base font-bold text-[#1A1A1A]">Trade Types</h2>
          <button onClick={onClose} className="p-1 text-[#6B7280] hover:text-[#1A1A1A]"><X className="w-5 h-5" /></button>
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
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${isActive ? "bg-[#E8F4FF]" : "hover:bg-[#F4F6FA]"}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-[#1E90FF]" : "bg-[#F4F6FA]"}`}>
                        <t.Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#6B7280]"}`} />
                      </div>
                      <span className={`flex-1 text-sm font-medium text-left ${isActive ? "text-[#1E90FF]" : "text-[#1A1A1A]"}`}>
                        {t.label}
                      </span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-[#1E90FF] shrink-0" />}
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

export default function ManualTraders() {
  const { isLoggedIn } = useAuth();

  const [sym, setSym]                       = useState<Market>(DEFAULT_MKT);
  const [showMarkets, setShowMarkets]       = useState(false);
  const [showTradeTypes, setShowTradeTypes] = useState(false);
  const [price, setPrice]                   = useState<number | null>(null);
  const [prevPrice, setPrevPrice]           = useState<number | null>(null);
  const [connStatus, setConnStatus]         = useState<"connecting"|"live"|"error">("connecting");

  const [tradeTypeId, setTradeTypeId]   = useState("accumulators");
  const [stake, setStake]               = useState(10);
  const [stakeInput, setStakeInput]     = useState("10");
  const [growthRate, setGrowthRate]     = useState(3);
  const [takeProfitOn, setTakeProfitOn] = useState(false);
  const [takeProfit, setTakeProfit]     = useState("");
  const [buyStatus,    setBuyStatus]    = useState<string | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const wsRef    = useRef<WebSocket | null>(null);
  const mountRef = useRef(true);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const symRef   = useRef(sym.id);
  const subIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current);  retryRef.current = null; }
    if (pingRef.current)  { clearInterval(pingRef.current);  pingRef.current  = null; }
  }, []);

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
      ws.send(JSON.stringify({ ticks_history: symRef.current, count: 10, end: "latest", style: "ticks", subscribe: 1 }));
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
      }, PING_INTERVAL);
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) { ws.onclose = null; ws.close(); clearTimers(); setConnStatus("error"); retryRef.current = setTimeout(connect, RETRY_DELAY); return; }
        if (msg.msg_type === "pong") return;
        if (msg.msg_type === "history") {
          const { prices } = msg.history as { prices: number[] };
          if (prices.length > 0) { const last = prices[prices.length - 1]; const prev = prices.length > 1 ? prices[prices.length - 2] : last; setPrice(last); setPrevPrice(prev); }
          setConnStatus("live");
          if (msg.subscription?.id) subIdRef.current = msg.subscription.id;
        }
        if (msg.msg_type === "tick") {
          if (msg.subscription?.id) subIdRef.current = msg.subscription.id;
          const quote: number = msg.tick.quote;
          setPrice(q => { setPrevPrice(q); return quote; });
          setConnStatus("live");
        }
      } catch (_) {}
    };

    ws.onerror = () => { if (mountRef.current) setConnStatus("error"); };
    ws.onclose = () => { if (!mountRef.current) return; clearTimers(); setConnStatus("error"); retryRef.current = setTimeout(connect, RETRY_DELAY); };
  }, [clearTimers]);

  useEffect(() => {
    mountRef.current = true;
    const prevId = symRef.current;
    symRef.current = sym.id;
    if (wsRef.current?.readyState === WebSocket.OPEN && subIdRef.current && prevId !== sym.id) {
      wsRef.current.send(JSON.stringify({ forget: subIdRef.current }));
    }
    setPrice(null); setPrevPrice(null); setConnStatus("connecting");
    connect();
    return () => { mountRef.current = false; clearTimers(); if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); } };
  }, [sym.id, connect, clearTimers]);

  const tradeTypeMeta = TRADE_TYPES.find(t => t.id === tradeTypeId) || TRADE_TYPES[0];
  const priceChange   = price != null && prevPrice != null ? price - prevPrice : null;
  const priceUp       = priceChange == null ? null : priceChange >= 0;
  const dp            = price != null ? (price > 100 ? 2 : price > 10 ? 4 : 5) : 2;
  const maxPayout     = (stake * 6000 / 10).toFixed(2);
  const maxTicks      = 85;

  const connDot = connStatus === "live" ? "bg-[#22C55E]" : connStatus === "error" ? "bg-[#EF4444] animate-pulse" : "bg-[#F59E0B] animate-pulse";

  const handleBuy = () => {
    if (!isLoggedIn) { setShowAuthGate(true); return; }
    const token = localStorage.getItem("deriv_token");
    if (!token) { setBuyStatus("No token — please log in"); return; }
    setBuyStatus("Placing...");
    const buyWs = new WebSocket(WS_URL);
    buyWs.onopen = () => { buyWs.send(JSON.stringify({ authorize: token })); };
    buyWs.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) { setBuyStatus(`Error: ${msg.error.message}`); buyWs.close(); return; }
        if (msg.msg_type === "authorize") {
          const tp = takeProfitOn && takeProfit ? parseFloat(takeProfit) : undefined;
          const params: Record<string, unknown> = { amount: stake, basis: "stake", contract_type: tradeTypeId === "accumulators" ? "ACCU" : tradeTypeId === "rise_fall" ? "CALL" : tradeTypeId === "multipliers" ? "MULTUP" : "CALL", currency: "USD", symbol: sym.id, growth_rate: tradeTypeId === "accumulators" ? growthRate / 100 : undefined };
          if (tp) params.limit_order = { take_profit: tp };
          buyWs.send(JSON.stringify({ proposal: 1, subscribe: 0, ...params }));
        }
        if (msg.msg_type === "proposal") { buyWs.send(JSON.stringify({ buy: msg.proposal.id, price: stake })); }
        if (msg.msg_type === "buy") { setBuyStatus(`✓ Open — #${msg.buy.contract_id}`); buyWs.close(); setTimeout(() => setBuyStatus(null), 4000); }
      } catch (_) {}
    };
    buyWs.onerror = () => { setBuyStatus("WS error"); };
  };

  const adjustStake = (delta: number) => {
    setStake(s => { const n = Math.max(1, s + delta); setStakeInput(String(n)); return n; });
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100dvh - 132px)", background: "#f2f3f4", fontFamily: "'IBM Plex Sans', 'Inter', sans-serif" }}
    >
      <AuthGateModal open={showAuthGate} onClose={() => setShowAuthGate(false)} />

      {showMarkets && (
        <MarketsBottomSheet selected={sym} onSelect={s => setSym(s)} onClose={() => setShowMarkets(false)} />
      )}

      <div className="flex-1 overflow-y-auto flex flex-col">

        {/* ── Market header ──────────────────────────────────────────── */}
        <button
          onClick={() => setShowMarkets(true)}
          className="bg-white border-b border-[#d6dadb] px-4 py-3 w-full flex items-center gap-3 text-left shrink-0 active:bg-[#f2f3f4] transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-[#f2f3f4] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#333]">{sym.badge.slice(0, 4)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#999] truncate">{sym.label}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {price != null ? (
                <>
                  <span className={`text-xl font-bold font-mono tracking-tight leading-none ${priceUp === false ? "text-[#ec3f3f]" : "text-[#4bb4b3]"}`}>
                    {price.toFixed(dp)}
                  </span>
                  {priceChange != null && (
                    <span className={`text-xs font-medium ${priceUp === false ? "text-[#ec3f3f]" : "text-[#4bb4b3]"}`}>
                      {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(dp)} {priceUp === false ? "▼" : "▲"}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-[#999]">Connecting…</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${connDot}`} />
            <span className="text-[11px] font-semibold text-[#999] uppercase tracking-wide">Live</span>
            <ChevronDown className="w-4 h-4 text-[#999]" />
          </div>
        </button>

        {/* ── Chart ──────────────────────────────────────────────────── */}
        <div style={{ height: 260, background: "#0f172a" }} className="shrink-0">
          <LightweightChart symbol={sym.id} tradingMode />
        </div>

        {/* ── Trade panel ────────────────────────────────────────────── */}
        <div className="bg-white flex-1 flex flex-col min-h-0">

          {/* Trade type pills — horizontal scroll */}
          <div className="overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
            <div className="flex px-3 pt-2 gap-0.5 w-max border-b border-[#f2f3f4]">
              {TRADE_TYPES.map(t => {
                const active = tradeTypeId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTradeTypeId(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                      active ? "border-[#4bb4b3] text-[#4bb4b3]" : "border-transparent text-[#999] hover:text-[#333]"
                    }`}
                  >
                    <t.Icon className="w-3.5 h-3.5 shrink-0" />
                    {t.label}
                    {t.badge && (
                      <span className="px-1 py-0.5 text-[8px] font-bold bg-[#4bb4b3] text-white rounded-sm leading-none">NEW</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Growth rate (accumulators only) */}
          {tradeTypeId === "accumulators" && (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f2f3f4] shrink-0">
              <span className="text-xs font-semibold text-[#999] w-24 shrink-0">Growth rate</span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    onClick={() => setGrowthRate(r)}
                    className={`w-10 h-8 text-xs font-bold rounded-lg transition-colors ${
                      growthRate === r ? "bg-[#4bb4b3] text-white" : "bg-[#f2f3f4] text-[#333] hover:bg-[#d6dadb]"
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duration */}
          <div className="flex items-center px-4 py-3 border-b border-[#f2f3f4] gap-3 shrink-0">
            <span className="text-xs font-semibold text-[#999] w-24 shrink-0">Duration</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={5}
                min={1}
                max={10}
                className="w-16 text-center text-sm font-bold text-[#333] border border-[#d6dadb] rounded-lg py-2 outline-none focus:border-[#4bb4b3] bg-white"
              />
              <span className="text-sm font-medium text-[#333]">Ticks</span>
            </div>
          </div>

          {/* Stake */}
          <div className="flex items-center px-4 py-3 border-b border-[#f2f3f4] gap-3 shrink-0">
            <span className="text-xs font-semibold text-[#999] w-24 shrink-0">Stake</span>
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={() => adjustStake(-1)}
                className="w-8 h-8 rounded-full border border-[#d6dadb] flex items-center justify-center text-lg font-bold text-[#333] hover:bg-[#f2f3f4] active:bg-[#d6dadb] transition-colors shrink-0"
              >−</button>
              <input
                type="number"
                value={stakeInput}
                onChange={e => { setStakeInput(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 1) setStake(n); }}
                onBlur={() => { const n = parseFloat(stakeInput); if (isNaN(n) || n < 1) { setStake(1); setStakeInput("1"); } else { setStake(n); setStakeInput(String(n)); } }}
                className="flex-1 text-center text-lg font-bold text-[#333] border border-[#d6dadb] rounded-lg py-1.5 outline-none focus:border-[#4bb4b3] bg-white"
                min={1} step={1}
              />
              <button
                onClick={() => adjustStake(1)}
                className="w-8 h-8 rounded-full border border-[#d6dadb] flex items-center justify-center text-lg font-bold text-[#333] hover:bg-[#f2f3f4] active:bg-[#d6dadb] transition-colors shrink-0"
              >+</button>
              <span className="text-sm font-medium text-[#999] shrink-0">USD</span>
            </div>
          </div>

          {/* Take profit toggle */}
          <div className="border-b border-[#f2f3f4] shrink-0">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setTakeProfitOn(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${takeProfitOn ? "bg-[#4bb4b3]" : "bg-[#d6dadb]"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${takeProfitOn ? "translate-x-5" : "translate-x-1"}`} />
              </button>
              <span className="flex-1 text-sm font-medium text-[#333]">Take profit</span>
              <Info className="w-4 h-4 text-[#999]" />
            </div>
            {takeProfitOn && (
              <div className="px-4 pb-3">
                <div className="flex items-center border border-[#d6dadb] rounded-lg overflow-hidden focus-within:border-[#4bb4b3] transition-colors">
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={e => setTakeProfit(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-3 py-2.5 text-sm text-[#333] outline-none bg-white"
                    min={0} step={0.01}
                  />
                  <span className="px-3 text-sm font-medium text-[#999] border-l border-[#d6dadb] bg-[#f2f3f4] py-2.5">USD</span>
                </div>
              </div>
            )}
          </div>

          {/* Payout stats */}
          <div className="flex items-center px-4 py-3 gap-8 border-b border-[#f2f3f4] shrink-0">
            <div>
              <div className="text-[10px] text-[#999] uppercase tracking-wide font-medium">Max. payout</div>
              <div className="text-sm font-bold text-[#333]">
                {Number(maxPayout) > 6000 ? "6,000.00" : parseFloat(maxPayout).toFixed(2)} USD
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#999] uppercase tracking-wide font-medium">Max. ticks</div>
              <div className="text-sm font-bold text-[#333]">{maxTicks} ticks</div>
            </div>
            {buyStatus && (
              <div className="ml-auto text-xs font-semibold text-[#4bb4b3]">{buyStatus}</div>
            )}
          </div>

          {/* Buy buttons */}
          {["accumulators", "multipliers"].includes(tradeTypeId) ? (
            <button
              onClick={handleBuy}
              className="w-full h-14 flex items-center justify-center gap-2 font-bold text-base text-white transition-colors shrink-0"
              style={{ background: "#4bb4b3" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#3d9494")}
              onMouseLeave={e => (e.currentTarget.style.background = "#4bb4b3")}
            >
              <TrendingUp className="w-5 h-5" />
              {buyStatus ?? "Buy"}
            </button>
          ) : (
            <div className="flex shrink-0">
              <button
                onClick={handleBuy}
                className="flex-1 h-14 text-white font-bold text-sm flex flex-col items-center justify-center gap-0.5 transition-colors"
                style={{ background: "#4bb4b3" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#3d9494")}
                onMouseLeave={e => (e.currentTarget.style.background = "#4bb4b3")}
              >
                <span className="text-base leading-none">▲</span>
                <span>
                  {tradeTypeId === "even_odd" ? "Even" :
                   tradeTypeId === "over_under" ? "Over" :
                   tradeTypeId === "matches" ? "Match" :
                   tradeTypeId === "touch" ? "Touch" :
                   tradeTypeId === "higher_lower" ? "Higher" : "Rise"}
                </span>
              </button>
              <button
                onClick={handleBuy}
                className="flex-1 h-14 text-white font-bold text-sm flex flex-col items-center justify-center gap-0.5 transition-colors border-l border-white/20"
                style={{ background: "#ec3f3f" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#cc2e3d")}
                onMouseLeave={e => (e.currentTarget.style.background = "#ec3f3f")}
              >
                <span className="text-base leading-none">▼</span>
                <span>
                  {tradeTypeId === "even_odd" ? "Odd" :
                   tradeTypeId === "over_under" ? "Under" :
                   tradeTypeId === "matches" ? "Differ" :
                   tradeTypeId === "touch" ? "No Touch" :
                   tradeTypeId === "higher_lower" ? "Lower" : "Fall"}
                </span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
