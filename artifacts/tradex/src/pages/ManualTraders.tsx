import {
  useState, useEffect, useRef, useCallback,
} from "react";
import {
  ChevronDown, TrendingUp, TrendingDown,
  Check, AlertCircle, Loader2, X,
  ToggleLeft, ToggleRight,
} from "lucide-react";
import LightweightChart from "@/components/LightweightChart";
import AuthGateModal   from "@/components/AuthGateModal";
import { useAuth, DERIV_APP_ID } from "@/context/AuthContext";

/* ──────────────────────────────── constants ── */

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

/* Duration units DTrader supports */
const DUR_UNITS = [
  { label: "Ticks",   value: "t" },
  { label: "Seconds", value: "s" },
  { label: "Minutes", value: "m" },
  { label: "Hours",   value: "h" },
  { label: "Days",    value: "d" },
];

const ACC_GROWTH  = ["1%", "2%", "3%", "4%", "5%"];
const MUL_VALUES  = ["10×", "20×", "30×", "50×", "100×"];
const DIGIT_TYPES = ["Matches", "Differs", "Over", "Under", "Even", "Odd"];

type Tab = "rise_fall" | "accumulators" | "multipliers" | "digits";

/* ──────────────────────────────── colours ── */
const C = {
  bg:      "#0f172a",
  panel:   "#0d1b2a",        /* slightly blue-dark — DTrader bottom panel tint */
  field:   "#1a2744",        /* field backgrounds */
  border:  "#243554",
  border2: "#1e3a5f",
  text:    "#f1f5f9",
  sub:     "#8899b4",
  rise:    "#008877",        /* DTrader teal-green */
  fall:    "#cc2e3d",        /* DTrader red */
  blue:    "#4b7fe8",
  accent:  "#4bb4b3",
};

/* ──────────────────────────────── live-price hook ── */

function useLivePrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [prev,  setPrev]  = useState<number | null>(null);
  const wsRef    = useRef<WebSocket | null>(null);
  const prevRef  = useRef<number | null>(null);
  const mountRef = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    setPrice(null); setPrev(null); prevRef.current = null;
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
          setPrev(prevRef.current);
          prevRef.current = q;
          setPrice(q);
        }
      } catch {}
    };
    ws.onerror = ws.onclose = () => {};
    return () => {
      mountRef.current = false;
      ws.onclose = null; ws.close();
    };
  }, [symbol]);

  const dir = prev == null || price == null ? null : price >= prev ? "up" : "dn";
  return { price, dir };
}

/* ──────────────────────────────── proposal / buy ── */

interface Proposal {
  id: string; payout: number; ask: number;
}

