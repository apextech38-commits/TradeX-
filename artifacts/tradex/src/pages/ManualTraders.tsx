import {
  useState, useEffect, useRef, useCallback, useMemo,
} from "react";
import {
  ChevronDown, TrendingUp, Minus, Plus,
  Check, AlertCircle, Loader2, X,
} from "lucide-react";
import LightweightChart from "@/components/LightweightChart";
import AuthGateModal    from "@/components/AuthGateModal";
import { useAuth, DERIV_APP_ID } from "@/context/AuthContext";

/* ─────────────────────────── constants ── */

const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

const MARKETS = [
  { label: "Volatility 100 (1s)", id: "1HZ100V"    },
  { label: "Volatility 100",      id: "R_100"       },
  { label: "Volatility 75 (1s)",  id: "1HZ75V"      },
  { label: "Volatility 75",       id: "R_75"        },
  { label: "Volatility 50 (1s)",  id: "1HZ50V"      },
  { label: "Volatility 50",       id: "R_50"        },
  { label: "Volatility 25 (1s)",  id: "1HZ25V"      },
  { label: "Volatility 25",       id: "R_25"        },
  { label: "Volatility 10 (1s)",  id: "1HZ10V"      },
  { label: "Volatility 10",       id: "R_10"        },
  { label: "Boom 1000",           id: "BOOM1000N"   },
  { label: "Boom 500",            id: "BOOM500N"    },
  { label: "Crash 1000",          id: "CRASH1000N"  },
  { label: "Crash 500",           id: "CRASH500N"   },
  { label: "Step Index",          id: "stpRNG100"   },
  { label: "Jump 100",            id: "JD100"       },
  { label: "Jump 75",             id: "JD75"        },
  { label: "Jump 50",             id: "JD50"        },
];

type ContractType = "accumulators" | "rise_fall" | "multipliers";

const CONTRACT_LABELS: Record<ContractType, string> = {
  accumulators: "Accumulators",
  rise_fall:    "Rise / Fall",
  multipliers:  "Multipliers",
};

const GROWTH_RATES = [1, 2, 3, 4, 5];

/* ─────────────────────────── colours (TradeX theme) ── */
const C = {
  bg:      "#0f172a",
  panel:   "#0b1628",
  row:     "#111f36",
  field:   "#162240",
  border:  "#1e3357",
  text:    "#f0f4ff",
  sub:     "#7b93b8",
  accent:  "#3b82f6",
  green:   "#00c076",   /* vivid green for buy button */
  rise:    "#00b896",
  fall:    "#e53935",
  chip:    "#1a2d4a",
  chipSel: "#2563eb",
};

/* ─────────────────────────── live-price hook ── */

function useLivePrice(symbol: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [dir,   setDir]   = useState<"up"|"dn"|null>(null);
  const prev    = useRef<number | null>(null);
  const ws      = useRef<WebSocket | null>(null);
  const alive   = useRef(true);

  useEffect(() => {
    alive.current = true;
    setPrice(null); setDir(null); prev.current = null;
    const sock = new WebSocket(WS_URL);
    ws.current = sock;
    sock.onopen = () => {
      if (!alive.current) return;
      sock.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    };
    sock.onmessage = (e) => {
      if (!alive.current) return;
      try {
        const m = JSON.parse(e.data as string);
        if (m.msg_type === "tick") {
          const q: number = m.tick.quote;
          setDir(prev.current == null ? null : q >= prev.current ? "up" : "dn");
          prev.current = q;
          setPrice(q);
        }
      } catch {}
    };
    sock.onerror = sock.onclose = () => {};
    return () => {
      alive.current = false;
      sock.onclose = null;
      sock.close();
    };
  }, [symbol]);

  return { price, dir };
}

/* ─────────────────────────── proposal hook ── */

interface Proposal { id: string; payout: number; ask: number; }

