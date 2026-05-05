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

/* ─────────────────────────────────────────── constants ── */

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
  { label: "1 Tick",  v: 1,  u: "t" },
  { label: "2 Ticks", v: 2,  u: "t" },
  { label: "3 Ticks", v: 3,  u: "t" },
  { label: "5 Ticks", v: 5,  u: "t" },
  { label: "10 Ticks",v: 10, u: "t" },
  { label: "15 Ticks",v: 15, u: "t" },
  { label: "1 Min",   v: 1,  u: "m" },
  { label: "5 Min",   v: 5,  u: "m" },
  { label: "15 Min",  v: 15, u: "m" },
  { label: "30 Min",  v: 30, u: "m" },
];

const ACC_GROWTH = ["1%", "2%", "3%", "4%", "5%"];
const MUL_VALUES = ["10×", "20×", "30×", "50×", "100×"];
const DIGIT_TYPES = ["Matches", "Differs", "Over", "Under", "Even", "Odd"];

type Tab = "rise_fall" | "accumulators" | "multipliers" | "digits";

/* ─────────────────────────────────────── live-price hook ── */

function useLivePrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [dir,   setDir]   = useState<"up"|"dn"|null>(null);
  const wsRef   = useRef<WebSocket|null>(null);
  const prev    = useRef<number|null>(null);
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

/* ──────────────────────────────────── proposal/buy hook ── */

interface Proposal {
  id:      string;
  payout:  number;
  ask:     number;
  longCode:string;
}

function useTrade() {
  const { activeAccount } = useAuth();
  const [proposal, setProposal] = useState<Proposal|null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<{ok:boolean; msg:string}|null>(null);
  const wsRef   = useRef<WebSocket|null>(null);
  const reqIdRef = useRef(1);
  const mountRef = useRef(true);

  /* open a dedicated WS, authorize, stream proposals */
  const fetchProposal = useCallback((
    symbol: string,
    contractType: "CALL"|"PUT",
    duration: number,
    durationUnit: string,
    stake: string,
  ) => {
    if (!activeAccount) return;
    setProposal(null);

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
          setProposal({
            id:       p.id,
            payout:   p.payout,
            ask:      p.ask_price,
            longCode: p.longcode,
          });
        }
      } catch {}
    };
    ws.onerror = ws.onclose = () => {};
  }, [activeAccount]);

  const buy = useCallback((proposalId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setLoading(true);
    setResult(null);
    wsRef.current.send(JSON.stringify({
      buy:   proposalId,
      price: 999999,
      req_id: ++reqIdRef.current,
    }));
    wsRef.current.onmessage = (e) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.msg_type === "buy") {
          if (msg.error) {
            setResult({ ok: false, msg: msg.error.message });
          } else {
            setResult({
              ok: true,
              msg: `Bought! Contract #${msg.buy?.contract_id ?? ""}`,
            });
          }
        }
      } catch {}
      setLoading(false);
    };
  }, []);

  const clearResult = useCallback(() => setResult(null), []);

  useEffect(() => {
    mountRef.current = true;
    return () => {
      mountRef.current = false;
      wsRef.current?.close();
    };
  }, []);

  return { proposal, loading, result, fetchProposal, buy, clearResult };
}

/* ═══════════════════════════════════════ ManualTraders ═══ */

