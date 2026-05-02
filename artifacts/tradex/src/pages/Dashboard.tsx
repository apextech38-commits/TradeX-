import { useState, useEffect, useRef } from "react";
import {
  Bot, TrendingUp, BarChart2, Brain, Layers, Users, Eye,
  Zap, ArrowRight, Wifi, WifiOff, LogIn,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

const TICKER_SYMBOLS = [
  { id: "1HZ100V", label: "Vol 100 (1s)", pip: 2 },
  { id: "R_100",   label: "Vol 100",      pip: 2 },
  { id: "R_50",    label: "Vol 50",       pip: 2 },
];

type Prices = Record<string, number | null>;

function navigate(tab: string) {
  window.dispatchEvent(new CustomEvent("tradex:navigate", { detail: tab }));
}

const FEATURES = [
  {
    id: "Bot Builder",
    icon: Bot,
    title: "Bot Builder",
    desc: "Design automated trading bots with a visual drag-and-drop interface. No coding required.",
    color: "#3B82F6",
    bg: "bg-primary/10",
    border: "border-primary/30",
    highlight: true,
  },
  {
    id: "Manual Traders",
    icon: TrendingUp,
    title: "Manual Traders",
    desc: "Trade Accumulators, Rise/Fall, Multipliers and 6 more contract types with live charts.",
    color: "#22C55E",
    bg: "bg-[#22C55E]/10",
    border: "border-[#22C55E]/30",
    highlight: false,
  },
  {
    id: "Charts",
    icon: BarChart2,
    title: "Charts",
    desc: "Live tick-by-tick price charts with high, low, open stats powered by Deriv WebSocket.",
    color: "#3B82F6",
    bg: "bg-primary/10",
    border: "border-primary/30",
    highlight: false,
  },
  {
    id: "Analysis Tool",
    icon: Brain,
    title: "Analysis Tool",
    desc: "Digit frequency analysis, even/odd ratios, and last-digit statistics for informed entries.",
    color: "#FACC15",
    bg: "bg-[#FACC15]/10",
    border: "border-[#FACC15]/30",
    highlight: false,
  },
  {
    id: "Strategies",
    icon: Layers,
    title: "Strategies",
    desc: "Pre-built and custom trading strategies. Back-test and deploy with one click.",
    color: "#3B82F6",
    bg: "bg-primary/10",
    border: "border-primary/30",
    highlight: false,
  },
  {
    id: "Copy Trading",
    icon: Users,
    title: "Copy Trading",
    desc: "Follow top traders and automatically mirror their positions in real time.",
    color: "#22C55E",
    bg: "bg-[#22C55E]/10",
    border: "border-[#22C55E]/30",
    highlight: false,
  },
  {
    id: "Trading Bots",
    icon: Zap,
    title: "Trading Bots",
    desc: "Run, monitor and manage your active bots. View live P&L and trade history.",
    color: "#FACC15",
    bg: "bg-[#FACC15]/10",
    border: "border-[#FACC15]/30",
    highlight: false,
  },
  {
    id: "TradingView",
    icon: Eye,
    title: "TradingView",
    desc: "Professional charting powered by TradingView with hundreds of indicators.",
    color: "#3B82F6",
    bg: "bg-primary/10",
    border: "border-primary/30",
    highlight: false,
  },
];

export default function Dashboard() {
  const { isLoggedIn, isAuthorized, activeAccount, balance, currency, wsConnected, login } = useAuth();
  const [prices, setPrices] = useState<Prices>({ "1HZ100V": null, R_100: null, R_50: null });
  const [prevPrices, setPrevPrices] = useState<Prices>({});
  const wsRef  = useRef<WebSocket | null>(null);
  const mountRef = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountRef.current) return;
      TICKER_SYMBOLS.forEach(s => ws.send(JSON.stringify({ ticks: s.id, subscribe: 1 })));
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.msg_type === "tick") {
          const { symbol, quote } = msg.tick;
          setPrices(prev => {
            setPrevPrices(pp => ({ ...pp, [symbol]: prev[symbol] ?? quote }));
            return { ...prev, [symbol]: quote };
          });
        }
      } catch (_) {}
    };

    return () => {
      mountRef.current = false;
      ws.onclose = null;
      ws.close();
    };
  }, []);

  const formattedBalance = balance !== null && currency
    ? `${currency} ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  return (
    <div className="min-h-full bg-background overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-5 space-y-6">

        {/* ── Hero / Status banner ─────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl font-bold text-primary">TradeX</span>
              <span className="text-[10px] font-bold px-1.5 py-[2px] rounded bg-[#FACC15]/20 text-[#FACC15]">PRO</span>
            </div>
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${wsConnected && isAuthorized ? "bg-[#22C55E]" : "bg-[#FACC15] animate-pulse"}`}/>
                <span className="text-sm text-foreground font-medium">
                  {wsConnected && isAuthorized
                    ? `Connected · ${activeAccount?.account ?? ""}`
                    : "Connecting to Deriv…"}
                </span>
                {formattedBalance && (
                  <span className="ml-2 text-sm font-bold text-[#22C55E]">{formattedBalance}</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect your Deriv account to start trading.
              </p>
            )}
          </div>

          {isLoggedIn ? (
            <div className="flex items-center gap-2 shrink-0 text-xs font-medium">
              {wsConnected && isAuthorized
                ? <><Wifi className="w-4 h-4 text-[#22C55E]"/><span className="text-[#22C55E]">Live — Deriv connected</span></>
                : <><WifiOff className="w-4 h-4 text-[#FACC15]"/><span className="text-[#FACC15]">Reconnecting…</span></>}
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors shrink-0"
            >
              <LogIn className="w-4 h-4"/>
              Log In to Deriv
            </button>
          )}
        </div>

        {/* ── Live ticker ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {TICKER_SYMBOLS.map(sym => {
            const p    = prices[sym.id];
            const prev = prevPrices[sym.id];
            const up   = p !== null && prev !== null ? p > prev : null;
            const color = up === true ? "#22C55E" : up === false ? "#EF4444" : undefined;
            return (
              <div key={sym.id}
                className="bg-card border border-border rounded-xl px-3 py-3 flex flex-col gap-0.5 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate("Charts")}
              >
                <span className="text-[10px] text-muted-foreground font-medium truncate">{sym.label}</span>
                <span className="text-sm sm:text-base font-bold font-mono truncate transition-colors"
                  style={{ color: color ?? "var(--color-foreground)" }}>
                  {p !== null ? p.toFixed(sym.pip) : "—"}
                </span>
                {up !== null && (
                  <span className="text-[10px] font-semibold" style={{ color: color }}>
                    {up ? "▲" : "▼"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Feature cards ──────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Quick Access
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => navigate(f.id)}
                  className={`group text-left bg-card border rounded-xl p-4 transition-all hover:shadow-md active:scale-[0.98] ${
                    f.highlight
                      ? `${f.border} ring-1 ring-primary/20`
                      : `border-border hover:border-primary/30`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-9 h-9 rounded-lg ${f.bg} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" style={{ color: f.color }}/>
                    </div>
                    {f.highlight && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider shrink-0">
                        Featured
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0 mt-0.5"/>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-semibold text-foreground mb-1">{f.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{f.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
