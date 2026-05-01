import { useEffect } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useDerivWS } from "@/hooks/useDerivWS";
import { Input } from "@/components/ui/input";

export default function ManualTraders() {
  const { latestTick, subscribe, unsubscribe } = useDerivWS();

  useEffect(() => {
    subscribe("R_100");
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Top Bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <select
            data-testid="select-market"
            className="bg-background border border-border rounded-md h-12 px-4 text-lg font-medium text-foreground focus:outline-none focus:border-primary w-full md:w-64"
          >
            <option value="R_100">Volatility 100 Index</option>
            <option value="R_10">Volatility 10 Index</option>
          </select>
          <div className="hidden md:flex flex-col">
            <span className="text-xs text-muted-foreground">Live Price</span>
            <span className="text-xl font-bold text-foreground font-mono">
              {latestTick ? latestTick.quote.toFixed(2) : "---.--"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground">Demo Account</span>
          <span className="text-xl font-bold text-foreground" data-testid="text-balance">$10,000.00</span>
        </div>
      </div>

      {/* Trade Configuration */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Contract Type</label>
            <select className="w-full bg-background border border-border rounded-md h-12 px-4 text-foreground focus:outline-none focus:border-primary">
              <option>Rise/Fall</option>
              <option>Higher/Lower</option>
              <option>Digits</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Duration</label>
            <div className="flex gap-2">
              <Input
                type="number"
                defaultValue="5"
                className="h-12 bg-background border-border text-lg font-medium"
                data-testid="input-duration"
              />
              <select className="bg-background border border-border rounded-md px-3 text-foreground focus:outline-none focus:border-primary">
                <option>Ticks</option>
                <option>Minutes</option>
                <option>Hours</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground font-medium">Stake (USD)</label>
            <Input
              type="number"
              defaultValue="10.00"
              step="1"
              className="h-12 bg-background border-border text-lg font-medium"
              data-testid="input-stake"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            data-testid="button-rise"
            className="h-20 bg-[#22C55E] hover:bg-[#16a34a] text-white rounded-xl flex items-center justify-center gap-3 text-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            <ArrowUp className="w-8 h-8" />
            RISE
          </button>
          <button
            data-testid="button-fall"
            className="h-20 bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-xl flex items-center justify-center gap-3 text-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            <ArrowDown className="w-8 h-8" />
            FALL
          </button>
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Open Positions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Contract", "Market", "Entry", "Current", "P&L"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                  No open positions
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
