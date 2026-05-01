import { Bot } from "lucide-react";

const BOTS = [
  "TradeX Pro Atlas",
  "TradeX Pro Nova",
  "TradeX Pro Orion",
  "TradeX Pro Vega",
  "TradeX Pro Titan",
  "TradeX Pro Zenith",
  "TradeX Pro Apex"
];

export default function TradingBots() {
  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
      {/* Sub-tabs */}
      <div className="flex overflow-x-auto border-b border-[#1F2933] mb-8 no-scrollbar">
        {["Free Bots", "SpeedBots", "Calculator", "Strategies"].map((tab, i) => (
          <button
            key={tab}
            className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
              i === 0 
                ? "border-[#3B82F6] text-[#3B82F6]" 
                : "border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BOTS.map((bot, i) => (
          <div key={bot} className="bg-[#121821] border border-[#1F2933] rounded-xl p-6 relative flex flex-col hover:border-[#3B82F6]/50 transition-colors group">
            <div className="absolute top-4 right-4 bg-[#FACC15] text-black text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider">
              PREMIUM
            </div>
            
            <div className="w-16 h-16 bg-[#0B0F14] border border-[#1F2933] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-8 h-8 text-[#3B82F6]" />
            </div>

            <h3 className="text-xl font-bold text-[#E5E7EB] mb-1">{bot}</h3>
            
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(star => (
                <span key={star} className="text-[#FACC15] text-sm">★</span>
              ))}
            </div>

            <p className="text-[#9CA3AF] text-sm mb-6 flex-1 line-clamp-2">
              Features automated trading, risk management, and profit optimization. Built for serious traders.
            </p>

            <button className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
              i === 0 
                ? "bg-[#3B82F6] hover:bg-blue-600 text-white" 
                : "bg-[#1F2933] hover:bg-[#2e3c4a] text-[#E5E7EB]"
            }`}>
              Load Premium Bot
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