function useProposal() {
  const { activeAccount } = useAuth();
  const [data,    setData]    = useState<Proposal | null>(null);
  const [buying,  setBuying]  = useState(false);
  const [result,  setResult]  = useState<{ ok: boolean; msg: string } | null>(null);
  const ws    = useRef<WebSocket | null>(null);
  const seq   = useRef(1);
  const alive = useRef(true);

  const fetch = useCallback((
    symbol: string, ctype: ContractType,
    stake: string, growth: number,
  ) => {
    if (!activeAccount) return;
    setData(null);
    ws.current?.close();
    const sock = new WebSocket(WS_URL);
    ws.current = sock;
    sock.onopen = () => sock.send(JSON.stringify({ authorize: activeAccount.token }));
    sock.onmessage = (e) => {
      if (!alive.current) return;
      try {
        const m = JSON.parse(e.data as string);
        if (m.error) return;
        if (m.msg_type === "authorize") {
          const base = {
            proposal: 1, subscribe: 1,
            amount: parseFloat(stake) || 1, basis: "stake",
            currency: activeAccount.currency || "USD",
            symbol,
            req_id: ++seq.current,
          };
          if (ctype === "accumulators") {
            sock.send(JSON.stringify({ ...base, contract_type: "ACCU", growth_rate: growth / 100 }));
          } else if (ctype === "rise_fall") {
            sock.send(JSON.stringify({ ...base, contract_type: "CALL", duration: 5, duration_unit: "t" }));
          } else {
            sock.send(JSON.stringify({ ...base, contract_type: "MULTUP", multiplier: 10, duration: 0, duration_unit: "d" }));
          }
        }
        if (m.msg_type === "proposal" && m.proposal) {
          const p = m.proposal;
          setData({ id: p.id, payout: p.payout ?? p.ask_price * 1.95, ask: p.ask_price });
        }
      } catch {}
    };
    sock.onerror = sock.onclose = () => {};
  }, [activeAccount]);

  const buy = useCallback((proposalId: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) return;
    setBuying(true); setResult(null);
    ws.current.send(JSON.stringify({ buy: proposalId, price: 999999, req_id: ++seq.current }));
    const prev = ws.current.onmessage;
    ws.current.onmessage = (e) => {
      if (!alive.current) return;
      try {
        const m = JSON.parse(e.data as string);
        if (m.msg_type === "buy") {
          setResult(m.error
            ? { ok: false, msg: m.error.message }
            : { ok: true,  msg: `Placed! #${m.buy?.contract_id ?? ""}` });
          setBuying(false);
        }
      } catch {}
    };
    void prev;
  }, []);

  const clear = useCallback(() => setResult(null), []);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; ws.current?.close(); };
  }, []);

  return { data, buying, result, fetch, buy, clear };
}

/* ═══════════════════════════════ component ═══ */

