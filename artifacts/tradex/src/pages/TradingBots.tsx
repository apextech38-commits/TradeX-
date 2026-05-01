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
      <div className="flex overflow-x-auto border-b border-border mb-8 no-scrollbar">
        {["Free Bots", "SpeedBots", "Calculator", "Strategies"].map((tab, i) => (
          <button
            key={tab}
            data-testid={`subtab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
            className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
              i === 0
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {BOTS.map((bot, i) => (
          <div
            key={bot}
            data-testid={`card-bot-${i}`}
            className="bg-card border border-border rounded-xl p-6 relative flex flex-col hover:border-primary/50 transition-colors group shadow-sm"
          >
            <div className="absolute top-4 right-4 bg-[#FACC15] text-black text-[10px] font-bold px-2 py-1 rounded-sm tracking-wider">
              PREMIUM
            </div>

            <div className="w-16 h-16 bg-secondary border border-border rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-8 h-8 text-primary" />
            </div>

            <h3 className="text-xl font-bold text-foreground mb-1">{bot}</h3>

            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className="text-[#FACC15] text-sm">★</span>
              ))}
            </div>

            <p className="text-muted-foreground text-sm mb-6 flex-1">
              Features automated trading, risk management, and profit optimization. Built for serious traders.
            </p>

            <button
              data-testid={`button-load-bot-${i}`}
              className={`w-full py-2.5 rounded-lg font-semibold transition-colors ${
                i === 0
                  ? "bg-primary hover:bg-primary/90 text-white"
                  : "bg-secondary hover:bg-border text-foreground"
              }`}
            >
              Load Premium Bot
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
