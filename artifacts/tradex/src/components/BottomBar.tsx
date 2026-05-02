import { useState, useRef } from "react";
import { Play, Square, ChevronUp, ChevronDown, X } from "lucide-react";
import { useBot } from "@/context/BotContext";
import { useAuth } from "@/context/AuthContext";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const TOKEN_KEY = "deriv_token";

export default function BottomBar() {
  const [expanded, setExpanded]           = useState(false);
  const [activeTab, setActiveTab]         = useState("Summary");
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [statusMsg, setStatusMsg]         = useState("Bot is not running");
  const [noBot, setNoBot]                 = useState(false);

  const tradeWsRef = useRef<WebSocket | null>(null);
  const { isLoggedIn } = useAuth();
  const {
    botLoaded, isRunning, params,
    results, totalStake, totalPayout, totalProfit, won, lost, runs,
    setIsRunning, addResult, reset,
  } = useBot();

  const stopBot = () => {
    tradeWsRef.current?.close();
    tradeWsRef.current = null;
    setIsRunning(false);
    setStatusMsg("Bot stopped");
  };

  const runBot = () => {
    if (!botLoaded) {
      setNoBot(true);
      setTimeout(() => setNoBot(false), 3000);
      return;
    }
    if (!isLoggedIn) {
      setStatusMsg("Please log in to trade");
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setStatusMsg("No Deriv token found — please log in");
      return;
    }

    setIsRunning(true);
    setStatusMsg("Connecting to Deriv...");
    setExpanded(true);
    setActiveTab("Summary");

    const ws = new WebSocket(WS_URL);
    tradeWsRef.current = ws;

    ws.onopen = () => {
      setStatusMsg("Authorizing...");
      ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.error) {
          setStatusMsg(`Error: ${msg.error.message}`);
          setIsRunning(false);
          return;
        }

        if (msg.msg_type === "authorize") {
          setStatusMsg("Placing trade...");
          ws.send(JSON.stringify({
            buy: 1,
            subscribe: 1,
            price: params.stake,
            parameters: {
              amount: params.stake,
              basis: "stake",
              contract_type: params.contractType,
              currency: "USD",
              duration: params.duration,
              duration_unit: params.durationUnit,
              symbol: params.symbol,
            },
          }));
          return;
        }

        if (msg.msg_type === "buy") {
          const b = msg.buy;
          setStatusMsg(`Contract ${b.contract_id} open — waiting for result...`);
          addResult({
            id: String(b.contract_id),
            buyPrice: b.buy_price,
            payout: b.payout,
            profit: null,
            status: "open",
            timestamp: Date.now(),
          });
          return;
        }

        if (msg.msg_type === "proposal_open_contract") {
          const c = msg.proposal_open_contract;
          if (c.is_sold) {
            const profit = c.profit ?? 0;
            const status = profit >= 0 ? "won" : "lost";
            addResult({
              id: String(c.contract_id),
              buyPrice: c.buy_price,
              payout: c.payout,
              profit,
              status,
              timestamp: Date.now(),
            });
            setStatusMsg(`Contract ${status === "won" ? "WON" : "LOST"} — profit: ${profit >= 0 ? "+" : ""}${profit.toFixed(2)}`);
            setIsRunning(false);
          }
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      setStatusMsg("WebSocket error — check connection");
      setIsRunning(false);
    };
    ws.onclose = () => {
      if (isRunning) setStatusMsg("Connection closed");
    };
  };

  return (
    <>
      {/* Risk Disclaimer Modal */}
      {showDisclaimer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowDisclaimer(false); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Risk Disclaimer</h2>
              <button onClick={() => setShowDisclaimer(false)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-6">
              <span className="font-bold">Important Risk Warning</span>{" "}
              Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk. You may lose some or all of the money you invest. Never trade with borrowed money or money you cannot afford to lose.
            </p>
            <button
              onClick={() => setShowDisclaimer(false)}
              className="w-full py-2.5 bg-[#FACC15] hover:bg-[#eab308] text-black font-bold rounded-lg text-sm"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* No-bot toast */}
      {noBot && (
        <div className="fixed bottom-[64px] left-1/2 -translate-x-1/2 z-50 bg-[#EF4444] text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-xl">
          Please load or build a bot first
        </div>
      )}

      {/* Expanded Panel */}
      {expanded && (
        <div className="fixed bottom-[52px] left-0 right-0 z-40 bg-background border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.10)]">
          <div className="flex items-center gap-6 px-6 border-b border-border bg-card">
            {["Summary", "Transactions", "Journal"].map(tab => (
              <button
                key={tab}
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
              onClick={reset}
              className="text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1 rounded hover:bg-secondary"
            >
              Reset
            </button>
          </div>

          <div className="p-4">
            {activeTab === "Summary" && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { label: "Total Stake",     val: totalStake.toFixed(2)  },
                  { label: "Total Payout",    val: totalPayout.toFixed(2) },
                  { label: "No. of Runs",     val: String(runs)           },
                  { label: "Contracts Lost",  val: String(lost)           },
                  { label: "Contracts Won",   val: String(won)            },
                  {
                    label: "Total Profit/Loss",
                    val: (totalProfit >= 0 ? "+" : "") + totalProfit.toFixed(2),
                    highlight: true,
                    positive: totalProfit >= 0,
                  },
                ].map(stat => (
                  <div key={stat.label} className="bg-card border border-border rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                    <div className={`text-lg font-bold ${
                      stat.highlight
                        ? stat.positive ? "text-[#22C55E]" : "text-[#EF4444]"
                        : "text-foreground"
                    }`}>
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "Transactions" && (
              results.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                  No transactions yet.
                </div>
              ) : (
                <div className="overflow-auto max-h-48 space-y-2">
                  {results.map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-2 text-sm">
                      <span className="text-muted-foreground font-mono text-xs">#{r.id}</span>
                      <span className="text-foreground">Stake: {r.buyPrice.toFixed(2)}</span>
                      <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                        r.status === "won" ? "bg-[#22C55E]/10 text-[#22C55E]" :
                        r.status === "lost" ? "bg-[#EF4444]/10 text-[#EF4444]" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {r.status === "open" ? "Open" : r.status === "won" ? `+${r.profit?.toFixed(2)}` : r.profit?.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === "Journal" && (
              <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                No journal entries yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="h-[52px] bg-card border-t border-border fixed bottom-0 left-0 right-0 z-40 flex items-center px-4 gap-4 shadow-sm">
        <button
          onClick={() => setShowDisclaimer(true)}
          className="text-[#FACC15] border border-[#FACC15] px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#FACC15]/10 transition-colors whitespace-nowrap shrink-0"
        >
          Risk Disclaimer
        </button>

        <div className="w-[1px] h-6 bg-border shrink-0" />

        {isRunning ? (
          <button
            onClick={stopBot}
            className="bg-[#EF4444] hover:bg-red-600 text-white w-8 h-8 rounded flex items-center justify-center shrink-0 transition-colors"
            aria-label="Stop bot"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={runBot}
            className="bg-[#22C55E] hover:bg-[#16a34a] text-white w-8 h-8 rounded flex items-center justify-center shrink-0 transition-colors"
            aria-label="Run bot"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        )}

        <span className={`text-xs whitespace-nowrap shrink-0 ${isRunning ? "text-[#22C55E] animate-pulse" : "text-muted-foreground"}`}>
          {statusMsg}
        </span>

        {isRunning && (
          <div className="flex-1 px-4 hidden md:flex items-center h-full">
            <div className="w-full h-1 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-[#22C55E] rounded-full animate-pulse w-1/3" />
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors shrink-0 md:ml-auto"
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
