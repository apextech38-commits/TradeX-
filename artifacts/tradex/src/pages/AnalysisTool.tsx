import { useState, useEffect } from "react";
import { Info, Settings } from "lucide-react";
import { useDerivWS } from "@/hooks/useDerivWS";
import { Switch } from "@/components/ui/switch";

export default function AnalysisTool() {
  const { latestTick, subscribe, unsubscribe } = useDerivWS();
  const [history, setHistory] = useState<number[]>([]);
  const [tickWindow, setTickWindow] = useState(1000);

  useEffect(() => {
    subscribe("R_10_1HZ");
    return () => unsubscribe();
  }, [subscribe]);

  useEffect(() => {
    if (latestTick) {
      setHistory(prev => {
        const lastDigit = parseInt(latestTick.quote.toFixed(2).slice(-1));
        const next = [...prev, lastDigit];
        if (next.length > tickWindow) return next.slice(-tickWindow);
        return next;
      });
    }
  }, [latestTick, tickWindow]);

  const digitCounts = Array(10).fill(0);
  let evenCount = 0;
  let oddCount = 0;
  let over5 = 0;
  let under5 = 0;
  let eq5 = 0;

  history.forEach(d => {
    digitCounts[d]++;
    if (d % 2 === 0) evenCount++;
    else oddCount++;
    if (d > 5) over5++;
    else if (d < 5) under5++;
    else eq5++;
  });

  const total = history.length || 1;
  const maxCount = Math.max(...digitCounts);
  const nonZero = digitCounts.filter(c => c > 0);
  const minCount = nonZero.length ? Math.min(...nonZero) : 0;
  const currentDigit = history.length > 0 ? history[history.length - 1] : null;

  const getDigitColor = (i: number, count: number) => {
    if (history.length === 0) return "bg-secondary";
    if (i === currentDigit) return "bg-primary";
    if (count === maxCount) return "bg-[#EF4444]";
    if (count === minCount) return "bg-[#F59E0B]";
    return "bg-secondary";
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch id="wide-eye" />
            <label htmlFor="wide-eye" className="text-sm font-medium text-foreground">Wide Eye</label>
          </div>
          <button className="bg-[#8B5CF6] hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Launch AI
          </button>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Info className="w-5 h-5" />
          </button>
        </div>
        <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors">
          <Settings className="w-4 h-4" /> Trading Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Display */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center py-12 shadow-sm">
          <select className="w-full max-w-[240px] bg-background border border-border rounded-md h-10 px-3 text-foreground mb-8 focus:outline-none focus:border-primary">
            <option>Volatility 10 (1s) Index</option>
          </select>

          <div className="text-center mb-6">
            <div className="text-muted-foreground text-sm mb-1">Live Price</div>
            <div className="text-5xl font-bold text-foreground font-mono tracking-tight">
              {latestTick ? latestTick.quote.toFixed(2) : "---.--"}
            </div>
          </div>

          {currentDigit !== null && (
            <div className="w-24 h-24 rounded-full bg-primary/10 border-4 border-primary flex items-center justify-center shadow-lg">
              <span className="text-5xl font-bold text-primary">{currentDigit}</span>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Digit Distribution */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-foreground">Last {history.length} ticks</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">Ticks window:</label>
                <input
                  type="number"
                  value={tickWindow}
                  onChange={(e) => setTickWindow(Number(e.target.value))}
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Even/Odd */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-semibold text-foreground">Even / Odd</h3>
              {[
                { label: "Even", pct: (evenCount / total) * 100, count: evenCount, color: "bg-primary", textColor: "text-primary" },
                { label: "Odd", pct: (oddCount / total) * 100, count: oddCount, color: "bg-muted-foreground", textColor: "text-muted-foreground" },
              ].map(({ label, pct, count, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${textColor} font-medium`}>{label} ({pct.toFixed(1)}%)</span>
                    <span className="text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Recent E/O:</span>
                  <div className="flex gap-1">
                    {history.slice(-6).map((d, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${d % 2 === 0 ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
                    ))}
                  </div>
                </div>
                <button className="text-primary hover:underline">More</button>
              </div>
            </div>

            {/* Over/Under */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground">Over / Under</h3>
                <select className="bg-background border border-border text-xs rounded px-2 py-1 text-foreground">
                  <option>Threshold: 5</option>
                </select>
              </div>
              {[
                { label: "Under", pct: (under5 / total) * 100, count: under5, color: "bg-[#EF4444]", textColor: "text-[#EF4444]" },
                { label: "Equal", pct: (eq5 / total) * 100, count: eq5, color: "bg-muted-foreground", textColor: "text-muted-foreground" },
                { label: "Over", pct: (over5 / total) * 100, count: over5, color: "bg-[#22C55E]", textColor: "text-[#22C55E]" },
              ].map(({ label, pct, count, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${textColor} font-medium`}>{label} ({pct.toFixed(1)}%)</span>
                    <span className="text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Recent:</span>
                  <div className="flex gap-1">
                    {history.slice(-6).map((d, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${d < 5 ? "bg-[#EF4444]" : d > 5 ? "bg-[#22C55E]" : "bg-muted-foreground"}`} />
                    ))}
                  </div>
                </div>
                <button className="text-primary hover:underline">More</button>
              </div>
            </div>

            {/* Matches/Differs */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-foreground">Matches / Differs</h3>
                <select className="bg-background border border-border text-xs rounded px-2 py-1 text-foreground">
                  {[0,1,2,3,4,5,6,7,8,9].map(d => <option key={d}>Digit: {d}</option>)}
                </select>
              </div>
              {[
                { label: "Matches", count: history.filter(d => d === 0).length, color: "bg-[#22C55E]", textColor: "text-[#22C55E]" },
                { label: "Differs", count: history.filter(d => d !== 0).length, color: "bg-[#EF4444]", textColor: "text-[#EF4444]" },
              ].map(({ label, count, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`${textColor} font-medium`}>{label} ({((count / total) * 100).toFixed(1)}%)</span>
                    <span className="text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${(count / total) * 100}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Recent M/D:</span>
                  <div className="flex gap-1">
                    {history.slice(-6).map((d, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${d === 0 ? "bg-[#22C55E]" : "bg-[#EF4444]"}`} />
                    ))}
                  </div>
                </div>
                <button className="text-primary hover:underline">More</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
