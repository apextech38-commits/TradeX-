import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import {
  BarChart2, TrendingUp, Info, AlertTriangle, X, Search,
  Star, ChevronDown, ChevronRight, Zap, Hash, ArrowUpDown,
  Layers, CircleDot,
} from "lucide-react";
import { DERIV_APP_ID, OAUTH_APP_ID } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";

const WS_URL        = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const PING_INTERVAL = 25_000;
const RETRY_DELAY   = 3_000;
const MAX_TICKS     = 120;
const MIN_STAKE     = 0.35;
const STAKE_STEP    = 1;
const REDIRECT_URI  = "https://dev-utility-hub--apexricky20.replit.app/callback";
const LOGIN_URL     = `https://oauth.deriv.com/oauth2/authorize?app_id=${OAUTH_APP_ID}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
const FAV_KEY       = "tradex-fav-markets";

// ── Market definitions ─────────────────────────────────────────────────────────
interface Market { id: string; label: string; badge: string }

const CONTINUOUS: Market[] = [
  { id: "1HZ10V",  label: "Volatility 10 (1s) Index",  badge: "10" },
  { id: "R_10",    label: "Volatility 10 Index",        badge: "10" },
  { id: "1HZ15V",  label: "Volatility 15 (1s) Index",  badge: "15" },
  { id: "1HZ25V",  label: "Volatility 25 (1s) Index",  badge: "25" },
  { id: "R_25",    label: "Volatility 25 Index",        badge: "25" },
  { id: "1HZ30V",  label: "Volatility 30 (1s) Index",  badge: "30" },
  { id: "1HZ50V",  label: "Volatility 50 (1s) Index",  badge: "50" },
  { id: "R_50",    label: "Volatility 50 Index",        badge: "50" },
  { id: "1HZ75V",  label: "Volatility 75 (1s) Index",  badge: "75" },
  { id: "R_75",    label: "Volatility 75 Index",        badge: "75" },
  { id: "1HZ90V",  label: "Volatility 90 (1s) Index",  badge: "90" },
  { id: "1HZ100V", label: "Volatility 100 (1s) Index", badge: "100" },
  { id: "R_100",   label: "Volatility 100 Index",       badge: "100" },
];

const CRASH_BOOM: Market[] = [
  { id: "BOOM50N",    label: "Boom 50 Index",     badge: "B50"  },
  { id: "BOOM150N",   label: "Boom 150 Index",    badge: "B150" },
  { id: "BOOM300N",   label: "Boom 300 Index",    badge: "B300" },
  { id: "BOOM500N",   label: "Boom 500 Index",    badge: "B500" },
  { id: "BOOM600N",   label: "Boom 600 Index",    badge: "B600" },
  { id: "BOOM900N",   label: "Boom 900 Index",    badge: "B900" },
  { id: "BOOM1000N",  label: "Boom 1000 Index",   badge: "B1K"  },
  { id: "CRASH50N",   label: "Crash 50 Index",    badge: "C50"  },
  { id: "CRASH300N",  label: "Crash 300 Index",   badge: "C300" },
  { id: "CRASH500N",  label: "Crash 500 Index",   badge: "C500" },
  { id: "CRASH600N",  label: "Crash 600 Index",   badge: "C600" },
  { id: "CRASH900N",  label: "Crash 900 Index",   badge: "C900" },
  { id: "CRASH1000N", label: "Crash 1000 Index",  badge: "C1K"  },
];

const DAILY_RESET: Market[] = [
  { id: "BRMIDX", label: "Bear Market Index", badge: "BEAR" },
  { id: "BULIDX", label: "Bull Market Index", badge: "BULL" },
];

const JUMP: Market[] = [
  { id: "JD10",  label: "Jump 10 Index",  badge: "J10"  },
  { id: "JD25",  label: "Jump 25 Index",  badge: "J25"  },
  { id: "JD50",  label: "Jump 50 Index",  badge: "J50"  },
  { id: "JD75",  label: "Jump 75 Index",  badge: "J75"  },
  { id: "JD100", label: "Jump 100 Index", badge: "J100" },
];

const STEP: Market[] = [
  { id: "stpRNG100", label: "Step Index 100", badge: "S100" },
  { id: "stpRNG200", label: "Step Index 200", badge: "S200" },
  { id: "stpRNG300", label: "Step Index 300", badge: "S300" },
  { id: "stpRNG400", label: "Step Index 400", badge: "S400" },
  { id: "stpRNG500", label: "Step Index 500", badge: "S500" },
];

const RANGE_BREAK: Market[] = [
  { id: "RB100", label: "Range Break 100 Index", badge: "RB100" },
  { id: "RB200", label: "Range Break 200 Index", badge: "RB200" },
];

const MARKET_GROUPS = [
  {
    label: "Synthetics",
    subGroups: [
      { label: "Continuous Indices",  items: CONTINUOUS   },
      { label: "Crash/Boom Indices",  items: CRASH_BOOM   },
      { label: "Daily Reset Indices", items: DAILY_RESET  },
      { label: "Jump Indices",        items: JUMP         },
      { label: "Step Indices",        items: STEP         },
      { label: "Range Break Indices", items: RANGE_BREAK  },
    ],
    collapsible: false,
  },
  { label: "FX",             subGroups: [], collapsible: true },
  { label: "Stock Indices",  subGroups: [], collapsible: true },
  { label: "Cryptocurrencies",subGroups:[],collapsible: true },
  { label: "Commodities",    subGroups: [], collapsible: true },
];

// ── Trade type definitions ─────────────────────────────────────────────────────
const TRADE_TYPES = [
  {
    id: "accumulators",
    label: "Accumulators",
    badge: "NEW!",
    Icon: TrendingUp,
    sub: null,
  },
  {
    id: "vanillas",
    label: "Vanillas",
    badge: "NEW!",
    Icon: BarChart2,
    sub: "Call / Put",
  },
  {
    id: "turbos",
    label: "Turbos",
    badge: "NEW!",
    Icon: Zap,
    sub: "Long / Short",
  },
  {
    id: "multipliers",
    label: "Multipliers",
    badge: null,
    Icon: Layers,
    sub: "Multipliers",
  },
  {
    id: "ups_downs",
    label: "Ups & Downs",
    badge: null,
    Icon: ArrowUpDown,
    sub: "Rise/Fall · Higher/Lower",
  },
  {
    id: "touch",
    label: "Touch & No Touch",
    badge: null,
    Icon: CircleDot,
    sub: "Touch / No Touch",
  },
  {
    id: "digits",
    label: "Digits",
    badge: null,
    Icon: Hash,
    sub: "Matches/Differs · Even/Odd · Over/Under",
  },
];

type Tick = { time: string; value: number };

// ── SVG price box label ────────────────────────────────────────────────────────
const PriceBoxLabel = (props: any) => {
  const { viewBox, displayValue } = props;
  if (!viewBox) return null;
  const { x, y, width } = viewBox;
  const bx = x + width + 4;
  return (
    <g>
      <rect x={bx} y={y - 10} width={70} height={20} rx={3} fill="#111827" />
      <text x={bx + 35} y={y + 5} textAnchor="middle" fill="#fff"
        fontSize={11} fontWeight="bold" fontFamily="monospace">
        {displayValue}
      </text>
    </g>
  );
};

// ── Generic modal shell ────────────────────────────────────────────────────────
function Modal({
  title, onClose, children, fullscreen = false,
}: {
  title: string; onClose: () => void;
  children: React.ReactNode; fullscreen?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden
        ${fullscreen ? "w-full max-w-lg h-[85vh]" : "w-full max-w-sm p-6 space-y-4"}`}>
        <div className={`flex items-center justify-between flex-shrink-0 ${fullscreen ? "px-5 py-4 border-b border-border" : ""}`}>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Markets Modal ──────────────────────────────────────────────────────────────
