import { useRef, useState, useMemo } from "react";
import { MonitorSmartphone, Puzzle, Play, ChevronRight, X, Search } from "lucide-react";
import { SiGoogledrive } from "react-icons/si";
import { useBot } from "@/context/BotContext";

// ─── helpers ────────────────────────────────────────────────────────────────

function navigate(tab: string) {
  window.dispatchEvent(new CustomEvent("tradex:navigate", { detail: tab }));
}

/** Try to pull trading params out of a Deriv XML bot file */
function parseXmlBot(xmlText: string): Partial<{
  symbol: string; contractType: string; stake: number;
  duration: number; durationUnit: string;
}> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const result: Record<string, string> = {};

    // Deriv bot XML: <field name="SYMBOL_LIST"><shadow><field name="...">R_100</field>
    // Also look for plain text content in fields
    doc.querySelectorAll("field").forEach(el => {
      const name = el.getAttribute("name") ?? "";
      const text = (el.textContent ?? "").trim();
      if (text) result[name] = text;
    });

    const contractMap: Record<string, string> = {
      DIGITEVEN: "DIGITEVEN", DIGITODD: "DIGITODD",
      DIGITOVER: "DIGITOVER", DIGITUNDER: "DIGITUNDER",
      DIGITMATCH: "DIGITMATCH", DIGITDIFF: "DIGITDIFF",
      CALL: "CALL", PUT: "PUT",
      even: "DIGITEVEN", odd: "DIGITODD",
    };

    const out: Parameters<typeof parseXmlBot>[0] extends string ? never : ReturnType<typeof parseXmlBot> = {};

    // Symbol
    const sym = result["SYMBOL_LIST"] || result["symbol"] || result["MARKET"];
    if (sym) out.symbol = sym;

    // Contract type
    const ct = result["CONTRACT_LIST"] || result["contract_type"] || result["TRADE_TYPE"];
    if (ct && contractMap[ct]) out.contractType = contractMap[ct];

    // Stake
    const stake = Number(result["AMOUNT"] || result["stake"] || result["INITIAL_STAKE"]);
    if (stake > 0) out.stake = stake;

    // Duration
    const dur = Number(result["DURATION"] || result["duration"]);
    if (dur > 0) out.duration = dur;

    const unit = result["DURATION_UNITS"] || result["duration_unit"];
    if (unit) out.durationUnit = unit;

    return out;
  } catch {
    return {};
  }
}

// ─── Strategy data ───────────────────────────────────────────────────────────

const ACCUMULATORS_STRATEGIES = [
  "Martingale",
  "Martingale on Stat Reset",
  "D'Alembert",
  "D'Alembert on Stat Reset",
  "Reverse Martingale",
  "Reverse Martingale on Stat Reset",
  "Reverse D'Alembert",
  "Reverse D'Alembert on Stat Reset",
];

const OPTIONS_STRATEGIES = [
  "Martingale",
  "D'Alembert",
  "Reverse Martingale",
  "Reverse D'Alembert",
  "Oscar's Grind",
];

type FilterTab = "All" | "Accumulators" | "Options";

// ─── Google Drive modal ──────────────────────────────────────────────────────

function GoogleDriveModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 flex flex-col items-center gap-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Google Drive logo */}
        <SiGoogledrive className="w-16 h-16 text-[#4285F4]" />

        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Google Drive</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sign in to import your bot from Google Drive
          </p>
        </div>

        <button
          onClick={() => {}}
          className="w-full bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-lg py-3 font-semibold text-sm transition-colors"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

// ─── Quick Strategy modal ────────────────────────────────────────────────────

function QuickStrategyModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (strategy: string, category: "Accumulators" | "Options") => void;
}) {
  const [tab, setTab] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.toLowerCase();

    const acc = ACCUMULATORS_STRATEGIES
      .filter(s => s.toLowerCase().includes(q))
      .map(s => ({ name: s, category: "Accumulators" as const }));

    const opt = OPTIONS_STRATEGIES
      .filter(s => s.toLowerCase().includes(q))
      .map(s => ({ name: s, category: "Options" as const }));

    if (tab === "Accumulators") return { acc, opt: [] };
    if (tab === "Options")      return { acc: [], opt };
    return { acc, opt };
  }, [tab, search]);

  const TABS: FilterTab[] = ["All", "Accumulators", "Options"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 flex flex-col overflow-hidden" style={{ maxHeight: "80vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Step 1 / 2</p>
            <h2 className="text-xl font-bold text-foreground">Choose your strategy</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search strategies..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 px-6 pt-3 shrink-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                tab === t
                  ? "bg-primary text-white"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Strategy list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3 space-y-4">
          {/* Accumulators section */}
          {visible.acc.length > 0 && (
            <div>
              {(tab === "All") && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Accumulators
                </p>
              )}
              <div className="border border-border rounded-xl overflow-hidden">
                {visible.acc.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => onSelect(s.name, s.category)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/60 transition-colors group ${
                      i < visible.acc.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {s.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Options section */}
          {visible.opt.length > 0 && (
            <div>
              {(tab === "All") && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Options
                </p>
              )}
              <div className="border border-border rounded-xl overflow-hidden">
                {visible.opt.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => onSelect(s.name, s.category)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/60 transition-colors group ${
                      i < visible.opt.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {s.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {visible.acc.length === 0 && visible.opt.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Search className="w-8 h-8 opacity-40" />
              <p className="text-sm">No strategies match "{search}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { setParams, setBotLoaded } = useBot();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDriveModal,    setShowDriveModal]    = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);

  // LOCAL — trigger file picker
  const handleLocal = () => fileInputRef.current?.click();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting same file

    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const parsed = parseXmlBot(text);
      if (Object.keys(parsed).length > 0) setParams(parsed);
      setBotLoaded(true);
      navigate("Bot Builder");
    };
    reader.readAsText(file);
  };

  // QUICK STRATEGY — user picks a strategy
  const handleSelectStrategy = (name: string, _category: "Accumulators" | "Options") => {
    // Map strategy name → sensible defaults
    const strategyDefaults: Record<string, Partial<Parameters<typeof setParams>[0]>> = {
      "Martingale":                        { contractType: "DIGITEVEN", stake: 1 },
      "Martingale on Stat Reset":          { contractType: "DIGITEVEN", stake: 1 },
      "D'Alembert":                        { contractType: "DIGITEVEN", stake: 1 },
      "D'Alembert on Stat Reset":          { contractType: "DIGITEVEN", stake: 1 },
      "Reverse Martingale":                { contractType: "DIGITEVEN", stake: 1 },
      "Reverse Martingale on Stat Reset":  { contractType: "DIGITEVEN", stake: 1 },
      "Reverse D'Alembert":                { contractType: "DIGITEVEN", stake: 1 },
      "Reverse D'Alembert on Stat Reset":  { contractType: "DIGITEVEN", stake: 1 },
      "Oscar's Grind":                     { contractType: "CALL",      stake: 1 },
    };

    const defaults = strategyDefaults[name] ?? {};
    setParams(defaults);
    setBotLoaded(true);
    setShowStrategyModal(false);
    navigate("Bot Builder");
  };

  const cards = [
    {
      icon: MonitorSmartphone,
      label: "Local",
      sub: "Load from your device",
      onClick: handleLocal,
    },
    {
      icon: SiGoogledrive,
      label: "Google Drive",
      sub: "Load from Google Drive",
      onClick: () => setShowDriveModal(true),
    },
    {
      icon: Puzzle,
      label: "Bot Builder",
      sub: "Build a new bot visually",
      onClick: () => navigate("Bot Builder"),
    },
    {
      icon: Play,
      label: "Quick Strategy",
      sub: "Start with a pre-built strategy",
      onClick: () => setShowStrategyModal(true),
    },
  ];

  return (
    <>
      {/* Hidden file input — XML only */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml,application/xml,text/xml"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Load or build your bot</h1>
          <p className="text-muted-foreground">Choose how to get started with your trading strategy</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {cards.map(({ icon: Icon, label, sub, onClick }) => (
            <div
              key={label}
              data-testid={`card-${label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={onClick}
              className="bg-card border border-border hover:border-primary rounded-xl p-6 cursor-pointer transition-colors group shadow-sm"
            >
              <Icon className="w-10 h-10 text-primary mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{label}</h2>
              <p className="text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showDriveModal    && <GoogleDriveModal    onClose={() => setShowDriveModal(false)} />}
      {showStrategyModal && <QuickStrategyModal  onClose={() => setShowStrategyModal(false)} onSelect={handleSelectStrategy} />}
    </>
  );
}
