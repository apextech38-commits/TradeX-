import { useState, useEffect, useRef, useCallback } from "react";
import { Info, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const TOKEN_KEY = "deriv_token";

const SYMBOLS = [
  { label: "Volatility 10 (1s) Index", id: "R_10" },
  { label: "Volatility 25 Index",       id: "R_25" },
  { label: "Volatility 50 Index",       id: "R_50" },
  { label: "Volatility 75 Index",       id: "R_75" },
  { label: "Volatility 100 Index",      id: "R_100" },
];

function lastDigit(quote: number): number {
  return parseInt(quote.toFixed(2).slice(-1));
}

export default function AnalysisTool() {
  const [selectedSym, setSelectedSym] = useState(SYMBOLS[0]);
  const [history, setHistory]   = useState<number[]>([]);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [tickWindow, setTickWindow]   = useState(1000);
  const [connected, setConnected] = useState(false);
  const [matchDigit, setMatchDigit] = useState(0);

  const wsRef         = useRef<WebSocket | null>(null);
  const mountRef      = useRef(true);
  const retryRef      = useRef(0);
  const timeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symRef        = useRef(selectedSym.id);
  const [statusLabel, setStatusLabel] = useState("Connecting...");

  const clearTimers = () => {
    if (timeoutRef.current)    { clearTimeout(timeoutRef.current);    timeoutRef.current    = null; }
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
  };

  const connectWS = useCallback(() => {
    if (!mountRef.current) return;
    clearTimers();

    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    // 5-second connection timeout
    timeoutRef.current = setTimeout(() => {
      if (!mountRef.current) return;
      if (ws.readyState !== WebSocket.OPEN) {
        ws.onclose = null;
        ws.close();
        retryRef.current++;
        setStatusLabel(`Reconnecting... (attempt ${retryRef.current})`);
        retryTimerRef.current = setTimeout(connectWS, 3000);
      }
    }, 5000);

    const sendHistory = () => {
      ws.send(JSON.stringify({
        ticks_history: symRef.current,
        count: 1000,
        end: "latest",
        start: 1,
        style: "ticks",
        subscribe: 1,
      }));
    };

    ws.onopen = () => {
      if (!mountRef.current) return;
      clearTimers();
      retryRef.current = 0;
      setConnected(true);
      setStatusLabel("Live");
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        ws.send(JSON.stringify({ authorize: token }));
      } else {
        sendHistory();
      }
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) return;

        if (msg.msg_type === "authorize") { sendHistory(); return; }

        if (msg.msg_type === "history") {
          const prices: number[] = msg.history?.prices ?? [];
          const digits = prices.map(lastDigit);
          setHistory(digits);
          if (prices.length > 0) setLatestPrice(prices[prices.length - 1]);
          return;
        }

        if (msg.msg_type === "tick") {
          const quote: number = msg.tick.quote;
          setLatestPrice(quote);
          const d = lastDigit(quote);
          setHistory(prev => {
            const next = [...prev, d];
            return next.length > tickWindow ? next.slice(-tickWindow) : next;
          });
        }
      } catch (_) {}
    };

    ws.onerror = () => { if (mountRef.current) setConnected(false); };

    ws.onclose = () => {
      if (!mountRef.current) return;
      setConnected(false);
      retryRef.current++;
      setStatusLabel(`Reconnecting... (attempt ${retryRef.current})`);
      retryTimerRef.current = setTimeout(connectWS, 3000);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountRef.current = true;
    symRef.current = selectedSym.id;
    setHistory([]);
    setLatestPrice(null);
    setConnected(false);
    retryRef.current = 0;
    setStatusLabel("Connecting...");
    connectWS();

    return () => {
      mountRef.current = false;
      clearTimers();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [selectedSym.id, connectWS]);

  // Trim history when window changes
  useEffect(() => {
    setHistory(prev => prev.length > tickWindow ? prev.slice(-tickWindow) : prev);
  }, [tickWindow]);

  const digitCounts = Array(10).fill(0);
  let evenCount = 0, oddCount = 0, over5 = 0, under5 = 0, eq5 = 0;
  let matchCount = 0, differCount = 0;

  history.forEach(d => {
    digitCounts[d]++;
    if (d % 2 === 0) evenCount++; else oddCount++;
    if (d > 5) over5++; else if (d < 5) under5++; else eq5++;
    if (d === matchDigit) matchCount++; else differCount++;
  });

  const total    = history.length || 1;
  const maxCount = Math.max(...digitCounts);
  const nonZero  = digitCounts.filter(c => c > 0);
  const minCount = nonZero.length ? Math.min(...nonZero) : 0;
  const currentDigit = history.length > 0 ? history[history.length - 1] : null;

  const getDigitColor = (i: number, count: number) => {
    if (history.length === 0) return "bg-secondary";
    if (i === currentDigit)   return "bg-primary";
    if (count === maxCount)   return "bg-[#EF4444]";
    if (count === minCount)   return "bg-[#F59E0B]";
    return "bg-secondary";
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
              connected ? "bg-[#22C55E]" :
              statusLabel.startsWith("Reconnecting") ? "bg-[#EF4444] animate-pulse" :
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
        {/* Left — Live Price */}
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
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-xs">Fetching 1000 ticks history...</span>
            </div>
          )}
        </div>

        {/* Right — Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Digit Distribution */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold text-foreground">
                Digit Distribution
                <span className="ml-2 text-xs font-normal text-muted-foreground">({history.length} ticks)</span>
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Window:</label>
                <input
                  type="number"
                  value={tickWindow}
                  onChange={e => setTickWindow(Math.max(10, Number(e.target.value)))}
                  className="w-20 bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-between gap-1 md:gap-2">
              {digitCounts.map((count, i) => {
                const pct = ((count / total) * 100).toFixed(1);
                return (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div className="text-base font-bold text-foreground mb-1">{i}</div>
                    <div className="text-[10px] text-muted-foreground mb-2">{pct}%</div>
                    <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full transition-colors duration-300 ${getDigitColor(i, count)}`} />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Current</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block" /> Highest</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block" /> Lowest</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Even/Odd */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-foreground text-sm">Even / Odd</h3>
              {[
                { label: "Even", pct: (evenCount / total) * 100, count: evenCount, color: "bg-primary", textColor: "text-primary" },
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
                { label: "Under", pct: (under5 / total) * 100, count: under5, color: "bg-[#EF4444]", textColor: "text-[#EF4444]" },
                { label: "Equal", pct: (eq5    / total) * 100, count: eq5,    color: "bg-muted-foreground", textColor: "text-muted-foreground" },
                { label: "Over",  pct: (over5  / total) * 100, count: over5,  color: "bg-[#22C55E]", textColor: "text-[#22C55E]" },
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
                    <div key={i} className={`w-2 h-2 rounded-full ${d < 5 ? "bg-[#EF4444]" : d > 5 ? "bg-[#22C55E]" : "bg-gray-400"}`} />
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