function MarketsModal({
  onClose, selected, onSelect,
}: { onClose: () => void; selected: Market; onSelect: (m: Market) => void }) {
  const [query, setQuery]       = useState("");
  const [favs, setFavs]         = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    FX: true, "Stock Indices": true, Cryptocurrencies: true, Commodities: true,
  });

  const toggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavs(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  };

  const allMarkets = [
    ...CONTINUOUS, ...CRASH_BOOM, ...DAILY_RESET,
    ...JUMP, ...STEP, ...RANGE_BREAK,
  ];
  const filtered = query.trim()
    ? allMarkets.filter(m => m.label.toLowerCase().includes(query.toLowerCase()))
    : null;

  const favMarkets = allMarkets.filter(m => favs.includes(m.id));

  const MarketRow = ({ m }: { m: Market }) => (
    <button
      onClick={() => { onSelect(m); onClose(); }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left ${
        m.id === selected.id ? "bg-primary/8 text-primary font-semibold" : "text-foreground"
      }`}
    >
      <span onClick={e => toggleFav(m.id, e)} className="flex-shrink-0">
        <Star className={`w-4 h-4 transition-colors ${favs.includes(m.id)
          ? "text-[#FACC15] fill-[#FACC15]" : "text-muted-foreground hover:text-[#FACC15]"}`} />
      </span>
      <div className="w-9 h-7 rounded bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground border border-border flex-shrink-0">
        {m.badge}
      </div>
      <span className="truncate">{m.label}</span>
      {m.id === selected.id && <span className="ml-auto w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
    </button>
  );

  return (
    <Modal title="Select Market" onClose={onClose} fullscreen>
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
      <div className="overflow-y-auto flex-1 pb-4">
        {/* Search results */}
        {filtered ? (
          <div>
            <div className="px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide border-b border-border">
              Results ({filtered.length})
            </div>
            {filtered.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-8">No markets found</p>
              : filtered.map(m => <MarketRow key={m.id} m={m} />)
            }
          </div>
        ) : (
          <>
            {/* Favourites */}
            {favMarkets.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-[#FACC15] font-semibold uppercase tracking-wide border-b border-border bg-[#FACC15]/5">
                  <Star className="w-3.5 h-3.5 fill-[#FACC15]" />
                  Favourites
                </div>
                {favMarkets.map(m => <MarketRow key={m.id} m={m} />)}
              </div>
            )}

            {/* Synthetics → sub-groups */}
            <div>
              <div className="px-4 py-2.5 text-xs font-bold text-foreground uppercase tracking-wide border-b border-border bg-secondary/40">
                Synthetics
              </div>
              {MARKET_GROUPS[0].subGroups.map(sg => (
                <div key={sg.label}>
                  <div className="px-4 py-2 text-xs text-muted-foreground font-semibold uppercase tracking-wide bg-secondary/20 border-b border-border/50">
                    {sg.label}
                  </div>
                  {sg.items.map(m => <MarketRow key={m.id} m={m} />)}
                </div>
              ))}
            </div>

            {/* Collapsible groups */}
            {["FX", "Stock Indices", "Cryptocurrencies", "Commodities"].map(cat => (
              <div key={cat}>
                <button
                  onClick={() => setCollapsed(c => ({ ...c, [cat]: !c[cat] }))}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-foreground uppercase tracking-wide border-b border-border bg-secondary/40 hover:bg-secondary/60 transition-colors"
                >
                  {cat}
                  {collapsed[cat]
                    ? <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  }
                </button>
                {!collapsed[cat] && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No markets available
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Trade Types Modal ──────────────────────────────────────────────────────────
function TradeTypesModal({
  onClose, selected, onSelect,
}: { onClose: () => void; selected: string; onSelect: (id: string) => void }) {
  return (
    <Modal title="Trade Types" onClose={onClose} fullscreen>
      <div className="overflow-y-auto flex-1 py-2">
        {TRADE_TYPES.map(tt => {
          const { id, label, badge, Icon, sub } = tt;
          const active = id === selected;
          return (
            <button
              key={id}
              onClick={() => { onSelect(id); onClose(); }}
              className={`w-full flex items-center gap-4 px-5 py-4 border-b border-border/60 transition-colors text-left hover:bg-secondary/50 ${
                active ? "bg-primary/8" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                active ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                    {label}
                  </span>
                  {badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                      {badge}
                    </span>
                  )}
                </div>
                {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
              </div>
              {active && <span className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ── Risk Calculator Modal ──────────────────────────────────────────────────────
function RiskCalcModal({ onClose, symId, currency }: {
  onClose: () => void; symId: string; currency: string;
}) {
  const [rStake, setRStake]   = useState(10);
  const [rGrowth, setRGrowth] = useState(3);
  const [rPayout, setRPayout] = useState<string | null>(null);
  const [rTicks,  setRTicks]  = useState<string>("6,000");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({
      proposal: 1, amount: rStake, basis: "stake",
      contract_type: "ACCU", currency: "USD",
      growth_rate: rGrowth / 100, symbol: symId,
    }));
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.msg_type === "proposal" && msg.proposal) {
          const p = msg.proposal;
          setRPayout(p.payout != null ? p.payout.toFixed(2) : p.display_value ?? null);
          setRTicks(p.limit_order?.take_profit?.order_amount != null
            ? String(p.limit_order.take_profit.order_amount) : "6,000");
        }
      } catch (_) {}
    };
    return () => { if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); } };
  }, [rStake, rGrowth, symId]);

  return (
    <Modal title="Risk Calculator" onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">Stake ({currency})</label>
          <input type="number" min={MIN_STAKE} step={STAKE_STEP} value={rStake}
            onChange={e => setRStake(Math.max(MIN_STAKE, +e.target.value || MIN_STAKE))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground font-medium">Growth rate</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(r => (
              <button key={r} onClick={() => setRGrowth(r)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                  rGrowth === r
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                }`}>
                {r}%
              </button>
            ))}
          </div>
        </div>
        <div className="bg-secondary/50 rounded-xl p-4 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Max. payout</span>
            <span className="font-semibold text-foreground">{rPayout ?? "—"} {currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Max. ticks</span>
            <span className="font-semibold text-foreground">{rTicks}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Learn Modal ────────────────────────────────────────────────────────────────
function LearnModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="About Accumulators" onClose={onClose}>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
        <p className="text-foreground font-medium">
          An Accumulator contract lets your stake grow at a fixed rate as long as the
          price stays within the set range.
        </p>
        <ul className="space-y-2 list-disc pl-4">
          <li>Choose a <strong className="text-foreground">growth rate</strong> (1%–5%) — higher rates mean tighter barriers and higher risk.</li>
          <li>Each tick the price stays inside the barrier, your payout <strong className="text-foreground">grows by that rate</strong>.</li>
          <li>If the price breaks the barrier, <strong className="text-foreground">you lose your stake</strong>.</li>
          <li>You can close the contract at any time to collect your accumulated payout.</li>
        </ul>
        <div className="bg-[#FACC15]/10 border border-[#FACC15]/30 rounded-lg px-3 py-2 text-xs text-[#FACC15]">
          ⚠ Accumulators are high-risk instruments. Only trade with funds you can afford to lose.
        </div>
      </div>
    </Modal>
  );
}

// ── "Coming soon" panel for non-Accumulator trade types ───────────────────────
function ComingSoonPanel({ tradeType }: { tradeType: string }) {
  const tt = TRADE_TYPES.find(t => t.id === tradeType);
  if (!tt) return null;
  const { Icon, label, sub } = tt;
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center border border-border">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <div className="text-base font-bold text-foreground">{label}</div>
        {sub && <div className="text-sm text-muted-foreground mt-1">{sub}</div>}
      </div>
      <div className="px-4 py-2 bg-secondary/50 rounded-lg text-sm text-muted-foreground border border-border">
        This trade type is coming soon
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const DEFAULT_MARKET = CONTINUOUS[0]; // Volatility 10 (1s)

export default function ManualTraders() {
  const { isLoggedIn, currency, sendWS } = useAuth();

  const [sym, setSym]               = useState<Market>(DEFAULT_MARKET);
  const [showMarketsModal, setMarketsModal] = useState(false);
  const [showTradeTypes,   setTradeTypes]   = useState(false);
  const [tradeType,        setTradeType]    = useState("accumulators");

  const [ticks, setTicks]         = useState<Tick[]>([]);
  const [price, setPrice]         = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  const [growthRate, setGrowthRate]       = useState(3);
  const [stake, setStake]                 = useState(10);
  const [takeProfit, setTakeProfit]       = useState(false);
  const [takeProfitAmt, setTakeProfitAmt] = useState(10);
  const [maxPayout, setMaxPayout]         = useState<string | null>(null);
  const [maxTicks, setMaxTicks]           = useState<string>("6,000");

  const [showRiskCalc, setShowRiskCalc] = useState(false);
  const [showLearn, setShowLearn]       = useState(false);

  const [gmt, setGmt] = useState(() => new Date().toUTCString().slice(0, -3) + "GMT");
  useEffect(() => {
    const id = setInterval(() => setGmt(new Date().toUTCString().slice(0, -3) + "GMT"), 1_000);
    return () => clearInterval(id);
  }, []);

  // ── Tick WebSocket ──────────────────────────────────────────────────────────
  const wsRef    = useRef<WebSocket | null>(null);
  const mountRef = useRef(true);
  const retryRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const histRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const pingRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const symRef   = useRef(sym.id);

  const clearTimers = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current);  retryRef.current = null; }
    if (histRef.current)  { clearTimeout(histRef.current);   histRef.current  = null; }
    if (pingRef.current)  { clearInterval(pingRef.current);  pingRef.current  = null; }
  }, []);

  const connect = useCallback(() => {
    if (!mountRef.current) return;
    clearTimers();
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      if (!mountRef.current) return;
      ws.send(JSON.stringify({
        ticks_history: symRef.current, count: MAX_TICKS,
        end: "latest", start: 1, style: "ticks", subscribe: 1,
      }));
      histRef.current = setTimeout(() => {
        if (!mountRef.current) return;
        ws.onclose = null; ws.close();
        retryRef.current = setTimeout(connect, RETRY_DELAY);
      }, 10_000);
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
          retryRef.current = setTimeout(connect, RETRY_DELAY); return;
        }
        if (msg.msg_type === "pong") return;
        if (msg.msg_type === "history") {
          if (histRef.current) { clearTimeout(histRef.current); histRef.current = null; }
          const { prices, times } = msg.history as { prices: number[]; times: number[] };
          setTicks(times.map((t, i) => ({
            time: new Date(t * 1000).toLocaleTimeString("en-GB", {
              hour: "2-digit", minute: "2-digit", second: "2-digit",
            }),
            value: prices[i],
          })));
          if (prices.length > 0) {
            setPrice(prices[prices.length - 1]);
            setPrevPrice(prices.length > 1 ? prices[prices.length - 2] : prices[prices.length - 1]);
          }
          setConnected(true);
        }
        if (msg.msg_type === "tick") {
          const quote: number = msg.tick.quote;
          const epoch: number = msg.tick.epoch;
          setPrice(q => { setPrevPrice(q); return quote; });
          setTicks(prev => {
            const next = [...prev, {
              time: new Date(epoch * 1000).toLocaleTimeString("en-GB", {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              }),
              value: quote,
            }];
            return next.length > MAX_TICKS ? next.slice(-MAX_TICKS) : next;
          });
          setConnected(true);
        }
      } catch (_) {}
    };
    ws.onerror  = () => { if (mountRef.current) setConnected(false); };
    ws.onclose  = () => {
      if (!mountRef.current) return;
      clearTimers(); setConnected(false);
      retryRef.current = setTimeout(connect, RETRY_DELAY);
    };
  }, [clearTimers]);

  useEffect(() => {
    mountRef.current = true;
    symRef.current   = sym.id;
    setTicks([]); setPrice(null); setPrevPrice(null); setConnected(false);
    connect();
    return () => {
      mountRef.current = false;
      clearTimers();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [sym.id, connect, clearTimers]);

  // ── Proposal WebSocket ──────────────────────────────────────────────────────
  const wsPropRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (tradeType !== "accumulators") return;
    if (wsPropRef.current) { wsPropRef.current.onclose = null; wsPropRef.current.close(); }
    const ws = new WebSocket(WS_URL);
    wsPropRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({
      proposal: 1, amount: stake, basis: "stake",
      contract_type: "ACCU", currency: "USD",
      growth_rate: growthRate / 100, symbol: sym.id,
    }));
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.msg_type === "proposal" && msg.proposal) {
          const p = msg.proposal;
          setMaxPayout(p.payout != null ? p.payout.toFixed(2) : p.display_value ?? null);
          setMaxTicks(p.limit_order?.take_profit?.order_amount != null
            ? String(p.limit_order.take_profit.order_amount) : "6,000");
        }
      } catch (_) {}
    };
    return () => {
      if (wsPropRef.current) { wsPropRef.current.onclose = null; wsPropRef.current.close(); }
    };
  }, [stake, growthRate, sym.id, tradeType]);

  // ── Derived chart values ────────────────────────────────────────────────────
  // Band formula: price × (growthRate/100) × 0.1
  const delta     = price != null ? price * (growthRate / 100) * 0.1 : 0;
  const upperBand = price != null ? price + delta : null;
  const lowerBand = price != null ? price - delta : null;
  const priceChange = price != null && prevPrice != null ? price - prevPrice : null;
  const priceUp     = priceChange == null ? null : priceChange >= 0;

  const values = ticks.map(t => t.value);
  const minV   = values.length ? Math.min(...values) : 0;
  const maxV   = values.length ? Math.max(...values) : 0;
  const pad    = ((maxV - minV) * 0.2) || 1;

  const tradeTypeMeta = TRADE_TYPES.find(t => t.id === tradeType);

  // ── BUY ────────────────────────────────────────────────────────────────────
  const handleBuy = () => {
    if (!isLoggedIn) { window.location.href = LOGIN_URL; return; }
    sendWS({
      buy: "1", price: stake,
      parameters: {
        amount: stake, basis: "stake", contract_type: "ACCU",
        currency, growth_rate: growthRate / 100, symbol: sym.id,
      },
    });
  };

  const dec = () => setStake(s => +(Math.max(MIN_STAKE, s - STAKE_STEP)).toFixed(2));
  const inc = () => setStake(s => +(s + STAKE_STEP).toFixed(2));

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-background pb-6">

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showMarketsModal && (
        <MarketsModal
          selected={sym}
          onSelect={m => { setSym(m); }}
          onClose={() => setMarketsModal(false)}
        />
      )}
      {showTradeTypes && (
        <TradeTypesModal
          selected={tradeType}
          onSelect={setTradeType}
          onClose={() => setTradeTypes(false)}
        />
      )}
      {showRiskCalc && (
        <RiskCalcModal onClose={() => setShowRiskCalc(false)} symId={sym.id} currency={currency} />
      )}
      {showLearn && <LearnModal onClose={() => setShowLearn(false)} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-wrap gap-3">

        {/* Market selector → opens full modal */}
        <button
          onClick={() => setMarketsModal(true)}
          className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3.5 py-2.5 hover:border-primary/60 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-[#EF4444]" : "bg-muted-foreground animate-pulse"}`} />
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-foreground border border-border">
              {sym.badge}
            </div>
            <BarChart2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-sm font-semibold text-foreground leading-tight truncate max-w-[180px]">
              {sym.label}
            </div>
            {price != null ? (
              <div className={`text-xs font-mono flex items-center gap-1 mt-0.5 ${priceUp === false ? "text-[#EF4444]" : "text-[#22C55E]"}`}>
                <span>{price.toFixed(2)}</span>
                {priceChange != null && prevPrice != null && (
                  <span>
                    {priceUp ? "▲" : "▼"}{" "}
                    {Math.abs(priceChange).toFixed(2)}{" "}
                    ({Math.abs(priceChange / prevPrice * 100).toFixed(2)}%)
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-0.5">Connecting…</div>
            )}
          </div>
          <span className="text-muted-foreground text-[10px] ml-0.5">▼</span>
        </button>

        {/* Risk Calculator */}
        <button
          onClick={() => setShowRiskCalc(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm flex-shrink-0"
        >
          Risk Calculator
        </button>
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div className="px-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          {ticks.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-muted-foreground text-sm gap-2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Connecting to live feed…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={ticks} margin={{ top: 20, right: 86, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#9CA3AF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#9CA3AF" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis
                  domain={[minV - pad, maxV + pad]}
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false} tickLine={false} width={58}
                  tickFormatter={(v: number) => v.toFixed(2)}
                />

                {/* Accumulator bands: price ± price×(growth/100)×0.1 */}
                {upperBand != null && lowerBand != null && tradeType === "accumulators" && (
                  <>
                    <ReferenceArea y1={lowerBand} y2={upperBand} fill="#3B82F6" fillOpacity={0.12} />
                    <ReferenceLine y={upperBand} stroke="#3B82F6" strokeDasharray="3 3" strokeWidth={1}
                      label={{ value: `+${delta.toFixed(4)}`, position: "insideTopRight",
                        fill: "#3B82F6", fontSize: 10, fontWeight: "bold" }} />
                    <ReferenceLine y={lowerBand} stroke="#3B82F6" strokeDasharray="3 3" strokeWidth={1}
                      label={{ value: `-${delta.toFixed(4)}`, position: "insideBottomRight",
                        fill: "#3B82F6", fontSize: 10, fontWeight: "bold" }} />
                  </>
                )}

                {/* Current price dotted line */}
                {price != null && (
                  <ReferenceLine y={price} stroke="#374151" strokeDasharray="5 3" strokeWidth={1.5}
                    label={<PriceBoxLabel displayValue={price.toFixed(2)} />} />
                )}

                <Area type="linear" dataKey="value" stroke="#6B7280" strokeWidth={1.5}
                  fill="url(#areaFill)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Trade panel ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 max-w-xl mx-auto w-full space-y-3">
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">

          {/* Learn link */}
          <button
            onClick={() => setShowLearn(true)}
            className="w-full flex items-center gap-2 px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors text-left"
          >
            <BarChart2 className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm text-primary font-medium">Learn about this trade type</span>
          </button>

          {/* Trade type row → opens trade types modal */}
          <button
            onClick={() => setTradeTypes(true)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {tradeTypeMeta && <tradeTypeMeta.Icon className="w-4 h-4 text-muted-foreground" />}
              <span className="text-sm font-semibold text-foreground">{tradeTypeMeta?.label ?? "Accumulators"}</span>
              {tradeTypeMeta?.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                  {tradeTypeMeta.badge}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              {tradeType === "accumulators" && (
                <span className="font-semibold text-foreground">{growthRate}%</span>
              )}
              <span className="text-muted-foreground text-base">›</span>
            </div>
          </button>

          {/* Accumulator-specific controls */}
          {tradeType === "accumulators" ? (
            <>
              {/* Growth rate */}
              <div className="px-4 pt-3 pb-4 border-b border-border">
                <div className="text-xs text-muted-foreground mb-2.5 font-medium uppercase tracking-wide">
                  Growth rate
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} onClick={() => setGrowthRate(r)}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                        growthRate === r
                          ? "bg-foreground text-background border-foreground shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                      }`}>
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <button onClick={dec}
                  className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-secondary text-xl font-bold transition-colors flex-shrink-0">
                  −
                </button>
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-foreground">{stake}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Stake</div>
                </div>
                <button onClick={inc}
                  className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-secondary text-xl font-bold transition-colors flex-shrink-0">
                  +
                </button>
              </div>

              {/* Take profit */}
              <div className="border-b border-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={takeProfit}
                      onChange={e => setTakeProfit(e.target.checked)}
                      className="w-4 h-4 accent-primary" />
                    <span className="text-sm text-foreground">Take profit</span>
                  </label>
                  <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
                {takeProfit && (
                  <div className="px-4 pb-3 space-y-1.5">
                    <div className="text-xs text-muted-foreground font-medium">Take profit amount ({currency})</div>
                    <div className="flex items-center gap-2 border border-border rounded-lg overflow-hidden bg-background">
                      <button onClick={() => setTakeProfitAmt(a => Math.max(1, +(a - 1).toFixed(2)))}
                        className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-lg font-bold">−</button>
                      <input type="number" min={1} step={1} value={takeProfitAmt}
                        onChange={e => setTakeProfitAmt(Math.max(1, +e.target.value || 1))}
                        className="flex-1 text-center text-sm font-semibold text-foreground bg-transparent border-none outline-none" />
                      <button onClick={() => setTakeProfitAmt(a => +(a + 1).toFixed(2))}
                        className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-lg font-bold">+</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Max. payout */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm text-muted-foreground">Max. payout</span>
                <span className="text-sm font-semibold text-foreground">
                  {maxPayout != null ? `${maxPayout} ${currency}` : "—"}
                </span>
              </div>

              {/* Max. ticks */}
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Max. ticks</span>
                <span className="text-sm font-semibold text-foreground">{maxTicks}</span>
              </div>
            </>
          ) : (
            <ComingSoonPanel tradeType={tradeType} />
          )}
        </div>

        {/* BUY */}
        <button onClick={handleBuy}
          className="w-full py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg"
          style={{ background: "#22C55E" }}>
          <TrendingUp className="w-5 h-5" />
          {isLoggedIn ? "Buy" : "Log in to trade"}
        </button>

        {/* Bottom bar */}
        <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
          <button className="flex items-center gap-1.5 text-xs text-[#FACC15] hover:text-yellow-400 transition-colors">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Risk Disclaimer</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] flex-shrink-0" />
            {gmt}
          </div>
        </div>
      </div>
    </div>
  );
}
