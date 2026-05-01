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
      <div className="bg-[#121821] border border-[#1F2933] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <select className="bg-[#0B0F14] border border-[#1F2933] rounded-md h-12 px-4 text-lg font-medium text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6] w-full md:w-64">
            <option value="R_100">Volatility 100 Index</option>
            <option value="R_10">Volatility 10 Index</option>
          </select>
          <div className="hidden md:flex flex-col">
            <span className="text-xs text-[#9CA3AF]">Live Price</span>
            <span className="text-xl font-bold text-[#E5E7EB] font-mono">
              {latestTick ? latestTick.quote.toFixed(2) : "---.--"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-[#9CA3AF]">Demo Account</span>
          <span className="text-xl font-bold text-[#E5E7EB]">$10,000.00</span>
        </div>
      </div>

      {/* Trade Configuration */}
      <div className="bg-[#121821] border border-[#1F2933] rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-sm text-[#9CA3AF] font-medium">Contract Type</label>
            <select className="w-full bg-[#0B0F14] border border-[#1F2933] rounded-md h-12 px-4 text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]">
              <option>Rise/Fall</option>
              <option>Higher/Lower</option>
              <option>Digits</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#9CA3AF] font-medium">Duration</label>
            <div className="flex gap-2">
              <Input type="number" defaultValue="5" className="h-12 bg-[#0B0F14] border-[#1F2933] text-lg font-medium" />
              <select className="bg-[#0B0F14] border border-[#1F2933] rounded-md px-3 text-[#E5E7EB] focus:outline-none focus:border-[#3B82F6]">
                <option>Ticks</option>
                <option>Minutes</option>
                <option>Hours</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#9CA3AF] font-medium">Stake (USD)</label>
            <Input type="number" defaultValue="10.00" step="1" className="h-12 bg-[#0B0F14] border-[#1F2933] text-lg font-medium" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="h-20 bg-[#22C55E] hover:bg-[#16a34a] text-white rounded-xl flex items-center justify-center gap-3 text-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
            <ArrowUp className="w-8 h-8" />
            RISE
          </button>
          <button className="h-20 bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-xl flex items-center justify-center gap-3 text-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]">
            <ArrowDown className="w-8 h-8" />
            FALL
          </button>
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-[#121821] border border-[#1F2933] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1F2933]">
          <h3 className="text-lg font-semibold text-[#E5E7EB]">Open Positions</h3>
        </div>
        <div className="p-8 text-center">
          <p className="text-[#9CA3AF]">No open positions</p>
        </div>
      </div>
    </div>
  );
}
