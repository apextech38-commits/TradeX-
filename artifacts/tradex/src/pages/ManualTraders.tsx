import {
  useState, useEffect, useRef, useCallback,
} from "react";
import {
  ChevronDown, TrendingUp, TrendingDown,
  Check, AlertCircle, Loader2, X,
} from "lucide-react";
import LightweightChart from "@/components/LightweightChart";
import AuthGateModal  from "@/components/AuthGateModal";
import { useAuth, DERIV_APP_ID } from "@/context/AuthContext";

/* ───────────────────────────────────────────── constants ── */

const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

const MARKETS = [
  { label: "Volatility 100 (1s)",  id: "1HZ100V"   },
  { label: "Volatility 100",       id: "R_100"      },
  { label: "Volatility 75 (1s)",   id: "1HZ75V"     },
  { label: "Volatility 75",        id: "R_75"       },
  { label: "Volatility 50 (1s)",   id: "1HZ50V"     },
  { label: "Volatility 50",        id: "R_50"       },
  { label: "Volatility 25 (1s)",   id: "1HZ25V"     },
  { label: "Volatility 25",        id: "R_25"       },
  { label: "Volatility 10 (1s)",   id: "1HZ10V"     },
  { label: "Volatility 10",        id: "R_10"       },
  { label: "Boom 1000",            id: "BOOM1000N"  },
  { label: "Boom 500",             id: "BOOM500N"   },
  { label: "Boom 300",             id: "BOOM300N"   },
  { label: "Crash 1000",           id: "CRASH1000N" },
  { label: "Crash 500",            id: "CRASH500N"  },
  { label: "Crash 300",            id: "CRASH300N"  },
  { label: "Step Index",           id: "stpRNG100"  },
  { label: "Jump 10",              id: "JD10"       },
  { label: "Jump 25",              id: "JD25"       },
  { label: "Jump 50",              id: "JD50"       },
  { label: "Jump 75",              id: "JD75"       },
  { label: "Jump 100",             id: "JD100"      },
];

const TICKS = [
  { label: "1 Tick",   v: 1,  u: "t" },
  { label: "2 Ticks",  v: 2,  u: "t" },
  { label: "3 Ticks",  v: 3,  u: "t" },
  { label: "5 Ticks",  v: 5,  u: "t" },
  { label: "10 Ticks", v: 10, u: "t" },
  { label: "15 Ticks", v: 15, u: "t" },
  { label: "1 Min",    v: 1,  u: "m" },
  { label: "5 Min",    v: 5,  u: "m" },
  { label: "15 Min",   v: 15, u: "m" },
  { label: "30 Min",   v: 30, u: "m" },
];

const ACC_GROWTH  = ["1%", "2%", "3%", "4%", "5%"];
const MUL_VALUES  = ["10×", "20×", "30×", "50×", "100×"];
const DIGIT_TYPES = ["Matches", "Differs", "Over", "Under", "Even", "Odd"];

type Tab = "rise_fall" | "accumulators" | "multipliers" | "digits";

/* ─────────────────────────────────── live-price hook ── */

function useLivePrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [dir,   setDir]   = useState<"up" | "dn" | null>(null);
  const wsRef   = useRef<WebSocket | null>(null);
  const prev    = useRef<number | null>(null);
  const mountRef = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    setPrice(null); setDir(null); prev.current = null;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountRef.current) return;
      ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    };
    ws.onmessage = (e) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.msg_type === "tick") {
          const q: number = msg.tick.quote;
          setDir(prev.current == null ? null : q >= prev.current ? "up" : "dn");
          prev.current = q;
          setPrice(q);
        }
      } catch {}
    };
    ws.onerror = ws.onclose = () => {};

    return () => {
      mountRef.current = false;
      ws.onclose = null;
      ws.close();
    };
  }, [symbol]);

  return { price, dir };
}

/* ──────────────────────────────── proposal/buy hook ── */

interface Proposal {
  id:      string;
  payout:  number;
  ask:     number;
  longCode:string;
}

