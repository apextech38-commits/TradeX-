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
  const minCount = Math.min(...digitCounts.filter(c => c > 0).length ? digitCounts.filter(c => c > 0) : [0]);
  const currentDigit = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="wide-eye" className="data-[state=checked]:bg-[#3B82F6]" />
            <label htmlFor="wide-eye" className="text-sm font-medium text-[#E5E7EB]">Wide Eye</label>
          </div>
          <button className="bg-[#8B5CF6] hover:bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Launch AI
          </button>
          <button className="text-[#9CA3AF] hover:text-[#E5E7EB]">
            <Info className="w-5 h-5" />
          </button>
        </div>
        <button className="bg-[#3B82F6] hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors">
          <Settings className="w-4 h-4" /> Trading Configuration
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Display */}
        <div className="lg:col-span-1 bg-[#121821] border border-[#1F2933] rounded-xl p-6 flex flex-col items-center justify-center py-12">
          <select className="w-full max-w-[240px] bg-[#0B0F14] border border-[#1F2933] rounded-md h-10 px-3 text-[#E5E7EB] mb-8 focus:outline-none focus:border-[#3B82F6]">
            <option>Volatility 10 (1s) Index</option>
          </select>

          <div className="text-center mb-6">
            <div className="text-[#9CA3AF] text-sm mb-1">Live Price</div>
            <div className="text-5xl font-bold text-[#E5E7EB] font-mono tracking-tight">
              {latestTick ? latestTick.quote.toFixed(2) : "---.--"}
            </div>
          </div>

          {currentDigit !== null && (
            <div className="w-24 h-24 rounded-full bg-[#3B82F6]/20 border-4 border-[#3B82F6] flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <span className="text-5xl font-bold text-[#3B82F6]">{currentDigit}</span>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Digit Distribution */}
          <div className="bg-[#121821] border border-[#1F2933] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-[#E5E7EB]">Last {history.length} ticks</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#9CA3AF]">Ticks window:</label>
                <input 
                  type="number" 
                  value={tickWindow}
                  onChange={(e) => setTickWindow(Number(e.target.value))}
                  className="w-20 bg-[#0B0F14] border border-[#1F2933] rounded px-2 py-1 text-sm text-[#E5E7EB]"
                />
              </div>
            </div>

            <div className="flex justify-between gap-1 md:gap-2">
              {digitCounts.map((count, i) => {
                const pct = ((count / total) * 100).toFixed(1);
                let colorClass = "bg-[#1F2933]"; // default
                if (history.length > 0) {
                  if (count === maxCount) colorClass = "bg-[#EF4444]";
                  else if (count === minCount) colorClass = "bg-[#FACC15]"; // orange-ish
                  if (i === currentDigit) colorClass = "bg-[#3B82F6]";
                }

                return (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div className="text-lg font-bold text-[#E5E7EB] mb-2">{i}</div>
                    <div className="text-xs text-[#9CA3AF] mb-3">{pct}%</div>
                    <div className={`w-4 h-4 md:w-6 md:h-6 rounded-full ${colorClass} transition-colors duration-300`} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Even/Odd */}
            <div className="bg-[#121821] border border-[#1F2933] rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-[#E5E7EB]">Even / Odd</h3>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#3B82F6] font-medium">Even ({((evenCount/total)*100).toFixed(1)}%)</span>
                  <span className="text-[#E5E7EB]">{evenCount}</span>
                </div>
                <div className="h-2 bg-[#0B0F14] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6]" style={{ width: `${(evenCount/total)*100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#9CA3AF] font-medium">Odd ({((oddCount/total)*100).toFixed(1)}%)</span>
                  <span className="text-[#E5E7EB]">{oddCount}</span>
                </div>
                <div className="h-2 bg-[#0B0F14] rounded-full overflow-hidden">
                  <div className="h-full bg-[#9CA3AF]" style={{ width: `${(oddCount/total)*100}%` }} />
                </div>
              </div>
              
              <div className="pt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9CA3AF]">Recent E/O:</span>
                  <div className="flex gap-1">
                    {history.slice(-5).map((d, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${d % 2 === 0 ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                    ))}
                  </div>
                </div>
                <button className="text-[#3B82F6] hover:underline">More</button>
              </div>
            </div>

            {/* Over/Under */}
            <div className="bg-[#121821] border border-[#1F2933] rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-[#E5E7EB]">Over / Under</h3>
                <select className="bg-[#0B0F14] border border-[#1F2933] text-xs rounded px-2 py-1 text-[#E5E7EB]">
                  <option>Threshold: 5</option>
                </select>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#EF4444] font-medium">Under ({((under5/total)*100).toFixed(1)}%)</span>
                  <span className="text-[#E5E7EB]">{under5}</span>
                </div>
                <div className="h-2 bg-[#0B0F14] rounded-full overflow-hidden">
                  <div className="h-full bg-[#EF4444]" style={{ width: `${(under5/total)*100}%` }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#9CA3AF] font-medium">Equal ({((eq5/total)*100).toFixed(1)}%)</span>
                  <span className="text-[#E5E7EB]">{eq5}</span>
                </div>
                <div className="h-2 bg-[#0B0F14] rounded-full overflow-hidden">
                  <div className="h-full bg-[#9CA3AF]" style={{ width: `${(eq5/total)*100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#22C55E] font-medium">Over ({((over5/total)*100).toFixed(1)}%)</span>
                  <span className="text-[#E5E7EB]">{over5}</span>
                </div>
                <div className="h-2 bg-[#0B0F14] rounded-full overflow-hidden">
                  <div className="h-full bg-[#22C55E]" style={{ width: `${(over5/total)*100}%` }} />
                </div>
              </div>
              
              <div className="pt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9CA3AF]">Recent U/=/O:</span>
                  <div className="flex gap-1">
                    {history.slice(-5).map((d, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${d < 5 ? 'bg-[#EF4444]' : d > 5 ? 'bg-[#22C55E]' : 'bg-[#9CA3AF]'}`} />
                    ))}
                  </div>
                </div>
                <button className="text-[#3B82F6] hover:underline">More</button>
              </div>
            </div>

            {/* Matches/Differs */}
            <div className="bg-[#121821] border border-[#1F2933] rounded-xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-[#E5E7EB]">Matches / Differs</h3>
                <select className="bg-[#0B0F14] border border-[#1F2933] text-xs rounded px-2 py-1 text-[#E5E7EB]">
                  <option>Digit: 0</option>
                  <option>Digit: 1</option>
                  <option>Digit: 2</option>
                  <option>Digit: 3</option>
                  <option>Digit: 4</option>
                  <option>Digit: 5</option>
                  <option>Digit: 6</option>
                  <option>Digit: 7</option>
                  <option>Digit: 8</option>
                  <option>Digit: 9</option>
                </select>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#22C55E] font-medium">Matches ({(((history.filter(d => d === 0).length)/total)*100).toFixed(1)}%)</span>
                  <span className="text-[#E5E7EB]">{history.filter(d => d === 0).length}</span>
                </div>
                <div className="h-2 bg-[#0B0F14] rounded-full overflow-hidden">
                  <div className="h-full bg-[#22C55E]" style={{ width: `${((history.filter(d => d === 0).length)/total)*100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#EF4444] font-medium">Differs ({(((history.filter(d => d !== 0).length)/total)*100).toFixed(1)}%)</span>
                  <span className="text-[#E5E7EB]">{history.filter(d => d !== 0).length}</span>
                </div>
                <div className="h-2 bg-[#0B0F14] rounded-full overflow-hidden">
                  <div className="h-full bg-[#EF4444]" style={{ width: `${((history.filter(d => d !== 0).length)/total)*100}%` }} />
                </div>
              </div>
              
              <div className="pt-2 flex items-center justify-between text-xs mt-auto">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#9CA3AF]">Recent M/D:</span>
                  <div className="flex gap-1">
                    {history.slice(-5).map((d, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full ${d === 0 ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                    ))}
                  </div>
                </div>
                <button className="text-[#3B82F6] hover:underline">More</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
