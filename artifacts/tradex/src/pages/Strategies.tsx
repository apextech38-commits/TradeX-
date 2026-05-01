import { TrendingUp, CircleDot, CircleOff, ArrowUpRight } from "lucide-react";

const strategies = [
  {
    title: "Over/Under",
    icon: TrendingUp,
    iconColor: "text-primary",
    iconBg: "bg-primary/10 border-primary/20",
    description: "Predict whether the last digit of the next tick will be over or under the threshold."
  },
  {
    title: "Odd",
    icon: CircleOff,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-500/10 border-pink-500/20",
    description: "Predict that the last digit of the next tick will be an odd number."
  },
  {
    title: "Even",
    icon: CircleDot,
    iconColor: "text-[#22C55E]",
    iconBg: "bg-[#22C55E]/10 border-[#22C55E]/20",
    description: "Predict that the last digit of the next tick will be an even number."
  },
  {
    title: "Hit and Run",
    icon: ArrowUpRight,
    iconColor: "text-[#EF4444]",
    iconBg: "bg-[#EF4444]/10 border-[#EF4444]/20",
    description: "A dynamic strategy that capitalizes on short-term momentum."
  }
];

export default function Strategies() {
  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Advanced Trading Strategies</h1>
        <p className="text-muted-foreground">Select a trading strategy to view detailed execution guidelines.</p>
      </div>

      <div className="space-y-4">
        {strategies.map((strategy, i) => (
          <div
            key={i}
            data-testid={`card-strategy-${strategy.title.toLowerCase().replace(/\s+/g, "-")}`}
            className="bg-card border border-border rounded-xl p-6 flex flex-col md:flex-row md:items-center gap-6 hover:border-primary/40 transition-colors group shadow-sm cursor-pointer"
          >
            <div className={`w-16 h-16 rounded-full border flex items-center justify-center shrink-0 ${strategy.iconBg} ${strategy.iconColor}`}>
              <strategy.icon className="w-8 h-8" />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground mb-2">{strategy.title}</h2>
              <p className="text-muted-foreground">{strategy.description}</p>
            </div>

            <button className="text-primary font-semibold hover:text-primary/80 transition-colors flex items-center gap-1 shrink-0">
              Explore Strategy <span className="text-lg group-hover:translate-x-1 transition-transform inline-block">→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
