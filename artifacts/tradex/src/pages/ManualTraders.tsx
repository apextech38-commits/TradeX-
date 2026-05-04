import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { BarChart2, TrendingUp, Info, AlertTriangle, X } from "lucide-react";
import { DERIV_APP_ID, OAUTH_APP_ID } from "@/context/AuthContext";
import { useAuth } from "@/context/AuthContext";

const WS_URL        = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const PING_INTERVAL = 25_000;
const RETRY_DELAY   = 3_000;
const MAX_TICKS     = 120;
const MIN_STAKE     = 0.35;
const STAKE_STEP    = 1;

// Exact IDs as specified by user
const SYMBOLS = [
  { id: "1HZ10V",  label: "Volatility 10 (1s) Index",  badge: "10"  },
  { id: "R_25",    label: "Volatility 25 Index",        badge: "25"  },
  { id: "R_50",    label: "Volatility 50 Index",        badge: "50"  },
  { id: "R_75",    label: "Volatility 75 Index",        badge: "75"  },
  { id: "1HZ100V", label: "Volatility 100 (1s) Index",  badge: "100" },
];

const REDIRECT_URI  = "https://dev-utility-hub--apexricky20.replit.app/callback";
const LOGIN_URL     = `https://oauth.deriv.com/oauth2/authorize?app_id=${OAUTH_APP_ID}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

type Tick = { time: string; value: number };

// ── Right-edge price box (SVG label) ──────────────────────────────────────────
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

// ── Generic modal shell ───────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
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

// ── Risk Calculator modal ─────────────────────────────────────────────────────
function RiskCalcModal({ onClose, symId, currency }: {
  onClose: () => void; symId: string; currency: string;
}) {
  const [rStake, setRStake]       = useState(10);
  const [rGrowth, setRGrowth]     = useState(3);
  const [rPayout, setRPayout]     = useState<string | null>(null);
  const [rTicks,  setRTicks]      = useState<string>("6,000");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({
        proposal: 1, amount: rStake, basis: "stake",
        contract_type: "ACCU", currency: "USD",
        growth_rate: rGrowth / 100, symbol: symId,
      }));
    };
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
          <input
            type="number" min={MIN_STAKE} step={STAKE_STEP} value={rStake}
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

// ── Learn modal ───────────────────────────────────────────────────────────────
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

// ── Main component ─────────────────────────────────────────────────────────────
export default function ManualTraders() {
  const { isLoggedIn, currency, sendWS } = useAuth();

  const [sym, setSym]               = useState(SYMBOLS[4]);
  const [showDropdown, setDropdown] = useState(false);
  const [ticks, setTicks]           = useState<Tick[]>([]);
  const [price, setPrice]           = useState<number | null>(null);
  const [prevPrice, setPrevPrice]   = useState<number | null>(null);
  const [connected, setConnected]   = useState(false);

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

  // ── Proposal WebSocket (max payout / max ticks) ─────────────────────────────
  const wsPropRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    if (wsPropRef.current) { wsPropRef.current.onclose = null; wsPropRef.current.close(); }
    const ws = new WebSocket(WS_URL);
    wsPropRef.current = ws;
    ws.onopen = () => {
      ws.send(JSON.stringify({
        proposal: 1, amount: stake, basis: "stake",
        contract_type: "ACCU", currency: "USD",
        growth_rate: growthRate / 100, symbol: sym.id,
      }));
    };
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
  }, [stake, growthRate, sym.id]);

  // ── Derived chart values ────────────────────────────────────────────────────
  const delta     = price != null ? price * growthRate / 100 : 0;
  const upperBand = price != null ? price + delta : null;
  const lowerBand = price != null ? price - delta : null;
  const priceChange = price != null && prevPrice != null ? price - prevPrice : null;
  const priceUp     = priceChange == null ? null : priceChange >= 0;

  const values = ticks.map(t => t.value);
  const minV   = values.length ? Math.min(...values) : 0;
  const maxV   = values.length ? Math.max(...values) : 0;
  const pad    = ((maxV - minV) * 0.2) || 1;

  // ── BUY ────────────────────────────────────────────────────────────────────
  const handleBuy = () => {
    if (!isLoggedIn) {
      window.location.href = LOGIN_URL;
      return;
    }
    sendWS({
      buy: "1",
      price: stake,
      parameters: {
        amount: stake, basis: "stake", contract_type: "ACCU",
        currency, growth_rate: growthRate / 100, symbol: sym.id,
      },
    });
  };

  const dec = () => setStake(s => +(Math.max(MIN_STAKE, s - STAKE_STEP)).toFixed(2));
  const inc = () => setStake(s => +(s + STAKE_STEP).toFixed(2));

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-background pb-6"
      onClick={() => setDropdown(false)}>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showRiskCalc && (
        <RiskCalcModal
          onClose={() => setShowRiskCalc(false)}
          symId={sym.id}
          currency={currency}
        />
      )}
      {showLearn && <LearnModal onClose={() => setShowLearn(false)} />}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-wrap gap-3">

        {/* Market selector */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setDropdown(p => !p)}
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
                      {priceUp ? "▲" : "▼"}
                      {" "}{Math.abs(priceChange).toFixed(2)}
                      {" "}({Math.abs(priceChange / prevPrice * 100).toFixed(2)}%)
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground mt-0.5">Connecting…</div>
              )}
            </div>
            <span className="text-muted-foreground text-[10px] ml-0.5">▼</span>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden min-w-[230px]">
              {SYMBOLS.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSym(s); setDropdown(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2.5 ${
                    s.id === sym.id ? "text-primary font-semibold bg-primary/5" : "text-foreground"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] flex-shrink-0" />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

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

                {/* Accumulator zone — updates live with growthRate */}
                {upperBand != null && lowerBand != null && (
                  <>
                    <ReferenceArea y1={lowerBand} y2={upperBand} fill="#3B82F6" fillOpacity={0.12} />
                    <ReferenceLine y={upperBand} stroke="#3B82F6" strokeDasharray="3 3" strokeWidth={1}
                      label={{ value: `+${delta.toFixed(2)}`, position: "insideTopRight", fill: "#3B82F6", fontSize: 10, fontWeight: "bold" }} />
                    <ReferenceLine y={lowerBand} stroke="#3B82F6" strokeDasharray="3 3" strokeWidth={1}
                      label={{ value: `-${delta.toFixed(2)}`, position: "insideBottomRight", fill: "#3B82F6", fontSize: 10, fontWeight: "bold" }} />
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

          {/* Trade type row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Accumulators</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-foreground">{growthRate}%</span>
              <span className="text-muted-foreground text-base">›</span>
            </div>
          </div>

          {/* Growth rate — clicking selects, updates chart bands + proposal */}
          <div className="px-4 pt-3 pb-4 border-b border-border">
            <div className="text-xs text-muted-foreground mb-2.5 font-medium uppercase tracking-wide">
              Growth rate
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={() => setGrowthRate(r)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                    growthRate === r
                      ? "bg-foreground text-background border-foreground shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          {/* Stake — step 1, min 0.35 */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <button
              onClick={dec}
              className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-secondary text-xl font-bold transition-colors flex-shrink-0"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-foreground">{stake}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Stake</div>
            </div>
            <button
              onClick={inc}
              className="w-11 h-11 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-secondary text-xl font-bold transition-colors flex-shrink-0"
            >
              +
            </button>
          </div>

          {/* Take profit — shows amount input when checked */}
          <div className={`border-b border-border ${takeProfit ? "" : ""}`}>
            <div className="flex items-center justify-between px-4 py-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={takeProfit}
                  onChange={e => setTakeProfit(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-foreground">Take profit</span>
              </label>
              <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </div>
            {takeProfit && (
              <div className="px-4 pb-3 space-y-1.5">
                <div className="text-xs text-muted-foreground font-medium">Take profit amount ({currency})</div>
                <div className="flex items-center gap-2 border border-border rounded-lg overflow-hidden bg-background">
                  <button
                    onClick={() => setTakeProfitAmt(a => Math.max(1, +(a - 1).toFixed(2)))}
                    className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-lg font-bold"
                  >−</button>
                  <input
                    type="number" min={1} step={1} value={takeProfitAmt}
                    onChange={e => setTakeProfitAmt(Math.max(1, +e.target.value || 1))}
                    className="flex-1 text-center text-sm font-semibold text-foreground bg-transparent border-none outline-none"
                  />
                  <button
                    onClick={() => setTakeProfitAmt(a => +(a + 1).toFixed(2))}
                    className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-lg font-bold"
                  >+</button>
                </div>
              </div>
            )}
          </div>

          {/* Max. payout — from proposal API, updates with stake + growthRate + symbol */}
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
        </div>

        {/* BUY */}
        <button
          onClick={handleBuy}
          className="w-full py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg"
          style={{ background: "#22C55E" }}
        >
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