export default function ManualTraders() {
  const { isLoggedIn, activeAccount, balance, currency } = useAuth();

  /* market / tab / controls state */
  const [market,    setMarket]  = useState(MARKETS[0]);
  const [mktOpen,   setMktOpen] = useState(false);
  const [tab,       setTab]     = useState<Tab>("rise_fall");
  const [tickIdx,   setTickIdx] = useState(2);          // 3 Ticks default
  const [stake,     setStake]   = useState("10");
  const [growth,    setGrowth]  = useState(0);
  const [mul,       setMul]     = useState(0);
  const [digitType, setDigitType] = useState(0);
  const [digitVal,  setDigitVal]  = useState("5");

  /* auth gate */
  const [showAuth, setShowAuth] = useState(false);

  /* live price */
  const { price, dir } = useLivePrice(market.id);

  /* proposal / buy */
  const { proposal, loading, result, fetchProposal, buy, clearResult } = useTrade();

  /* re-fetch proposal whenever inputs change */
  useEffect(() => {
    if (!isLoggedIn || tab !== "rise_fall") return;
    const d = TICKS[tickIdx];
    fetchProposal(market.id, "CALL", d.v, d.u, stake);
  }, [isLoggedIn, tab, market.id, tickIdx, stake]);

  /* ── formatters ── */
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
  const pct  = proposal
    ? (((proposal.payout - proposal.ask) / proposal.ask) * 100).toFixed(0)
    : null;

  /* ── trade handlers ── */
  function handleBuy(side: "CALL"|"PUT") {
    if (!isLoggedIn) { setShowAuth(true); return; }
    if (!proposal)   return;
    buy(proposal.id);
  }

  /* colours */
  const riseClr = "#22c55e";
  const fallClr = "#ef4444";
  const panelBg = "#111827";
  const inputBg = "#1f2937";
  const border  = "#374151";
  const text     = "#f1f5f9";
  const subtext  = "#94a3b8";

  /* ── container height ── */
  const H = "calc(100dvh - 132px)";

  return (
    <div style={{ display:"flex", height:H, background:"#0f172a", overflow:"hidden", fontFamily:"'IBM Plex Sans','Inter',system-ui,sans-serif" }}>

      {/* ══════════ CHART (left / top on mobile) ══════════ */}
      <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>

        {/* ── market + price bar ── */}
        <div style={{
          display:"flex", alignItems:"center", gap:12, padding:"8px 14px",
          background:"#0f172a", borderBottom:"1px solid #1e293b",
        }}>
          {/* market dropdown trigger */}
          <button
            onClick={() => setMktOpen(o => !o)}
            style={{
              display:"flex", alignItems:"center", gap:6,
              background:inputBg, border:`1px solid ${border}`,
              borderRadius:8, padding:"5px 10px",
              color:text, fontSize:13, fontWeight:600, cursor:"pointer",
              position:"relative",
            }}
          >
            {market.label}
            <ChevronDown style={{ width:14, height:14, color:subtext }} />

            {/* dropdown */}
            {mktOpen && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:40,
                  background:"#1e293b", border:`1px solid ${border}`,
                  borderRadius:10, padding:4,
                  boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
                  maxHeight:260, overflowY:"auto", minWidth:240,
                }}
              >
                {MARKETS.map(m => (
                  <div
                    key={m.id}
                    onClick={() => { setMarket(m); setMktOpen(false); }}
                    style={{
                      padding:"7px 12px", fontSize:13, color:text,
                      cursor:"pointer", borderRadius:7,
                      background: m.id === market.id ? "#2962ff22" : "transparent",
                      fontWeight: m.id === market.id ? 700 : 400,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background="#2962ff22")}
                    onMouseLeave={e => (e.currentTarget.style.background = m.id === market.id ? "#2962ff22":"transparent")}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            )}
          </button>

          {/* live price */}
          {price != null
            ? <span style={{
                fontSize:18, fontWeight:700, letterSpacing:"0.01em",
                color: dir === "up" ? "#22c55e" : dir === "dn" ? "#ef4444" : text,
                transition:"color 0.15s",
              }}>
                {fmt(price)}
              </span>
            : <span style={{ fontSize:13, color:subtext }}>Connecting…</span>
          }

          {dir && (
            dir === "up"
              ? <TrendingUp  style={{ width:16, height:16, color:riseClr }} />
              : <TrendingDown style={{ width:16, height:16, color:fallClr }} />
          )}
        </div>

        {/* chart */}
        <div style={{ flex:1, minHeight:0 }}>
          <LightweightChart
            symbol={market.id}
            tradingMode
            onPriceUpdate={() => {}}
          />
        </div>
      </div>

      {/* ══════════ TRADE PANEL (right / bottom) ══════════ */}
      <div style={{
        width:290, flexShrink:0,
        display:"flex", flexDirection:"column",
        background:panelBg, borderLeft:`1px solid ${border}`,
        overflowY:"auto",
      }}>

        {/* ── balance strip (logged in only) ── */}
        {isLoggedIn && (
          <div style={{
            padding:"8px 14px", background:"#0f172a",
            borderBottom:`1px solid ${border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center",
          }}>
            <span style={{ fontSize:11, color:subtext, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.07em" }}>Balance</span>
            <span style={{ fontSize:14, fontWeight:700, color:text }}>
              {balance != null ? `${balance.toFixed(2)} ${currency}` : "—"}
            </span>
          </div>
        )}

        {/* ── contract type tabs ── */}
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${border}`, flexShrink:0 }}>
          {([
            ["rise_fall",   "Rise/Fall"],
            ["accumulators","Accum"],
            ["multipliers", "Multi"],
            ["digits",      "Digits"],
          ] as [Tab, string][]).map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex:1, padding:"9px 0", fontSize:11, fontWeight:700,
                color: tab === id ? "#2962ff" : subtext,
                background:"transparent", border:"none",
                borderBottom: tab === id ? "2px solid #2962ff" : "2px solid transparent",
                cursor:"pointer", transition:"all 0.15s",
                letterSpacing:"0.04em",
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ flex:1, padding:14, display:"flex", flexDirection:"column", gap:12 }}>

          {/* ─── RISE / FALL ─── */}
          {tab === "rise_fall" && (
            <>
              {/* Duration */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Duration</label>
                <div style={{
                  display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
                  gap:5,
                }}>
                  {TICKS.slice(0, 6).map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setTickIdx(i)}
                      style={{
                        padding:"5px 4px", fontSize:11, fontWeight:600,
                        borderRadius:7, cursor:"pointer",
                        background: tickIdx === i ? "#2962ff" : inputBg,
                        color:      tickIdx === i ? "#fff" : subtext,
                        border:`1px solid ${tickIdx === i ? "#2962ff" : border}`,
                        transition:"all 0.15s",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* minute durations */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:5, marginTop:5 }}>
                  {TICKS.slice(6).map((t, i) => (
                    <button
                      key={i+6}
                      onClick={() => setTickIdx(i+6)}
                      style={{
                        padding:"5px 4px", fontSize:11, fontWeight:600,
                        borderRadius:7, cursor:"pointer",
                        background: tickIdx === i+6 ? "#2962ff" : inputBg,
                        color:      tickIdx === i+6 ? "#fff" : subtext,
                        border:`1px solid ${tickIdx === i+6 ? "#2962ff" : border}`,
                        transition:"all 0.15s",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stake */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Stake ({currency})</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:13, color:subtext, fontWeight:600 }}>$</span>
                  <input
                    type="number"
                    value={stake}
                    min="1"
                    onChange={e => setStake(e.target.value)}
                    style={{
                      width:"100%", boxSizing:"border-box",
                      background:inputBg, border:`1px solid ${border}`,
                      borderRadius:8, padding:"9px 12px 9px 26px",
                      color:text, fontSize:14, fontWeight:700,
                      outline:"none",
                    }}
                  />
                </div>
              </div>

              {/* Payout */}
              <div style={{
                background:"#0f172a", borderRadius:9, padding:"10px 13px",
                border:`1px solid ${border}`,
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:11, color:subtext, textTransform:"uppercase", letterSpacing:"0.07em", fontWeight:600 }}>Payout</span>
                  <span style={{ fontSize:11, color:subtext }}>Profit</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:15, fontWeight:700, color:text }}>
                    {proposal ? `$${proposal.payout.toFixed(2)}` : "—"}
                  </span>
                  <span style={{ fontSize:13, fontWeight:700, color:riseClr }}>
                    {pct ? `+${pct}%` : "—"}
                  </span>
                </div>
              </div>

              {/* Trade result banner */}
              {result && (
                <div style={{
                  background: result.ok ? "#14532d" : "#450a0a",
                  border: `1px solid ${result.ok ? "#16a34a" : "#991b1b"}`,
                  borderRadius:9, padding:"10px 12px",
                  display:"flex", alignItems:"center", gap:8,
                }}>
                  {result.ok
                    ? <Check style={{ width:16, height:16, color:riseClr, flexShrink:0 }} />
                    : <AlertCircle style={{ width:16, height:16, color:fallClr, flexShrink:0 }} />
                  }
                  <span style={{ fontSize:12, color:text, flex:1 }}>{result.msg}</span>
                  <button onClick={clearResult} style={{ background:"transparent", border:"none", color:subtext, cursor:"pointer", padding:0, flexShrink:0 }}>
                    <X style={{ width:14, height:14 }} />
                  </button>
                </div>
              )}

              {/* Buy buttons */}
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:"auto" }}>
                <button
                  onClick={() => handleBuy("CALL")}
                  disabled={loading || (!proposal && isLoggedIn)}
                  style={{
                    width:"100%", padding:"13px 0",
                    background: loading ? "#166534" : riseClr,
                    color:"#fff", fontWeight:800, fontSize:14,
                    borderRadius:10, border:"none", cursor: loading ? "wait" : "pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    boxShadow:"0 4px 20px rgba(34,197,94,0.3)",
                    transition:"all 0.15s", opacity: (!proposal && isLoggedIn && !loading) ? 0.6 : 1,
                  }}
                >
                  {loading
                    ? <Loader2 style={{ width:16, height:16, animation:"spin 1s linear infinite" }} />
                    : <TrendingUp style={{ width:16, height:16 }} />
                  }
                  {loading ? "Placing…" : "Buy Rise"}
                </button>

                <button
                  onClick={() => handleBuy("PUT")}
                  disabled={loading || (!proposal && isLoggedIn)}
                  style={{
                    width:"100%", padding:"13px 0",
                    background: loading ? "#991b1b" : fallClr,
                    color:"#fff", fontWeight:800, fontSize:14,
                    borderRadius:10, border:"none", cursor: loading ? "wait" : "pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    boxShadow:"0 4px 20px rgba(239,68,68,0.3)",
                    transition:"all 0.15s", opacity: (!proposal && isLoggedIn && !loading) ? 0.6 : 1,
                  }}
                >
                  {loading
                    ? <Loader2 style={{ width:16, height:16, animation:"spin 1s linear infinite" }} />
                    : <TrendingDown style={{ width:16, height:16 }} />
                  }
                  {loading ? "Placing…" : "Buy Fall"}
                </button>
              </div>
            </>
          )}

          {/* ─── ACCUMULATORS ─── */}
          {tab === "accumulators" && (
            <>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Growth Rate</label>
                <div style={{ display:"flex", gap:5 }}>
                  {ACC_GROWTH.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => setGrowth(i)}
                      style={{
                        flex:1, padding:"7px 0", fontSize:12, fontWeight:700,
                        borderRadius:8, cursor:"pointer",
                        background: growth === i ? "#2962ff" : inputBg,
                        color:      growth === i ? "#fff" : subtext,
                        border:`1px solid ${growth === i ? "#2962ff" : border}`,
                        transition:"all 0.15s",
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Stake ({currency})</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:13, color:subtext, fontWeight:600 }}>$</span>
                  <input
                    type="number" value={stake} min="1"
                    onChange={e => setStake(e.target.value)}
                    style={{
                      width:"100%", boxSizing:"border-box",
                      background:inputBg, border:`1px solid ${border}`,
                      borderRadius:8, padding:"9px 12px 9px 26px",
                      color:text, fontSize:14, fontWeight:700, outline:"none",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginTop:"auto", background:"#162032", borderRadius:9, padding:"11px 13px", border:`1px solid ${border}`, fontSize:12, color:subtext, lineHeight:1.6 }}>
                Accumulate profits with every tick. Closes automatically when profit target is hit or barrier is breached.
              </div>
              <button
                onClick={() => { if (!isLoggedIn) setShowAuth(true); }}
                style={{
                  width:"100%", padding:"13px 0",
                  background:"#2962ff", color:"#fff",
                  fontWeight:800, fontSize:14, borderRadius:10,
                  border:"none", cursor:"pointer",
                  boxShadow:"0 4px 20px rgba(41,98,255,0.3)",
                }}
              >
                Buy Accumulator
              </button>
            </>
          )}

          {/* ─── MULTIPLIERS ─── */}
          {tab === "multipliers" && (
            <>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Multiplier</label>
                <div style={{ display:"flex", gap:5 }}>
                  {MUL_VALUES.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => setMul(i)}
                      style={{
                        flex:1, padding:"7px 0", fontSize:11, fontWeight:700,
                        borderRadius:8, cursor:"pointer",
                        background: mul === i ? "#2962ff" : inputBg,
                        color:      mul === i ? "#fff" : subtext,
                        border:`1px solid ${mul === i ? "#2962ff" : border}`,
                        transition:"all 0.15s",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Stake ({currency})</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:13, color:subtext, fontWeight:600 }}>$</span>
                  <input
                    type="number" value={stake} min="1"
                    onChange={e => setStake(e.target.value)}
                    style={{
                      width:"100%", boxSizing:"border-box",
                      background:inputBg, border:`1px solid ${border}`,
                      borderRadius:8, padding:"9px 12px 9px 26px",
                      color:text, fontSize:14, fontWeight:700, outline:"none",
                    }}
                  />
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginTop:"auto" }}>
                <button
                  onClick={() => { if (!isLoggedIn) setShowAuth(true); }}
                  style={{
                    flex:1, padding:"13px 0",
                    background:riseClr, color:"#fff",
                    fontWeight:800, fontSize:13, borderRadius:10,
                    border:"none", cursor:"pointer",
                    boxShadow:"0 4px 20px rgba(34,197,94,0.3)",
                  }}
                >
                  Up ×{MUL_VALUES[mul].replace("×","").trim()}
                </button>
                <button
                  onClick={() => { if (!isLoggedIn) setShowAuth(true); }}
                  style={{
                    flex:1, padding:"13px 0",
                    background:fallClr, color:"#fff",
                    fontWeight:800, fontSize:13, borderRadius:10,
                    border:"none", cursor:"pointer",
                    boxShadow:"0 4px 20px rgba(239,68,68,0.3)",
                  }}
                >
                  Down ×{MUL_VALUES[mul].replace("×","").trim()}
                </button>
              </div>
            </>
          )}

          {/* ─── DIGITS ─── */}
          {tab === "digits" && (
            <>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Digit Type</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                  {DIGIT_TYPES.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setDigitType(i)}
                      style={{
                        padding:"7px 0", fontSize:12, fontWeight:700,
                        borderRadius:8, cursor:"pointer",
                        background: digitType === i ? "#2962ff" : inputBg,
                        color:      digitType === i ? "#fff" : subtext,
                        border:`1px solid ${digitType === i ? "#2962ff" : border}`,
                        transition:"all 0.15s",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Digit</label>
                <input
                  type="number" value={digitVal} min="0" max="9"
                  onChange={e => setDigitVal(e.target.value)}
                  style={{
                    width:"100%", boxSizing:"border-box",
                    background:inputBg, border:`1px solid ${border}`,
                    borderRadius:8, padding:"9px 12px",
                    color:text, fontSize:14, fontWeight:700, outline:"none",
                  }}
                />
              </div>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:600, color:subtext, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>Stake ({currency})</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", fontSize:13, color:subtext, fontWeight:600 }}>$</span>
                  <input
                    type="number" value={stake} min="1"
                    onChange={e => setStake(e.target.value)}
                    style={{
                      width:"100%", boxSizing:"border-box",
                      background:inputBg, border:`1px solid ${border}`,
                      borderRadius:8, padding:"9px 12px 9px 26px",
                      color:text, fontSize:14, fontWeight:700, outline:"none",
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => { if (!isLoggedIn) setShowAuth(true); }}
                style={{
                  width:"100%", padding:"13px 0", marginTop:"auto",
                  background:"#2962ff", color:"#fff",
                  fontWeight:800, fontSize:14, borderRadius:10,
                  border:"none", cursor:"pointer",
                  boxShadow:"0 4px 20px rgba(41,98,255,0.3)",
                }}
              >
                Buy Contract
              </button>
            </>
          )}

          {/* ── login prompt when not signed in ── */}
          {!isLoggedIn && (
            <div style={{
              background:"#1e293b", borderRadius:10, padding:"12px 14px",
              border:`1px solid ${border}`, textAlign:"center", marginTop:8,
            }}>
              <p style={{ margin:"0 0 8px", fontSize:12, color:subtext, lineHeight:1.5 }}>
                Log in to place real trades and see live payout quotes.
              </p>
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  background:"#2962ff", color:"#fff",
                  fontWeight:700, fontSize:12, padding:"7px 18px",
                  borderRadius:8, border:"none", cursor:"pointer",
                }}
              >
                Log In / Sign Up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ══════════ MODALS ══════════ */}
      <AuthGateModal open={showAuth} onClose={() => setShowAuth(false)} />

      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
        input[type=number] { -moz-appearance:textfield; }
      `}</style>
    </div>
  );
}