export default function ManualTraders() {
  const { isLoggedIn, balance, currency } = useAuth();

  /* market */
  const [market,   setMarket]   = useState(MARKETS[0]);
  const [mktOpen,  setMktOpen]  = useState(false);

  /* contract type */
  const [ctype,    setCtype]    = useState<ContractType>("accumulators");
  const [ctOpen,   setCtOpen]   = useState(false);

  /* accumulators */
  const [growth,   setGrowth]   = useState(1);   /* 1 = 1% */

  /* stake stepper */
  const [stake,    setStake]    = useState(10);

  /* take profit */
  const [tpOn,     setTpOn]     = useState(false);
  const [tpAmt,    setTpAmt]    = useState(50);

  const [showAuth, setShowAuth] = useState(false);

  const { price, dir }                   = useLivePrice(market.id);
  const { data: prop, buying, result,
          fetch: fetchProp, buy, clear } = useProposal();

  /* fetch proposal whenever inputs change */
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchProp(market.id, ctype, String(stake), growth);
  }, [isLoggedIn, market.id, ctype, stake, growth]);

  /* max payout (Deriv accumulators limit) */
  const MAX_PAYOUT = 6000;

  /* estimated max ticks for accumulators */
  const maxTicks = useMemo(() => {
    if (ctype !== "accumulators" || stake <= 0) return null;
    return Math.floor(Math.log(MAX_PAYOUT / stake) / Math.log(1 + growth / 100));
  }, [ctype, stake, growth]);

  const fmt = (n: number, dp = 2) =>
    n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

  function handleBuy() {
    if (!isLoggedIn) { setShowAuth(true); return; }
    if (!prop) return;
    buy(prop.id);
  }

  function stepStake(delta: number) {
    setStake(s => Math.max(1, parseFloat((s + delta).toFixed(2))));
  }

  /* ── rise/fall direction state (only for rise_fall tab) ── */
  const [rfDir, setRfDir] = useState<"CALL"|"PUT">("CALL");

  /* ─────────────────────────── render ── */
  return (
    <>
      {/* ═══════════════════ scoped styles ═══════════════════ */}
      <style>{`
        /* ── root wrapper — NO scrolling ── */
        .mt-root {
          --avail: calc(100dvh - 132px);
          display: flex;
          flex-direction: column;
          height: var(--avail);
          overflow: hidden;
          background: ${C.bg};
          font-family: 'IBM Plex Sans','Inter',system-ui,sans-serif;
          color: ${C.text};
          position: relative;
        }

        /* ── chart section ── */
        .mt-chart-wrap {
          flex: 0 0 53%;
          min-height: 0;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        /* ── panel section ── */
        .mt-panel {
          flex: 1;
          min-height: 0;
          background: ${C.panel};
          border-top: 1px solid ${C.border};
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ─── market + price row ─── */
        .mt-market-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          height: 44px;
          background: ${C.bg};
          border-bottom: 1px solid ${C.border};
          flex-shrink: 0;
        }

        /* market picker */
        .mt-mkt-btn {
          display: flex; align-items: center; gap: 5px;
          background: ${C.field}; border: 1px solid ${C.border};
          border-radius: 8px; padding: 5px 10px;
          color: ${C.text}; font-size: 12px; font-weight: 700;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
          max-width: 175px;
        }
        .mt-mkt-label {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mt-dropdown {
          position: fixed; z-index: 50;
          background: #0d1e36; border: 1px solid ${C.border};
          border-radius: 10px; padding: 4px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.7);
          max-height: 260px; overflow-y: auto; min-width: 210px;
        }
        .mt-dd-item {
          padding: 8px 12px; font-size: 12px; font-weight: 600;
          color: ${C.text}; cursor: pointer; border-radius: 7px;
          transition: background 0.1s;
        }
        .mt-dd-item:hover { background: rgba(59,130,246,0.15); }
        .mt-dd-item.sel   { background: rgba(59,130,246,0.22); color: #60a5fa; }

        /* live price */
        .mt-price {
          margin-left: auto;
          display: flex; align-items: center; gap: 4px;
          font-size: 18px; font-weight: 800;
          letter-spacing: 0.01em; font-variant-numeric: tabular-nums;
          transition: color 0.12s;
        }
        .mt-price.up { color: ${C.rise}; }
        .mt-price.dn { color: ${C.fall}; }
        .mt-price.neutral { color: ${C.text}; }

        .mt-balance-chip {
          font-size: 11px; font-weight: 600;
          color: ${C.sub}; white-space: nowrap; flex-shrink: 0;
        }

        /* ─── controls stack (below market row) ─── */
        .mt-controls {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 10px 12px;
          gap: 8px;
          overflow: hidden;
        }

        /* ─── section rows ─── */
        .mt-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: ${C.row};
          border: 1px solid ${C.border};
          border-radius: 10px;
          padding: 9px 12px;
          flex-shrink: 0;
        }
        .mt-row-label {
          font-size: 11px; font-weight: 600; color: ${C.sub};
          text-transform: uppercase; letter-spacing: 0.06em;
          white-space: nowrap; flex-shrink: 0;
        }

        /* contract type selector */
        .mt-ct-btn {
          display: flex; align-items: center; gap: 5px;
          background: ${C.field}; border: 1px solid ${C.border};
          border-radius: 8px; padding: 5px 10px;
          color: ${C.text}; font-size: 12px; font-weight: 700;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
        }

        /* growth chips */
        .mt-chips {
          display: flex; gap: 5px; margin-left: auto;
        }
        .mt-chip {
          min-width: 34px; padding: 5px 4px; text-align: center;
          background: ${C.chip}; border: 1px solid ${C.border};
          border-radius: 7px; color: ${C.sub};
          font-size: 11px; font-weight: 700;
          cursor: pointer; transition: all 0.13s; flex-shrink: 0;
        }
        .mt-chip.sel {
          background: ${C.chipSel}; border-color: ${C.chipSel}; color: #fff;
        }

        /* rise/fall toggle (for rise_fall tab) */
        .mt-rf-toggle {
          display: flex; gap: 6px; width: 100%;
        }
        .mt-rf-btn {
          flex: 1; padding: 8px 0; border-radius: 8px;
          font-size: 13px; font-weight: 700;
          border: none; cursor: pointer; transition: all 0.13s;
          display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .mt-rf-btn.rise-sel   { background: ${C.rise}; color: #fff; }
        .mt-rf-btn.rise-unsel { background: ${C.chip}; color: ${C.sub}; border: 1px solid ${C.border}; }
        .mt-rf-btn.fall-sel   { background: ${C.fall}; color: #fff; }
        .mt-rf-btn.fall-unsel { background: ${C.chip}; color: ${C.sub}; border: 1px solid ${C.border}; }

        /* stake stepper */
        .mt-stake-row {
          display: flex; align-items: center;
          background: ${C.row}; border: 1px solid ${C.border};
          border-radius: 10px; padding: 8px 12px;
          gap: 10px; flex-shrink: 0;
        }
        .mt-stake-label {
          font-size: 11px; font-weight: 600; color: ${C.sub};
          text-transform: uppercase; letter-spacing: 0.06em; flex-shrink: 0;
        }
        .mt-stepper {
          display: flex; align-items: center; gap: 8px; margin-left: auto;
        }
        .mt-step-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: ${C.field}; border: 1px solid ${C.border};
          color: ${C.text}; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.13s; flex-shrink: 0;
        }
        .mt-step-btn:active { background: ${C.accent}; border-color: ${C.accent}; }
        .mt-stake-display {
          font-size: 17px; font-weight: 800; color: ${C.text};
          min-width: 80px; text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .mt-stake-ccy {
          font-size: 12px; font-weight: 600; color: ${C.sub}; flex-shrink: 0;
        }

        /* take profit */
        .mt-tp-row {
          display: flex; align-items: center; gap: 10px;
          background: ${C.row}; border: 1px solid ${C.border};
          border-radius: 10px; padding: 8px 12px; flex-shrink: 0;
        }
        .mt-checkbox {
          width: 18px; height: 18px; border-radius: 5px;
          border: 2px solid ${C.border}; background: ${C.field};
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.13s; flex-shrink: 0;
        }
        .mt-checkbox.on {
          background: ${C.accent}; border-color: ${C.accent};
        }
        .mt-tp-label {
          font-size: 13px; font-weight: 600; color: ${C.text}; cursor: pointer;
        }
        .mt-tp-input {
          margin-left: auto;
          width: 70px; background: ${C.field}; border: 1px solid ${C.border};
          border-radius: 7px; padding: 5px 8px;
          color: ${C.text}; font-size: 13px; font-weight: 700;
          text-align: right; outline: none;
        }
        .mt-tp-input:disabled { opacity: 0.35; }

        /* info row */
        .mt-info-row {
          display: flex; align-items: center;
          background: ${C.row}; border: 1px solid ${C.border};
          border-radius: 10px; padding: 8px 12px;
          gap: 6px; flex-shrink: 0;
        }
        .mt-info-cell {
          display: flex; align-items: center; gap: 5px; flex: 1;
        }
        .mt-info-cell + .mt-info-cell {
          border-left: 1px solid ${C.border}; padding-left: 10px;
        }
        .mt-info-lbl {
          font-size: 10px; font-weight: 600; color: ${C.sub};
          text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;
        }
        .mt-info-val {
          font-size: 13px; font-weight: 700; color: ${C.text};
          font-variant-numeric: tabular-nums; margin-left: auto;
        }
        .mt-info-val.green { color: ${C.rise}; }

        /* result banner */
        .mt-result {
          display: flex; align-items: center; gap: 7px;
          border-radius: 8px; padding: 8px 12px;
          font-size: 12px; flex-shrink: 0;
        }
        .mt-result.ok  { background: #0a2e1a; color: #4ade80; border: 1px solid #15503a; }
        .mt-result.err { background: #2d0a0a; color: #f87171; border: 1px solid #5c1e1e; }
        .mt-clear-btn { background:transparent; border:none; cursor:pointer; padding:0; color:inherit; margin-left:auto; }

        /* ─── buy button ─── */
        .mt-buy-wrap {
          flex-shrink: 0;
        }
        .mt-buy-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: ${C.green};
          border: none; border-radius: 10px;
          color: #fff; font-size: 16px; font-weight: 800;
          padding: 16px 0;
          cursor: pointer; transition: all 0.15s;
          box-shadow: 0 4px 20px rgba(0,192,118,0.30);
          letter-spacing: 0.02em;
        }
        .mt-buy-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .mt-buy-btn:active   { transform: scale(0.99); }
        .mt-buy-btn.rise-btn { background: ${C.rise}; box-shadow: 0 4px 20px rgba(0,184,150,0.30); }
        .mt-buy-btn.fall-btn { background: ${C.fall}; box-shadow: 0 4px 20px rgba(229,57,53,0.30); }
        .mt-buy-sub {
          font-size: 11px; font-weight: 500; opacity: 0.85;
        }

        /* login prompt */
        .mt-login-bar {
          background: ${C.field}; border: 1px solid ${C.border};
          border-radius: 10px; padding: 10px 14px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; flex-shrink: 0;
        }
        .mt-login-bar-text {
          font-size: 12px; color: ${C.sub};
        }
        .mt-login-bar-btn {
          background: ${C.accent}; color: #fff;
          border: none; border-radius: 8px;
          padding: 7px 14px; font-size: 12px; font-weight: 700;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
        }

        /* ── desktop: side-by-side ── */
        @media (min-width: 768px) {
          .mt-root {
            flex-direction: row;
          }
          .mt-chart-wrap {
            flex: 1;
            height: 100%;
          }
          .mt-panel {
            flex: none;
            width: 320px;
            border-top: none;
            border-left: 1px solid ${C.border};
            overflow-y: auto;
          }
          .mt-controls {
            overflow-y: auto;
          }
        }

        /* number input: no spinners */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }

        /* spin animation */
        @keyframes mt-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="mt-root">

        {/* ═══ CHART SECTION ═══ */}
        <div className="mt-chart-wrap">
          <LightweightChart symbol={market.id} tradingMode onPriceUpdate={() => {}} />
        </div>

        {/* ═══ PANEL SECTION ═══ */}
        <div className="mt-panel">

          {/* ── Market + live price row ── */}
          <div className="mt-market-row">

            {/* Market picker */}
            <div style={{ position: "relative" }}>
              <button className="mt-mkt-btn" onClick={() => setMktOpen(o => !o)}>
                <span className="mt-mkt-label">{market.label}</span>
                <ChevronDown style={{ width: 12, height: 12, flexShrink: 0, color: C.sub }} />
              </button>
              {mktOpen && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 49 }}
                    onClick={() => setMktOpen(false)}
                  />
                  <div className="mt-dropdown" style={{ top: "calc(100% + 6px)", left: 0, zIndex: 50 }}>
                    {MARKETS.map(m => (
                      <div
                        key={m.id}
                        className={`mt-dd-item${m.id === market.id ? " sel" : ""}`}
                        onClick={() => { setMarket(m); setMktOpen(false); }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Live price */}
            <div className={`mt-price ${dir === "up" ? "up" : dir === "dn" ? "dn" : "neutral"}`}>
              {price != null
                ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 })
                : <span style={{ fontSize: 12, color: C.sub }}>—</span>
              }
            </div>

            {/* Balance */}
            {isLoggedIn && balance != null && (
              <span className="mt-balance-chip">{balance.toFixed(2)} {currency}</span>
            )}
          </div>

          {/* ── Controls stack ── */}
          <div className="mt-controls">

            {/* CONTRACT TYPE + GROWTH CHIPS */}
            <div className="mt-row">
              {/* Type selector */}
              <div style={{ position: "relative" }}>
                <button className="mt-ct-btn" onClick={() => setCtOpen(o => !o)}>
                  {CONTRACT_LABELS[ctype]}
                  <ChevronDown style={{ width: 11, height: 11, color: C.sub }} />
                </button>
                {ctOpen && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 49 }}
                      onClick={() => setCtOpen(false)}
                    />
                    <div
                      className="mt-dropdown"
                      style={{ top: "calc(100% + 6px)", left: 0, zIndex: 50, minWidth: 160 }}
                    >
                      {(Object.keys(CONTRACT_LABELS) as ContractType[]).map(ct => (
                        <div
                          key={ct}
                          className={`mt-dd-item${ct === ctype ? " sel" : ""}`}
                          onClick={() => { setCtype(ct); setCtOpen(false); }}
                        >
                          {CONTRACT_LABELS[ct]}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Growth chips (accumulators) */}
              {ctype === "accumulators" && (
                <div className="mt-chips">
                  {GROWTH_RATES.map(g => (
                    <button
                      key={g}
                      className={`mt-chip${growth === g ? " sel" : ""}`}
                      onClick={() => setGrowth(g)}
                    >
                      {g}%
                    </button>
                  ))}
                </div>
              )}

              {/* Rise/Fall toggle */}
              {ctype === "rise_fall" && (
                <div className="mt-rf-toggle">
                  <button
                    className={`mt-rf-btn ${rfDir === "CALL" ? "rise-sel" : "rise-unsel"}`}
                    onClick={() => setRfDir("CALL")}
                  >
                    <TrendingUp style={{ width: 14, height: 14 }} />
                    Rise
                  </button>
                  <button
                    className={`mt-rf-btn ${rfDir === "PUT" ? "fall-sel" : "fall-unsel"}`}
                    onClick={() => setRfDir("PUT")}
                  >
                    Rise
                    Fall
                  </button>
                </div>
              )}

              {/* Multiplier info */}
              {ctype === "multipliers" && (
                <span style={{ fontSize: 12, color: C.sub, marginLeft: "auto" }}>
                  Up / Down — ×10 to ×500
                </span>
              )}
            </div>

            {/* STAKE STEPPER */}
            <div className="mt-stake-row">
              <span className="mt-stake-label">Stake</span>
              <div className="mt-stepper">
                <button className="mt-step-btn" onClick={() => stepStake(-1)}>
                  <Minus style={{ width: 14, height: 14 }} />
                </button>
                <span className="mt-stake-display">
                  ${stake.toFixed(2)}
                </span>
                <button className="mt-step-btn" onClick={() => stepStake(1)}>
                  <Plus style={{ width: 14, height: 14 }} />
                </button>
                <span className="mt-stake-ccy">{currency || "USD"}</span>
              </div>
            </div>

            {/* TAKE PROFIT */}
            <div className="mt-tp-row">
              <div
                className={`mt-checkbox${tpOn ? " on" : ""}`}
                onClick={() => setTpOn(v => !v)}
              >
                {tpOn && <Check style={{ width: 11, height: 11, color: "#fff" }} />}
              </div>
              <span className="mt-tp-label" onClick={() => setTpOn(v => !v)}>
                Take profit
              </span>
              <input
                type="number"
                className="mt-tp-input"
                value={tpAmt}
                min="1"
                disabled={!tpOn}
                onChange={e => setTpAmt(parseFloat(e.target.value) || 0)}
              />
              <span style={{ fontSize: 12, color: C.sub, flexShrink: 0 }}>
                {currency || "USD"}
              </span>
            </div>

            {/* INFO ROW: max payout + max ticks */}
            <div className="mt-info-row">
              <div className="mt-info-cell">
                <span className="mt-info-lbl">Max Payout</span>
                <span className="mt-info-val green">
                  ${(6000).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              {ctype === "accumulators" && maxTicks != null && (
                <div className="mt-info-cell">
                  <span className="mt-info-lbl">Max Ticks</span>
                  <span className="mt-info-val">
                    {maxTicks.toLocaleString()}
                  </span>
                </div>
              )}
              {prop && (
                <div className="mt-info-cell">
                  <span className="mt-info-lbl">Payout Est.</span>
                  <span className="mt-info-val green">${prop.payout.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* RESULT BANNER */}
            {result && (
              <div className={`mt-result ${result.ok ? "ok" : "err"}`}>
                {result.ok
                  ? <Check       style={{ width: 14, height: 14, flexShrink: 0 }} />
                  : <AlertCircle style={{ width: 14, height: 14, flexShrink: 0 }} />
                }
                <span style={{ flex: 1 }}>{result.msg}</span>
                <button className="mt-clear-btn" onClick={clear}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </div>
            )}

            {/* LOGIN PROMPT */}
            {!isLoggedIn && (
              <div className="mt-login-bar">
                <span className="mt-login-bar-text">
                  Log in for live quotes & real trades
                </span>
                <button className="mt-login-bar-btn" onClick={() => setShowAuth(true)}>
                  Log In
                </button>
              </div>
            )}

            {/* BUY BUTTON */}
            <div className="mt-buy-wrap">
              {ctype === "rise_fall" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="mt-buy-btn rise-btn"
                    style={{ flex: 1, padding: "14px 0", fontSize: 14 }}
                    disabled={buying || (!prop && isLoggedIn)}
                    onClick={() => { setRfDir("CALL"); handleBuy(); }}
                  >
                    {buying
                      ? <Loader2 style={{ width:16,height:16, animation:"mt-spin 1s linear infinite" }} />
                      : <TrendingUp style={{ width:16,height:16 }} />
                    }
                    Rise
                  </button>
                  <button
                    className="mt-buy-btn fall-btn"
                    style={{ flex: 1, padding: "14px 0", fontSize: 14 }}
                    disabled={buying || (!prop && isLoggedIn)}
                    onClick={() => { setRfDir("PUT"); handleBuy(); }}
                  >
                    {buying
                      ? <Loader2 style={{ width:16,height:16, animation:"mt-spin 1s linear infinite" }} />
                      : <TrendingUp style={{ width:16,height:16, transform:"scaleY(-1)" }} />
                    }
                    Fall
                  </button>
                </div>
              ) : (
                <button
                  className="mt-buy-btn"
                  disabled={buying || (!prop && isLoggedIn)}
                  onClick={handleBuy}
                >
                  {buying ? (
                    <Loader2 style={{ width: 18, height: 18, animation: "mt-spin 1s linear infinite" }} />
                  ) : (
                    <TrendingUp style={{ width: 18, height: 18 }} />
                  )}
                  <span>
                    {ctype === "accumulators" ? "Buy Accumulator" : "Buy Contract"}
                  </span>
                  {prop && !buying && (
                    <span className="mt-buy-sub">${prop.payout.toFixed(2)}</span>
                  )}
                </button>
              )}
            </div>

          </div>{/* end .mt-controls */}
        </div>{/* end .mt-panel */}
      </div>

      <AuthGateModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