function useTrade() {
  const { activeAccount } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const wsRef    = useRef<WebSocket | null>(null);
  const reqRef   = useRef(1);
  const mountRef = useRef(true);

  const fetchProposal = useCallback((
    symbol: string, contractType: "CALL"|"PUT",
    duration: number, durationUnit: string, stake: string,
  ) => {
    if (!activeAccount) return;
    setProposal(null);
    wsRef.current?.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ authorize: activeAccount.token }));
    ws.onmessage = (e) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.error) return;
        if (msg.msg_type === "authorize") {
          ws.send(JSON.stringify({
            proposal: 1, subscribe: 1,
            amount: parseFloat(stake) || 1, basis: "stake",
            contract_type: contractType,
            currency: activeAccount.currency || "USD",
            duration, duration_unit: durationUnit, symbol,
            req_id: ++reqRef.current,
          }));
        }
        if (msg.msg_type === "proposal" && msg.proposal) {
          const p = msg.proposal;
          setProposal({ id: p.id, payout: p.payout, ask: p.ask_price });
        }
      } catch {}
    };
    ws.onerror = ws.onclose = () => {};
  }, [activeAccount]);

  const buy = useCallback((proposalId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    setLoading(true); setResult(null);
    wsRef.current.send(JSON.stringify({ buy: proposalId, price: 999999, req_id: ++reqRef.current }));
    wsRef.current.onmessage = (e) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.msg_type === "buy") {
          setResult(msg.error
            ? { ok: false, msg: msg.error.message }
            : { ok: true,  msg: `Placed! Contract #${msg.buy?.contract_id ?? ""}` });
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

/* ═══════════════════════════════════ component ═══ */

export default function ManualTraders() {
  const { isLoggedIn, balance, currency } = useAuth();

  const [market,    setMarket]   = useState(MARKETS[0]);
  const [mktOpen,   setMktOpen]  = useState(false);
  const [tab,       setTab]      = useState<Tab>("rise_fall");

  /* rise/fall inputs — DTrader style */
  const [durVal,    setDurVal]   = useState("5");
  const [durUnit,   setDurUnit]  = useState("t");   /* t=ticks, m=min, etc */
  const [stake,     setStake]    = useState("10");
  const [allowEq,   setAllowEq]  = useState(false);

  /* accumulators */
  const [growth,    setGrowth]   = useState(0);
  /* multipliers */
  const [mul,       setMul]      = useState(0);
  /* digits */
  const [digitType, setDigitType]= useState(0);
  const [digitVal,  setDigitVal] = useState("5");

  const [showAuth,  setShowAuth] = useState(false);

  const { price, dir } = useLivePrice(market.id);
  const { proposal, loading, result, fetchProposal, buy, clearResult } = useTrade();

  /* refetch proposal whenever inputs change */
  useEffect(() => {
    if (!isLoggedIn || tab !== "rise_fall") return;
    fetchProposal(market.id, "CALL", parseInt(durVal)||1, durUnit, stake);
  }, [isLoggedIn, tab, market.id, durVal, durUnit, stake]);

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });

  const pct = proposal
    ? (((proposal.payout - proposal.ask) / proposal.ask) * 100).toFixed(0)
    : null;

  function handleBuy(side: "CALL"|"PUT") {
    if (!isLoggedIn) { setShowAuth(true); return; }
    if (!proposal)   return;
    buy(proposal.id);
  }

  /* ── reusable field-row ──────────────────────────────── */
  function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div className="mt-field-row">
        <span className="mt-field-label">{label}</span>
        {children}
      </div>
    );
  }

  /* ── contract-type tab strip ─────────────────────────── */
  const tabStrip = (
    <div className="mt-tab-strip">
      {([
        ["rise_fall",    "Rise/Fall"   ],
        ["accumulators", "Accumulators"],
        ["multipliers",  "Multipliers" ],
        ["digits",       "Digits"      ],
      ] as [Tab, string][]).map(([id, lbl]) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={`mt-tab-btn${tab === id ? " active" : ""}`}
        >
          {lbl}
        </button>
      ))}
    </div>
  );

  /* ── Rise / Fall panel ───────────────────────────────── */
  const riseFallPanel = (
    <div className="mt-form">

      {/* Duration — DTrader style: number input + unit dropdown */}
      <FieldRow label="Duration">
        <div className="mt-dur-inputs">
          <input
            type="number"
            value={durVal}
            min="1"
            onChange={e => setDurVal(e.target.value)}
            className="mt-dur-num"
          />
          <select
            value={durUnit}
            onChange={e => setDurUnit(e.target.value)}
            className="mt-dur-unit"
          >
            {DUR_UNITS.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </FieldRow>

      {/* Stake */}
      <FieldRow label="Stake">
        <div className="mt-stake-wrap">
          <input
            type="number"
            value={stake}
            min="1"
            onChange={e => setStake(e.target.value)}
            className="mt-stake-input"
          />
          <span className="mt-currency">{currency || "USD"}</span>
        </div>
      </FieldRow>

      {/* Allow equals — DTrader toggle row */}
      <FieldRow label="Allow equals">
        <button
          className="mt-toggle"
          onClick={() => setAllowEq(v => !v)}
          aria-label="Toggle allow equals"
        >
          {allowEq
            ? <ToggleRight style={{ width: 32, height: 32, color: C.accent }} />
            : <ToggleLeft  style={{ width: 32, height: 32, color: C.sub    }} />
          }
        </button>
      </FieldRow>

      {/* Payout row */}
      <FieldRow label="Payout (est.)">
        <span className="mt-payout-val">
          {proposal
            ? <>
                <span style={{ color: C.text, fontWeight: 700 }}>
                  ${proposal.payout.toFixed(2)}
                </span>
                {pct && (
                  <span style={{ color: C.accent, fontSize: 11, marginLeft: 5 }}>
                    +{pct}%
                  </span>
                )}
              </>
            : <span style={{ color: C.sub }}>—</span>
          }
        </span>
      </FieldRow>

      {/* Result banner */}
      {result && (
        <div className={`mt-result ${result.ok ? "ok" : "err"}`}>
          {result.ok
            ? <Check      style={{ width: 15, height: 15, flexShrink: 0 }} />
            : <AlertCircle style={{ width: 15, height: 15, flexShrink: 0 }} />
          }
          <span>{result.msg}</span>
          <button onClick={clearResult} className="mt-clear-btn">
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}

      {/* Buy buttons — exact DTrader layout: two equal columns */}
      <div className="mt-buy-row">
        <button
          className="mt-btn-rise"
          onClick={() => handleBuy("CALL")}
          disabled={loading || (!proposal && isLoggedIn)}
        >
          {loading
            ? <Loader2 style={{ width: 16, height: 16, animation: "mt-spin 1s linear infinite" }} />
            : <TrendingUp style={{ width: 16, height: 16 }} />
          }
          <span>Rise</span>
          {proposal && !loading && (
            <span className="mt-btn-sub">${proposal.payout.toFixed(2)}</span>
          )}
        </button>

        <button
          className="mt-btn-fall"
          onClick={() => handleBuy("PUT")}
          disabled={loading || (!proposal && isLoggedIn)}
        >
          {loading
            ? <Loader2 style={{ width: 16, height: 16, animation: "mt-spin 1s linear infinite" }} />
            : <TrendingDown style={{ width: 16, height: 16 }} />
          }
          <span>Fall</span>
          {proposal && !loading && (
            <span className="mt-btn-sub">${proposal.ask.toFixed(2)}</span>
          )}
        </button>
      </div>
    </div>
  );

  /* ── Accumulators panel ──────────────────────────────── */
  const accumPanel = (
    <div className="mt-form">
      <FieldRow label="Growth Rate">
        <div className="mt-chip-row">
          {ACC_GROWTH.map((g, i) => (
            <button key={i} onClick={() => setGrowth(i)} className={`mt-chip${growth===i?" active":""}`}>{g}</button>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Stake">
        <div className="mt-stake-wrap">
          <input type="number" value={stake} min="1" onChange={e => setStake(e.target.value)} className="mt-stake-input" />
          <span className="mt-currency">{currency||"USD"}</span>
        </div>
      </FieldRow>
      <div className="mt-info-box">
        Accumulate profits with every tick. Position closes automatically when profit target is hit or barrier is breached.
      </div>
      <div className="mt-buy-row" style={{ marginTop: "auto" }}>
        <button className="mt-btn-rise" style={{ flex:1 }} onClick={() => { if (!isLoggedIn) setShowAuth(true); }}>
          <TrendingUp style={{ width:16, height:16 }} /><span>Buy Accumulator</span>
        </button>
      </div>
    </div>
  );

  /* ── Multipliers panel ───────────────────────────────── */
  const multiPanel = (
    <div className="mt-form">
      <FieldRow label="Multiplier">
        <div className="mt-chip-row">
          {MUL_VALUES.map((m, i) => (
            <button key={i} onClick={() => setMul(i)} className={`mt-chip${mul===i?" active":""}`}>{m}</button>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Stake">
        <div className="mt-stake-wrap">
          <input type="number" value={stake} min="1" onChange={e => setStake(e.target.value)} className="mt-stake-input" />
          <span className="mt-currency">{currency||"USD"}</span>
        </div>
      </FieldRow>
      <div className="mt-buy-row" style={{ marginTop: "auto" }}>
        <button className="mt-btn-rise" onClick={() => { if (!isLoggedIn) setShowAuth(true); }}>
          <TrendingUp style={{ width:16, height:16 }} /><span>Up ×{MUL_VALUES[mul].replace("×","")}</span>
        </button>
        <button className="mt-btn-fall" onClick={() => { if (!isLoggedIn) setShowAuth(true); }}>
          <TrendingDown style={{ width:16, height:16 }} /><span>Down ×{MUL_VALUES[mul].replace("×","")}</span>
        </button>
      </div>
    </div>
  );

  /* ── Digits panel ────────────────────────────────────── */
  const digitsPanel = (
    <div className="mt-form">
      <FieldRow label="Digit Type">
        <div className="mt-chip-row" style={{ flexWrap:"wrap", gap: 5 }}>
          {DIGIT_TYPES.map((d, i) => (
            <button key={i} onClick={() => setDigitType(i)} className={`mt-chip${digitType===i?" active":""}`}>{d}</button>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Digit">
        <input type="number" value={digitVal} min="0" max="9" onChange={e => setDigitVal(e.target.value)} className="mt-stake-input" style={{ maxWidth: 80 }} />
      </FieldRow>
      <FieldRow label="Stake">
        <div className="mt-stake-wrap">
          <input type="number" value={stake} min="1" onChange={e => setStake(e.target.value)} className="mt-stake-input" />
          <span className="mt-currency">{currency||"USD"}</span>
        </div>
      </FieldRow>
      <div className="mt-buy-row" style={{ marginTop: "auto" }}>
        <button className="mt-btn-rise" style={{ flex:1 }} onClick={() => { if (!isLoggedIn) setShowAuth(true); }}>
          <TrendingUp style={{ width:16, height:16 }} /><span>Buy Contract</span>
        </button>
      </div>
    </div>
  );

  /* ── Market header bar ───────────────────────────────── */
  const marketBar = (
    <div className="mt-market-bar">
      {/* Market selector */}
      <div className="mt-mkt-wrap">
        <button className="mt-mkt-btn" onClick={() => setMktOpen(o => !o)}>
          <span className="mt-mkt-label">{market.label}</span>
          <ChevronDown style={{ width:13, height:13, color:C.sub, flexShrink:0 }} />
        </button>

        {mktOpen && (
          <>
            <div onClick={() => setMktOpen(false)} style={{ position:"fixed", inset:0, zIndex:38 }} />
            <div className="mt-mkt-dropdown">
              {MARKETS.map(m => (
                <div
                  key={m.id}
                  className={`mt-mkt-item${m.id===market.id?" sel":""}`}
                  onClick={() => { setMarket(m); setMktOpen(false); }}
                >
                  {m.label}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Live price — green/red on tick direction */}
      <div className="mt-price-block">
        {price != null
          ? <>
              <span className={`mt-price-val ${dir==="up"?"up":dir==="dn"?"dn":""}`}>
                {fmt(price)}
              </span>
              {dir === "up"
                ? <TrendingUp  style={{ width:13, height:13, color:C.accent, flexShrink:0 }} />
                : dir === "dn"
                ? <TrendingDown style={{ width:13, height:13, color:"#ef4444", flexShrink:0 }} />
                : null
              }
            </>
          : <span style={{ fontSize:12, color:C.sub }}>Connecting…</span>
        }
      </div>

      {/* Balance (logged-in only) */}
      {isLoggedIn && balance != null && (
        <span className="mt-balance">
          {balance.toFixed(2)} {currency}
        </span>
      )}
    </div>
  );

  return (
    <>
      {/* ─────────────────── scoped styles ─────────────────── */}
      <style>{`
        /* ── root ── */
        .mt-root {
          display: flex;
          flex-direction: row;
          height: calc(100dvh - 132px);
          background: ${C.bg};
          overflow: hidden;
          font-family: 'IBM Plex Sans','Inter',system-ui,sans-serif;
          color: ${C.text};
        }

        /* ── chart column (left on desktop, top on mobile) ── */
        .mt-chart-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .mt-chart-area {
          flex: 1;
          min-height: 0;
        }

        /* ── trade panel (right on desktop, bottom on mobile) ── */
        .mt-panel {
          width: 300px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: ${C.panel};
          border-left: 1px solid ${C.border};
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* ── market bar ── */
        .mt-market-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 12px;
          height: 46px;
          background: ${C.bg};
          border-bottom: 1px solid ${C.border};
          flex-shrink: 0;
        }
        .mt-mkt-wrap { position: relative; }
        .mt-mkt-btn {
          display: flex; align-items: center; gap: 5px;
          background: ${C.field}; border: 1px solid ${C.border};
          border-radius: 8px; padding: 5px 9px;
          color: ${C.text}; font-size: 13px; font-weight: 600;
          cursor: pointer; white-space: nowrap;
        }
        .mt-mkt-label { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mt-mkt-dropdown {
          position: absolute; top: calc(100% + 5px); left: 0; z-index: 39;
          background: #162135; border: 1px solid ${C.border};
          border-radius: 10px; padding: 4px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          max-height: 280px; overflow-y: auto; min-width: 230px;
        }
        .mt-mkt-item {
          padding: 8px 12px; font-size: 13px; color: ${C.text};
          cursor: pointer; border-radius: 7px;
        }
        .mt-mkt-item:hover { background: rgba(75,126,232,0.15); }
        .mt-mkt-item.sel   { background: rgba(75,126,232,0.2); font-weight: 700; }

        /* price */
        .mt-price-block { display: flex; align-items: center; gap: 4px; }
        .mt-price-val {
          font-size: 17px; font-weight: 800;
          letter-spacing: 0.01em; font-variant-numeric: tabular-nums;
          color: ${C.text}; transition: color 0.15s;
        }
        .mt-price-val.up { color: ${C.accent}; }
        .mt-price-val.dn { color: #ef4444; }
        .mt-balance {
          margin-left: auto; font-size: 12px; font-weight: 600;
          color: ${C.sub}; white-space: nowrap;
        }

        /* ── contract type tab strip ── */
        .mt-tab-strip {
          display: flex;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          border-bottom: 1px solid ${C.border};
          flex-shrink: 0;
          scrollbar-width: none;
        }
        .mt-tab-strip::-webkit-scrollbar { display: none; }
        .mt-tab-btn {
          flex-shrink: 0;
          padding: 10px 14px;
          font-size: 12px; font-weight: 700;
          color: ${C.sub}; background: transparent; border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer; transition: all 0.15s;
          white-space: nowrap; letter-spacing: 0.03em;
        }
        .mt-tab-btn.active {
          color: ${C.accent};
          border-bottom-color: ${C.accent};
        }

        /* ── form area ── */
        .mt-form {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow-y: auto;
        }

        /* ── field row — exact DTrader pattern ── */
        .mt-field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          height: 54px;
          border-bottom: 1px solid ${C.border};
          flex-shrink: 0;
          gap: 10px;
        }
        .mt-field-label {
          font-size: 13px; font-weight: 500; color: ${C.sub};
          flex-shrink: 0;
        }

        /* Duration — two inputs side by side */
        .mt-dur-inputs { display: flex; gap: 6px; align-items: center; }
        .mt-dur-num {
          width: 56px;
          background: ${C.field}; border: 1px solid ${C.border2};
          border-radius: 7px; padding: 7px 10px;
          color: ${C.text}; font-size: 14px; font-weight: 700;
          text-align: center; outline: none;
        }
        .mt-dur-unit {
          background: ${C.field}; border: 1px solid ${C.border2};
          border-radius: 7px; padding: 7px 10px;
          color: ${C.text}; font-size: 13px; font-weight: 600;
          outline: none; cursor: pointer; appearance: auto;
        }

        /* Stake */
        .mt-stake-wrap { display: flex; align-items: center; gap: 6px; }
        .mt-stake-input {
          width: 90px;
          background: ${C.field}; border: 1px solid ${C.border2};
          border-radius: 7px; padding: 7px 10px;
          color: ${C.text}; font-size: 14px; font-weight: 700;
          text-align: right; outline: none;
        }
        .mt-currency { font-size: 12px; font-weight: 600; color: ${C.sub}; }

        /* Allow equals toggle */
        .mt-toggle {
          background: transparent; border: none; cursor: pointer; padding: 0;
          display: flex; align-items: center;
        }

        /* Payout */
        .mt-payout-val { display: flex; align-items: center; }

        /* Result banner */
        .mt-result {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 14px; font-size: 12px;
          flex-shrink: 0;
        }
        .mt-result.ok  { background: #0d3320; color: #4ade80; }
        .mt-result.err { background: #3b0a0a; color: #f87171; }
        .mt-clear-btn { background:transparent; border:none; cursor:pointer; padding:0; margin-left:auto; color:inherit; }

        /* ── Buy buttons — DTrader two-column ── */
        .mt-buy-row {
          display: flex;
          gap: 1px;
          padding: 10px 10px;
          flex-shrink: 0;
        }
        .mt-btn-rise, .mt-btn-fall {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 14px 8px;
          border: none; border-radius: 10px;
          font-size: 15px; font-weight: 800;
          cursor: pointer; transition: all 0.15s;
          min-height: 64px;
        }
        .mt-btn-rise { background: ${C.rise}; color: #fff; margin-right: 5px; box-shadow: 0 3px 16px rgba(0,136,119,0.35); }
        .mt-btn-fall { background: ${C.fall}; color: #fff; box-shadow: 0 3px 16px rgba(204,46,61,0.35); }
        .mt-btn-rise:disabled, .mt-btn-fall:disabled { opacity: 0.5; cursor: not-allowed; }
        .mt-btn-sub { font-size: 11px; font-weight: 500; opacity: 0.85; }

        /* chips (for accum/multi/digits) */
        .mt-chip-row { display: flex; gap: 5px; flex-wrap: nowrap; }
        .mt-chip {
          flex: 1; padding: 6px 4px;
          background: ${C.field}; border: 1px solid ${C.border};
          border-radius: 7px; color: ${C.sub};
          font-size: 12px; font-weight: 700;
          cursor: pointer; transition: all 0.15s; text-align: center;
        }
        .mt-chip.active { background: ${C.blue}; border-color: ${C.blue}; color: #fff; }

        .mt-info-box {
          margin: 10px 14px; padding: 10px 12px;
          background: #0f2040; border-radius: 8px;
          border: 1px solid ${C.border};
          font-size: 11px; color: ${C.sub}; line-height: 1.6;
        }

        /* Login prompt */
        .mt-login-prompt {
          margin: 0 14px 14px;
          padding: 12px 14px;
          background: #0f2040; border-radius: 10px;
          border: 1px solid ${C.border};
          text-align: center;
          flex-shrink: 0;
        }

        /* ──────────────────────────────── MOBILE ≤ 767px ── */
        @media (max-width: 767px) {
          .mt-root {
            flex-direction: column;
            overflow-y: auto;
            height: calc(100dvh - 132px);
          }
          /* Chart: 55% of available height */
          .mt-chart-col {
            flex: none;
            width: 100%;
            height: 55%;
          }
          .mt-chart-area {
            flex: 1;
          }
          /* Panel: remaining 45% */
          .mt-panel {
            flex: none;
            width: 100%;
            height: 45%;
            border-left: none;
            border-top: 1px solid ${C.border};
            overflow-y: auto;
          }
          /* Compact market bar */
          .mt-market-bar {
            height: 40px;
            padding: 0 10px;
          }
          .mt-mkt-label { max-width: 130px; font-size: 12px; }
          .mt-price-val { font-size: 15px; }

          /* Tabs compact */
          .mt-tab-btn { padding: 8px 12px; font-size: 11px; }

          /* Field rows compact */
          .mt-field-row { height: 48px; padding: 0 10px; }
          .mt-field-label { font-size: 12px; }

          /* Inputs */
          .mt-dur-num  { width: 48px; padding: 6px 8px; font-size: 13px; }
          .mt-dur-unit { padding: 6px 8px; font-size: 12px; }
          .mt-stake-input { width: 76px; padding: 6px 8px; font-size: 13px; }

          /* Buy buttons compact */
          .mt-buy-row { padding: 8px; }
          .mt-btn-rise, .mt-btn-fall { min-height: 54px; padding: 10px 8px; font-size: 14px; }
        }

        /* ── spin animation ── */
        @keyframes mt-spin { to { transform: rotate(360deg); } }

        /* ── number input: hide spinners ── */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ──────────────────────────── render ── */}
      <div className="mt-root">

        {/* LEFT / TOP: chart column */}
        <div className="mt-chart-col">
          {marketBar}
          <div className="mt-chart-area">
            <LightweightChart symbol={market.id} tradingMode onPriceUpdate={() => {}} />
          </div>
        </div>

        {/* RIGHT / BOTTOM: trade panel */}
        <div className="mt-panel">
          {tabStrip}

          {/* Tab content */}
          {tab === "rise_fall"    && riseFallPanel}
          {tab === "accumulators" && accumPanel}
          {tab === "multipliers"  && multiPanel}
          {tab === "digits"       && digitsPanel}

          {/* Login prompt — all tabs */}
          {!isLoggedIn && (
            <div className="mt-login-prompt">
              <p style={{ margin: "0 0 8px", fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
                Log in to place real trades and see live payout quotes.
              </p>
              <button
                onClick={() => setShowAuth(true)}
                style={{
                  background: C.blue, color: "#fff", fontWeight: 700,
                  fontSize: 12, padding: "7px 20px",
                  borderRadius: 8, border: "none", cursor: "pointer",
                }}
              >
                Log In / Sign Up
              </button>
            </div>
          )}
        </div>

      </div>

      <AuthGateModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
