import { TrendingUp, CircleDot, CircleOff, ArrowUpRight } from "lucide-react";

export default function Strategies() {
  const strategies = [
    {
      title: "Over/Under",
      icon: TrendingUp,
      iconColor: "text-[#3B82F6]",
      description: "Predict whether the last digit of the next tick will be over or under the threshold."
    },
    {
      title: "Odd",
      icon: CircleOff,
      iconColor: "text-[#EC4899]",
      description: "Predict that the last digit of the next tick will be an odd number."
    },
    {
      title: "Even",
      icon: CircleDot,
      iconColor: "text-[#22C55E]",
      description: "Predict that the last digit of the next tick will be an even number."
    },
    {
      title: "Hit and Run",
      icon: ArrowUpRight,
      iconColor: "text-[#EF4444]",
      description: "A dynamic strategy that capitalizes on short-term momentum."
    }
  ];

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-[#E5E7EB] mb-2">Advanced Trading Strategies</h1>
        <p className="text-[#9CA3AF]">Select a trading strategy to view detailed execution guidelines.</p>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy, i) => (
          <div key={i} className="bg-[#121821] border border-[#1F2933] rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-6 hover:border-[#3B82F6]/50 transition-colors group">
            <div className={`w-16 h-16 rounded-full bg-[#0B0F14] border border-[#1F2933] flex items-center justify-center shrink-0 ${strategy.iconColor}`}>
              <strategy.icon className="w-8 h-8" />
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#E5E7EB] mb-2">{strategy.title}</h2>
              <p className="text-[#9CA3AF]">{strategy.description}</p>
            </div>
            
            <button className="text-[#3B82F6] font-medium hover:text-blue-400 transition-colors flex items-center gap-1 shrink-0">
              Explore Strategy <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
