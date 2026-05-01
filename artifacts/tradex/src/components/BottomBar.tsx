import { useState } from "react";
import { Play, ChevronUp, ChevronDown, X } from "lucide-react";

export default function BottomBar() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("Summary");
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <>
      {/* Risk Disclaimer Modal */}
      {showDisclaimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDisclaimer(false); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Risk Disclaimer</h2>
              <button
                onClick={() => setShowDisclaimer(false)}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-foreground leading-relaxed mb-6">
              <span className="font-bold">Important Risk Warning</span>
              {" "}Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products:{" "}
              a) you may lose some or all of the money you invest in the trade;{" "}
              b) if your trade involves currency conversion, exchange rates will affect your profit and loss. You should never trade with borrowed money or with money that you cannot afford to lose.
            </p>

            <button
              onClick={() => setShowDisclaimer(false)}
              className="w-full py-2.5 bg-[#FACC15] hover:bg-[#eab308] text-black font-bold rounded-lg transition-colors text-sm"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Expanded Panel */}
      {expanded && (
        <div className="fixed bottom-[52px] left-0 right-0 z-40 bg-background border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.10)]">
          <div className="flex items-center gap-6 px-6 border-b border-border bg-card">
            {["Summary", "Transactions", "Journal"].map(tab => (
              <button
                key={tab}
                data-testid={`panel-tab-${tab.toLowerCase()}`}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
            <div className="flex-1" />
            <button
              data-testid="button-reset"
              className="text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1 rounded hover:bg-secondary transition-colors"
            >
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
                  { label: "Total Profit/Loss", val: "0.00", highlight: true },
                ].map((stat) => (
                  <div key={stat.label} className="bg-card border border-border rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                    <div className={`text-lg font-bold ${stat.highlight ? "text-[#22C55E]" : "text-foreground"}`}>
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab !== "Summary" && (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                No {activeTab.toLowerCase()} data available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="h-[52px] bg-card border-t border-border fixed bottom-0 left-0 right-0 z-40 flex items-center px-4 gap-4 shadow-sm">
        <button
          data-testid="button-risk-disclaimer"
          onClick={() => setShowDisclaimer(true)}
          className="text-[#FACC15] border border-[#FACC15] px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#FACC15]/10 transition-colors whitespace-nowrap shrink-0"
        >
          Risk Disclaimer
        </button>

        <div className="w-[1px] h-6 bg-border shrink-0" />

        <button
          data-testid="button-run"
          className="bg-[#22C55E] hover:bg-[#16a34a] text-white w-8 h-8 rounded flex items-center justify-center shrink-0 transition-colors"
          aria-label="Run bot"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </button>

        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">Bot is not running</span>

        <div className="flex-1 px-4 hidden md:flex items-center h-full">
          <div className="w-full h-0.5 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-primary w-0" />
          </div>
        </div>

        <button
          data-testid="button-expand-panel"
          onClick={() => setExpanded(!expanded)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors shrink-0 md:ml-auto"
          aria-label={expanded ? "Collapse panel" : "Expand panel"}
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