function useTrade() {
  const { activeAccount } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const wsRef    = useRef<WebSocket | null>(null);
  const reqIdRef = useRef(1);
  const mountRef = useRef(true);

  const fetchProposal = useCallback((
    symbol: string,
    contractType: "CALL" | "PUT",
    duration: number,
    durationUnit: string,
    stake: string,
  ) => {
    if (!activeAccount) return;
    setProposal(null);

    wsRef.current?.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: activeAccount.token }));
    };
    ws.onmessage = (e) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.error) return;
        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({
            proposal:      1,
            subscribe:     1,
            amount:        parseFloat(stake) || 1,
            basis:         "stake",
            contract_type: contractType,
            currency:      activeAccount.currency || "USD",
            duration,
            duration_unit: durationUnit,
            symbol,
            req_id:        ++reqIdRef.current,
          }));
        }
        if (msg.msg_type === "proposal" && msg.proposal) {
          const p = msg.proposal;
          setProposal({ id: p.id, payout: p.payout, ask: p.ask_price, longCode: p.longcode });
        }
      } catch {}
    };
    ws.onerror = ws.onclose = () => {};
  }, [activeAccount]);

  const buy = useCallback((proposalId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setLoading(true);
    setResult(null);
    wsRef.current.send(JSON.stringify({ buy: proposalId, price: 999999, req_id: ++reqIdRef.current }));
    wsRef.current.onmessage = (e) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.msg_type === "buy") {
          setResult(msg.error
            ? { ok: false, msg: msg.error.message }
            : { ok: true,  msg: `Bought! Contract #${msg.buy?.contract_id ?? ""}` });
        }
      } catch {}
      setLoading(false);
    };
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  useEffect(() => {
    mountRef.current = true;
    return () => { mountRef.current = false; wsRef.current?.close(); };
  }, []);

  return { proposal, loading, result, fetchProposal, buy, clearResult };
}

/* ═══════════════════════════════ ManualTraders ═══ */

const C = {
  bg:       "#0f172a",
  panel:    "#111827",
  input:    "#1f2937",
  border:   "#374151",
  text:     "#f1f5f9",
  sub:      "#94a3b8",
  rise:     "#22c55e",
  fall:     "#ef4444",
  blue:     "#2962ff",
};

