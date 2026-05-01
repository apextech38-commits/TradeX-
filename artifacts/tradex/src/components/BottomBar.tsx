import { useState } from "react";
import { Play, ChevronUp, ChevronDown } from "lucide-react";

export default function BottomBar() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("Summary");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Expanded Panel */}
      {expanded && (
        <div className="bg-[#0B0F14] border-t border-[#1F2933] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-6 px-6 border-b border-[#1F2933] bg-[#121821]">
            {["Summary", "Transactions", "Journal"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab ? "border-[#3B82F6] text-[#3B82F6]" : "border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]"
                }`}
              >
                {tab}
              </button>
            ))}
            <div className="flex-1" />
            <button className="text-xs text-[#9CA3AF] hover:text-[#E5E7EB] border border-[#1F2933] px-3 py-1 rounded hover:bg-[#1F2933] transition-colors">
              Reset
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === "Summary" && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { label: "Total Stake", val: "0.00" },
                  { label: "Total Payout", val: "0.00" },
                  { label: "No. of Runs", val: "0" },
                  { label: "Contracts Lost", val: "0" },
                  { label: "Contracts Won", val: "0" },
                  { label: "Total Profit/Loss", val: "0.00", color: "text-[#22C55E]" },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#121821] border border-[#1F2933] rounded-lg p-4">
                    <div className="text-xs text-[#9CA3AF] mb-1">{stat.label}</div>
                    <div className={`text-lg font-bold ${stat.color || 'text-[#E5E7EB]'}`}>{stat.val}</div>
                  </div>
                ))}
              </div>
            )}
            {activeTab !== "Summary" && (
              <div className="h-24 flex items-center justify-center text-[#9CA3AF]">
                No {activeTab.toLowerCase()} data available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="h-[52px] bg-[#121821] border-t border-[#1F2933] flex items-center px-4 gap-4">
        <button className="text-[#FACC15] border border-[#FACC15] px-3 py-1.5 rounded text-xs font-medium hover:bg-[#FACC15]/10 transition-colors whitespace-nowrap shrink-0">
          Risk Disclaimer
        </button>
        
        <div className="w-[1px] h-6 bg-[#1F2933] shrink-0" />
        
        <button className="bg-[#22C55E] hover:bg-[#16a34a] text-white w-8 h-8 rounded flex items-center justify-center shrink-0 transition-colors">
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </button>
        
        <span className="text-xs text-[#9CA3AF] whitespace-nowrap shrink-0">Bot is not running</span>
        
        <div className="flex-1 px-4 hidden md:flex items-center h-full">
          <div className="w-full h-0.5 bg-[#1F2933] rounded-full overflow-hidden">
            <div className="h-full bg-[#3B82F6] w-0" />
          </div>
        </div>
        
        <button 
          onClick={() => setExpanded(!expanded)}
          className="p-2 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2933] rounded transition-colors shrink-0 md:ml-auto"
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
