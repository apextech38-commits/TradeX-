import { useState, useEffect, useRef, useCallback } from "react";
import { Info, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL          = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const OPEN_TIMEOUT_MS = 8_000;   // max wait for socket to open
const HIST_TIMEOUT_MS = 10_000;  // max wait for history response after open
const RETRY_DELAY_MS  = 3_000;
const PING_INTERVAL   = 25_000;  // keepalive — Deriv drops connections without it

const SYMBOLS = [
  { label: "Volatility 10 Index",        id: "R_10"    },
  { label: "Volatility 10 (1s) Index",   id: "1HZ10V"  },
  { label: "Volatility 25 Index",        id: "R_25"    },
  { label: "Volatility 50 Index",        id: "R_50"    },
  { label: "Volatility 75 Index",        id: "R_75"    },
  { label: "Volatility 100 Index",       id: "R_100"   },
  { label: "Volatility 100 (1s) Index",  id: "1HZ100V" },
];

function lastDigit(quote: number): number {
  return parseInt(quote.toFixed(2).slice(-1));
}

export default function AnalysisTool() {
  const [selectedSym,  setSelectedSym]  = useState(SYMBOLS[0]);
  const [history,      setHistory]      = useState<number[]>([]);
  const [latestPrice,  setLatestPrice]  = useState<number | null>(null);
  const [tickWindow,   setTickWindow]   = useState(1000);
  const [connected,    setConnected]    = useState(false);
  const [matchDigit,   setMatchDigit]   = useState(0);
  const [statusLabel,  setStatusLabel]  = useState("Connecting...");

  const wsRef         = useRef<WebSocket | null>(null);
  const mountRef      = useRef(true);
  const retryRef      = useRef(0);
  const openTimerRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const histTimerRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const pingRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const symRef        = useRef(selectedSym.id);
  const windowRef     = useRef(tickWindow);

  useEffect(() => { windowRef.current = tickWindow; }, [tickWindow]);

  // Clear ALL timers and the ping interval in one call
  const clearAll = useCallback(() => {
    if (openTimerRef.current)  { clearTimeout(openTimerRef.current);   openTimerRef.current  = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current);  retryTimerRef.current = null; }
    if (histTimerRef.current)  { clearTimeout(histTimerRef.current);   histTimerRef.current  = null; }
    if (pingRef.current)       { clearInterval(pingRef.current);       pingRef.current       = null; }
  }, []);

  const scheduleRetry = useCallback((ws: WebSocket, reason: string, connectFn: () => void) => {
    ws.onclose = null;
    ws.close();
    clearAll();
    if (!mountRef.current) return;
    retryRef.current++;
    setConnected(false);
    setStatusLabel(`${reason} — retrying... (${retryRef.current})`);
    retryTimerRef.current = setTimeout(connectFn, RETRY_DELAY_MS);
  }, [clearAll]);

  const connect = useCallback(() => {
    if (!mountRef.current) return;
    clearAll();
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null; }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    // ── Bug fix #1: timeout if socket never opens ──────────────────────────
    openTimerRef.current = setTimeout(() => {
      if (!mountRef.current || ws.readyState === WebSocket.OPEN) return;
      scheduleRetry(ws, "Connection timeout", connect);
    }, OPEN_TIMEOUT_MS);

    ws.onopen = () => {
      if (!mountRef.current) return;
      clearAll(); // clears openTimer

      // Send ticks_history immediately — public symbols need no auth
      ws.send(JSON.stringify({
        ticks_history: symRef.current,
        count:         1000,
        end:           "latest",
        start:         1,
        style:         "ticks",
        subscribe:     1,
      }));

      // ── Bug fix #2: timeout if history response never arrives ────────────
      histTimerRef.current = setTimeout(() => {
        if (!mountRef.current) return;
        scheduleRetry(ws, "History timeout", connect);
      }, HIST_TIMEOUT_MS);

      // ── Bug fix #3: keepalive ping — Deriv drops idle sockets after ~60s ─
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
      }, PING_INTERVAL);
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data);

        // ── Bug fix #4: errors now close & retry instead of getting stuck ──
        if (msg.error) {
          console.warn("[AnalysisTool WS]", msg.error.code, msg.error.message);
          scheduleRetry(ws, `Error: ${msg.error.message}`, connect);
          return;
        }

        if (msg.msg_type === "pong") return; // keepalive response — ignore

        // Bulk history → cancel history timeout, populate digit table
        if (msg.msg_type === "history") {
          if (histTimerRef.current) { clearTimeout(histTimerRef.current); histTimerRef.current = null; }
          const prices: number[] = msg.history?.prices ?? [];
          const digits = prices.map(lastDigit);
          setHistory(digits.slice(-windowRef.current));
          if (prices.length > 0) setLatestPrice(prices[prices.length - 1]);
          setConnected(true);
          setStatusLabel("Live");
          return;
        }

        // Live tick → append digit
        if (msg.msg_type === "tick") {
          const quote: number = msg.tick.quote;
          setLatestPrice(quote);
          const d = lastDigit(quote);
          setHistory(prev => {
            const next = [...prev, d];
            return next.length > windowRef.current ? next.slice(-windowRef.current) : next;
          });
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      if (mountRef.current) setConnected(false);
    };

    ws.onclose = () => {
      if (!mountRef.current) return;
      clearAll();
      setConnected(false);
      retryRef.current++;
      setStatusLabel(`Disconnected — reconnecting... (${retryRef.current})`);
      retryTimerRef.current = setTimeout(connect, RETRY_DELAY_MS);
    };
  }, [clearAll, scheduleRetry]);

  useEffect(() => {
    mountRef.current = true;
    symRef.current   = selectedSym.id;
    setHistory([]);
    setLatestPrice(null);
    setConnected(false);
    retryRef.current = 0;
    setStatusLabel("Connecting...");
    connect();
    return () => {
      mountRef.current = false;
      clearAll();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [selectedSym.id, connect, clearAll]);

  useEffect(() => {
    setHistory(prev => prev.length > tickWindow ? prev.slice(-tickWindow) : prev);
  }, [tickWindow]);

  // ── Compute stats ──────────────────────────────────────────────────────────
  const digitCounts = Array(10).fill(0);
  let evenCount = 0, oddCount = 0, over5 = 0, under5 = 0, eq5 = 0;
  let matchCount = 0, differCount = 0;

  history.forEach(d => {
    digitCounts[d]++;
    if (d % 2 === 0) evenCount++; else oddCount++;
    if (d > 5) over5++; else if (d < 5) under5++; else eq5++;
    if (d === matchDigit) matchCount++; else differCount++;
  });

  const total      = history.length || 1;
  const maxCount   = Math.max(...digitCounts);
  const nonZero    = digitCounts.filter(c => c > 0);
  const minCount   = nonZero.length ? Math.min(...nonZero) : 0;
  const currentDigit = history.length > 0 ? history[history.length - 1] : null;
  const isRetrying   = statusLabel.startsWith("Reconnecting") || statusLabel.startsWith("Disconnected") || statusLabel.startsWith("Error") || statusLabel.startsWith("Connection") || statusLabel.startsWith("History");

  // Rank counts for colour assignment
  const sortedUniqueCounts = [...new Set(digitCounts)].sort((a, b) => a - b).filter(c => c > 0);
  const secondMin = sortedUniqueCounts[1] ?? null;
  const sortedDesc = [...new Set(digitCounts)].sort((a, b) => b - a);
  const secondMax = sortedDesc[1] ?? null;

  const getDigitStyle = (i: number, count: number): { circle: string; text: string } => {
    if (history.length === 0) return { circle: "border border-border bg-secondary/50", text: "text-muted-foreground" };
    if (i === currentDigit)   return { circle: "border-2 border-primary bg-transparent ring-2 ring-primary/20", text: "text-primary" };
    if (count === maxCount)   return { circle: "bg-[#22C55E]", text: "text-white" };
    if (count === minCount && minCount > 0) return { circle: "bg-[#EF4444]", text: "text-white" };
    if (secondMax !== null && count === secondMax) return { circle: "bg-[#3B82F6]", text: "text-white" };
    if (secondMin !== null && count === secondMin) return { circle: "bg-[#F97316]", text: "text-white" };
    return { circle: "border border-border bg-background", text: "text-foreground" };
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch id="wide-eye" />
            <label htmlFor="wide-eye" className="text-sm font-medium text-foreground">Wide Eye</label>
          </div>
          <button className="bg-[#8B5CF6] hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Launch AI
          </button>
          <button className="text-muted-foreground hover:text-foreground">
            <Info className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${
              connected  ? "bg-[#22C55E]" :
              isRetrying ? "bg-[#EF4444] animate-pulse" :
                           "bg-[#FACC15] animate-pulse"
            }`} />
            {statusLabel}
          </div>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors">
          <Settings className="w-4 h-4" /> Trading Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Live Price + symbol selector */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center py-10 shadow-sm space-y-6">
          <select
            value={selectedSym.id}
            onChange={e => setSelectedSym(SYMBOLS.find(s => s.id === e.target.value) || SYMBOLS[0])}
            className="w-full bg-background border border-border rounded-md h-10 px-3 text-foreground focus:outline-none focus:border-primary text-sm"
          >
            {SYMBOLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          <div className="text-center">
            <div className="text-muted-foreground text-xs mb-1">Live Price</div>
            <div className={`text-5xl font-bold font-mono tracking-tight text-foreground transition-all duration-150 ${latestPrice ? "" : "opacity-40"}`}>
              {latestPrice ? latestPrice.toFixed(3) : "---"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {history.length} ticks loaded
            </div>
          </div>

          {currentDigit !== null && (
            <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center shadow-lg">
              <span className="text-5xl font-bold text-primary">{currentDigit}</span>
            </div>
          )}

          {history.length === 0 && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className={`w-6 h-6 border-2 rounded-full animate-spin ${
                isRetrying ? "border-[#EF4444]/30 border-t-[#EF4444]" : "border-primary/30 border-t-primary"
              }`} />
              <span className="text-xs">{statusLabel}</span>
            </div>
          )}
        </div>

        {/* Right — Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Digit Distribution */}
          <div className="bg-card border border-border rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-semibold text-foreground">
                Last {tickWindow} ticks digit distribution
              </h3>
              <span className="text-xs text-muted-foreground font-mono">{history.length}/{tickWindow}</span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <label className="text-xs text-muted-foreground">Ticks window:</label>
              <input
                type="number"
                value={tickWindow}
                onChange={e => setTickWindow(Math.max(50, Math.min(5000, Number(e.target.value))))}
                className="w-20 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-muted-foreground">(50–5000)</span>
            </div>

            {/* Digit circles row */}
            <div className="flex justify-between items-end gap-0.5 md:gap-1">
              {digitCounts.map((count, i) => {
                const pct  = ((count / total) * 100).toFixed(1);
                const { circle, text } = getDigitStyle(i, count);
                const isCurrent = i === currentDigit;
                const pctColor  = count === maxCount   ? "text-[#22C55E]"
                                : count === minCount && minCount > 0 ? "text-[#EF4444]"
                                : isCurrent            ? "text-primary"
                                : "text-muted-foreground";
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                    {/* Caret above current digit */}
                    <div className="h-4 flex items-end justify-center w-full">
                      {isCurrent && (
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                          <path d="M6 8L0 0H12L6 8Z" fill="#3B82F6"/>
                        </svg>
                      )}
                    </div>

                    {/* Circle */}
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-13 md:h-13 rounded-full flex items-center justify-center transition-all duration-300 ${circle}`}
                         style={{ width: "clamp(32px,9vw,56px)", height: "clamp(32px,9vw,56px)" }}>
                      <span className={`font-bold transition-colors duration-300 ${text}`}
                            style={{ fontSize: "clamp(13px,3.5vw,20px)" }}>
                        {i}
                      </span>
                    </div>

                    {/* Percentage */}
                    <span className={`font-semibold transition-colors duration-300 ${pctColor}`}
                          style={{ fontSize: "clamp(9px,2.2vw,12px)" }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] inline-block" /> Highest</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] inline-block" /> 2nd Highest</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F97316] inline-block" /> 2nd Lowest</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block" /> Lowest</span>
              <span className="flex items-center gap-1 border border-primary rounded-full px-1">▲ Current</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Even/Odd */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-foreground text-sm">Even / Odd</h3>
              {[
                { label: "Even", pct: (evenCount / total) * 100, count: evenCount, color: "bg-primary",          textColor: "text-primary" },
                { label: "Odd",  pct: (oddCount  / total) * 100, count: oddCount,  color: "bg-muted-foreground", textColor: "text-muted-foreground" },
              ].map(({ label, pct, count, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${textColor} font-medium`}>{label} ({pct.toFixed(1)}%)</span>
                    <span className="text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span>Recent:</span>
                <div className="flex gap-1">
                  {history.slice(-8).map((d, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${d % 2 === 0 ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Over/Under */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-foreground text-sm">Over / Under 5</h3>
              {[
                { label: "Under", pct: (under5 / total) * 100, count: under5, color: "bg-[#EF4444]",        textColor: "text-[#EF4444]" },
                { label: "Equal", pct: (eq5    / total) * 100, count: eq5,    color: "bg-muted-foreground", textColor: "text-muted-foreground" },
                { label: "Over",  pct: (over5  / total) * 100, count: over5,  color: "bg-[#22C55E]",        textColor: "text-[#22C55E]" },
              ].map(({ label, pct, count, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${textColor} font-medium`}>{label} ({pct.toFixed(1)}%)</span>
                    <span className="text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span>Recent:</span>
                <div className="flex gap-1">
                  {history.slice(-8).map((d, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${d < 5 ? "bg-[#EF4444]" : d > 5 ? "bg-[#22C55E]" : "bg-muted-foreground"}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Matches/Differs */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground text-sm">Matches / Differs</h3>
                <select
                  value={matchDigit}
                  onChange={e => setMatchDigit(Number(e.target.value))}
                  className="bg-background border border-border text-xs rounded px-2 py-1 text-foreground"
                >
                  {[0,1,2,3,4,5,6,7,8,9].map(d => <option key={d} value={d}>Digit: {d}</option>)}
                </select>
              </div>
              {[
                { label: "Matches", count: matchCount,  color: "bg-[#22C55E]", textColor: "text-[#22C55E]" },
                { label: "Differs", count: differCount, color: "bg-[#EF4444]", textColor: "text-[#EF4444]" },
              ].map(({ label, count, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${textColor} font-medium`}>{label} ({((count / total) * 100).toFixed(1)}%)</span>
                    <span className="text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span>Recent:</span>
                <div className="flex gap-1">
                  {history.slice(-8).map((d, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${d === matchDigit ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