export default function ManualTraders() {
  const { isLoggedIn, balance, currency } = useAuth();

  const [market,     setMarket]    = useState(MARKETS[0]);
  const [mktOpen,    setMktOpen]   = useState(false);
  const [tab,        setTab]       = useState<Tab>("rise_fall");
  const [tickIdx,    setTickIdx]   = useState(2);
  const [stake,      setStake]     = useState("10");
  const [growth,     setGrowth]    = useState(0);
  const [mul,        setMul]       = useState(0);
  const [digitType,  setDigitType] = useState(0);
  const [digitVal,   setDigitVal]  = useState("5");
  const [showAuth,   setShowAuth]  = useState(false);

  const { price, dir } = useLivePrice(market.id);
  const { proposal, loading, result, fetchProposal, buy, clearResult } = useTrade();

  /* re-fetch proposal on input change */
  useEffect(() => {
    if (!isLoggedIn || tab !== "rise_fall") return;
    const d = TICKS[tickIdx];
    fetchProposal(market.id, "CALL", d.v, d.u, stake);
  }, [isLoggedIn, tab, market.id, tickIdx, stake]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  const pct = proposal
    ? (((proposal.payout - proposal.ask) / proposal.ask) * 100).toFixed(0)
    : null;

  function handleBuy(side: "CALL" | "PUT") {
    if (!isLoggedIn) { setShowAuth(true); return; }
    if (!proposal)   return;
    buy(proposal.id);
  }

  /* ── shared chip style ── */
  const chip = (active: boolean): React.CSSProperties => ({
    padding: "7px 4px",
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 8,
    cursor: "pointer",
    background: active ? C.blue : C.input,
    color:      active ? "#fff" : C.sub,
    border:     `1px solid ${active ? C.blue : C.border}`,
    transition: "all 0.15s",
    textAlign:  "center",
  });

  const label: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: C.sub,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
  };

  /* ─────────────────────────── controls (shared between layouts) ── */
  const controls = (
    <div className="mt-controls">

      {/* Balance strip */}
      {isLoggedIn && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 16px", background: C.bg,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 11, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>Balance</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
            {balance != null ? `${balance.toFixed(2)} ${currency}` : "—"}
          </span>
        </div>
      )}

      {/* Contract type tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.panel }}>
        {([
          ["rise_fall",    "Rise/Fall"],
          ["accumulators", "Accum"],
          ["multipliers",  "Multi"],
          ["digits",       "Digits"],
        ] as [Tab, string][]).map(([id, lbl]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, padding: "10px 0",
              fontSize: 11, fontWeight: 700,
              color:      tab === id ? C.blue : C.sub,
              background: "transparent", border: "none",
              borderBottom: tab === id ? `2px solid ${C.blue}` : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
              letterSpacing: "0.04em",
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ── RISE / FALL ── */}
      {tab === "rise_fall" && (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Duration */}
          <div>
            <span style={label}>Duration</span>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
              {TICKS.slice(0, 5).map((t, i) => (
                <button key={i} onClick={() => setTickIdx(i)} style={chip(tickIdx === i)}>{t.label}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginTop: 5 }}>
              <button onClick={() => setTickIdx(5)} style={chip(tickIdx === 5)}>{TICKS[5].label}</button>
              {TICKS.slice(6).map((t, i) => (
                <button key={i+6} onClick={() => setTickIdx(i+6)} style={chip(tickIdx === i+6)}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Stake */}
          <div>
            <span style={label}>Stake ({currency || "USD"})</span>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.sub, fontWeight: 600 }}>$</span>
              <input
                type="number" value={stake} min="1"
                onChange={e => setStake(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: C.input, border: `1px solid ${C.border}`,
                  borderRadius: 9, padding: "11px 12px 11px 28px",
                  color: C.text, fontSize: 15, fontWeight: 700, outline: "none",
                }}
              />
            </div>
          </div>

          {/* Payout */}
          <div style={{
            background: C.bg, borderRadius: 10, padding: "11px 14px",
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ ...label, margin: 0 }}>Est. Payout</span>
              <span style={{ ...label, margin: 0 }}>Profit</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                {proposal ? `$${proposal.payout.toFixed(2)}` : "—"}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.rise }}>
                {pct ? `+${pct}%` : "—"}
              </span>
            </div>
          </div>

          {/* Result banner */}
          {result && (
            <div style={{
              background: result.ok ? "#14532d" : "#450a0a",
              border: `1px solid ${result.ok ? "#16a34a" : "#991b1b"}`,
              borderRadius: 9, padding: "10px 12px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {result.ok
                ? <Check    style={{ width: 16, height: 16, color: C.rise, flexShrink: 0 }} />
                : <AlertCircle style={{ width: 16, height: 16, color: C.fall, flexShrink: 0 }} />
              }
              <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{result.msg}</span>
              <button onClick={clearResult} style={{ background: "transparent", border: "none", color: C.sub, cursor: "pointer", padding: 0 }}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          )}

          {/* Buy buttons — side by side always */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => handleBuy("CALL")}
              disabled={loading || (!proposal && isLoggedIn)}
              style={{
                flex: 1, padding: "14px 0",
                background: C.rise, color: "#fff",
                fontWeight: 800, fontSize: 15, borderRadius: 12,
                border: "none", cursor: loading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
                opacity: (!proposal && isLoggedIn && !loading) ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {loading
                ? <Loader2 style={{ width: 17, height: 17, animation: "mt-spin 1s linear infinite" }} />
                : <TrendingUp style={{ width: 17, height: 17 }} />
              }
              {loading ? "…" : "Rise"}
            </button>
            <button
              onClick={() => handleBuy("PUT")}
              disabled={loading || (!proposal && isLoggedIn)}
              style={{
                flex: 1, padding: "14px 0",
                background: C.fall, color: "#fff",
                fontWeight: 800, fontSize: 15, borderRadius: 12,
                border: "none", cursor: loading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                boxShadow: "0 4px 20px rgba(239,68,68,0.3)",
                opacity: (!proposal && isLoggedIn && !loading) ? 0.5 : 1,
                transition: "all 0.15s",
              }}
            >
              {loading
                ? <Loader2 style={{ width: 17, height: 17, animation: "mt-spin 1s linear infinite" }} />
                : <TrendingDown style={{ width: 17, height: 17 }} />
              }
              {loading ? "…" : "Fall"}
            </button>
          </div>
        </div>
      )}

      {/* ── ACCUMULATORS ── */}
      {tab === "accumulators" && (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={label}>Growth Rate</span>
            <div style={{ display: "flex", gap: 6 }}>
              {ACC_GROWTH.map((g, i) => (
                <button key={i} onClick={() => setGrowth(i)} style={{ ...chip(growth === i), flex: 1 }}>{g}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={label}>Stake ({currency || "USD"})</span>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.sub, fontWeight: 600 }}>$</span>
              <input type="number" value={stake} min="1" onChange={e => setStake(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: C.input, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 12px 11px 28px", color: C.text, fontSize: 15, fontWeight: 700, outline: "none" }} />
            </div>
          </div>
          <div style={{ background: "#162032", borderRadius: 9, padding: "11px 13px", border: `1px solid ${C.border}`, fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
            Accumulate profits every tick. Closes when profit target hit or barrier breached.
          </div>
          <button onClick={() => { if (!isLoggedIn) setShowAuth(true); }}
            style={{ width: "100%", padding: "14px 0", background: C.blue, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(41,98,255,0.3)" }}>
            Buy Accumulator
          </button>
        </div>
      )}

      {/* ── MULTIPLIERS ── */}
      {tab === "multipliers" && (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={label}>Multiplier</span>
            <div style={{ display: "flex", gap: 6 }}>
              {MUL_VALUES.map((m, i) => (
                <button key={i} onClick={() => setMul(i)} style={{ ...chip(mul === i), flex: 1, fontSize: 11 }}>{m}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={label}>Stake ({currency || "USD"})</span>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.sub, fontWeight: 600 }}>$</span>
              <input type="number" value={stake} min="1" onChange={e => setStake(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: C.input, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 12px 11px 28px", color: C.text, fontSize: 15, fontWeight: 700, outline: "none" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { if (!isLoggedIn) setShowAuth(true); }}
              style={{ flex: 1, padding: "14px 0", background: C.rise, color: "#fff", fontWeight: 800, fontSize: 14, borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(34,197,94,0.3)" }}>
              Up ×{MUL_VALUES[mul].replace("×", "")}
            </button>
            <button onClick={() => { if (!isLoggedIn) setShowAuth(true); }}
              style={{ flex: 1, padding: "14px 0", background: C.fall, color: "#fff", fontWeight: 800, fontSize: 14, borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.3)" }}>
              Down ×{MUL_VALUES[mul].replace("×", "")}
            </button>
          </div>
        </div>
      )}

      {/* ── DIGITS ── */}
      {tab === "digits" && (
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <span style={label}>Digit Type</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              {DIGIT_TYPES.map((d, i) => (
                <button key={i} onClick={() => setDigitType(i)} style={chip(digitType === i)}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <span style={label}>Digit (0–9)</span>
            <input type="number" value={digitVal} min="0" max="9" onChange={e => setDigitVal(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: C.input, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 12px", color: C.text, fontSize: 15, fontWeight: 700, outline: "none" }} />
          </div>
          <div>
            <span style={label}>Stake ({currency || "USD"})</span>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.sub, fontWeight: 600 }}>$</span>
              <input type="number" value={stake} min="1" onChange={e => setStake(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: C.input, border: `1px solid ${C.border}`, borderRadius: 9, padding: "11px 12px 11px 28px", color: C.text, fontSize: 15, fontWeight: 700, outline: "none" }} />
            </div>
          </div>
          <button onClick={() => { if (!isLoggedIn) setShowAuth(true); }}
            style={{ width: "100%", padding: "14px 0", background: C.blue, color: "#fff", fontWeight: 800, fontSize: 15, borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(41,98,255,0.3)" }}>
            Buy Contract
          </button>
        </div>
      )}

      {/* Login prompt */}
      {!isLoggedIn && (
        <div style={{ margin: "0 14px 14px", background: "#1e293b", borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.border}`, textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
            Log in to place real trades and see live payout quotes.
          </p>
          <button onClick={() => setShowAuth(true)}
            style={{ background: C.blue, color: "#fff", fontWeight: 700, fontSize: 12, padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer" }}>
            Log In / Sign Up
          </button>
        </div>
      )}
    </div>
  );

  /* ─────────────────────────────────── market + price bar ── */
  const marketBar = (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", background: C.bg,
      borderBottom: `1px solid #1e293b`,
      flexShrink: 0,
    }}>
      {/* market dropdown */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMktOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: C.input, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "6px 10px",
            color: C.text, fontSize: 13, fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {market.label}
          <ChevronDown style={{ width: 14, height: 14, color: C.sub, flexShrink: 0 }} />
        </button>

        {mktOpen && (
          <>
            {/* backdrop */}
            <div
              onClick={() => setMktOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 38 }}
            />
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 39,
              background: "#1e293b", border: `1px solid ${C.border}`,
              borderRadius: 10, padding: 4,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              maxHeight: 260, overflowY: "auto", minWidth: 220,
            }}>
              {MARKETS.map(m => (
                <div
                  key={m.id}
                  onClick={() => { setMarket(m); setMktOpen(false); }}
                  style={{
                    padding: "8px 12px", fontSize: 13, color: C.text,
                    cursor: "pointer", borderRadius: 7,
                    background: m.id === market.id ? `${C.blue}22` : "transparent",
                    fontWeight: m.id === market.id ? 700 : 400,
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* live price */}
      {price != null
        ? <span style={{
            fontSize: 18, fontWeight: 800, letterSpacing: "0.01em",
            color: dir === "up" ? C.rise : dir === "dn" ? C.fall : C.text,
            transition: "color 0.15s", fontVariantNumeric: "tabular-nums",
          }}>
            {fmt(price)}
          </span>
        : <span style={{ fontSize: 12, color: C.sub }}>Connecting…</span>
      }

      {dir && (
        dir === "up"
          ? <TrendingUp  style={{ width: 15, height: 15, color: C.rise }} />
          : <TrendingDown style={{ width: 15, height: 15, color: C.fall }} />
      )}
    </div>
  );

  /* ══════════════════════════════════════ render ═══ */
  return (
    <>
      <style>{`
        /* ── ManualTraders responsive layout ── */
        .mt-root {
          display: flex;
          flex-direction: row;
          height: calc(100dvh - 132px);
          background: ${C.bg};
          overflow: hidden;
          font-family: 'IBM Plex Sans','Inter',system-ui,sans-serif;
        }

        /* CHART COLUMN — left on desktop, top on mobile */
        .mt-chart-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        /* CHART AREA fills remaining height on desktop */
        .mt-chart-area {
          flex: 1;
          min-height: 0;
        }

        /* PANEL — right on desktop, below chart on mobile */
        .mt-panel {
          width: 290px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: ${C.panel};
          border-left: 1px solid ${C.border};
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* ── MOBILE (≤ 767px) ── */
        @media (max-width: 767px) {
          .mt-root {
            flex-direction: column;
            overflow-y: auto;
            height: calc(100dvh - 132px);
          }
          .mt-chart-col {
            flex: none;
            width: 100%;
          }
          .mt-chart-area {
            flex: none;
            height: 310px;
          }
          .mt-panel {
            width: 100%;
            border-left: none;
            border-top: 1px solid ${C.border};
            overflow-y: visible; /* let root scroll */
            flex-shrink: 0;
          }
        }

        @keyframes mt-spin { to { transform: rotate(360deg); } }

        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div className="mt-root">

        {/* ── Chart column ── */}
        <div className="mt-chart-col">
          {marketBar}
          <div className="mt-chart-area">
            <LightweightChart symbol={market.id} tradingMode onPriceUpdate={() => {}} />
          </div>
        </div>

        {/* ── Trade panel ── */}
        <div className="mt-panel">
          {controls}
        </div>

      </div>

      <AuthGateModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
