import { Moon, Sun, Menu } from "lucide-react";
import { useTheme } from "./ThemeProvider";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TABS = [
  "Dashboard",
  "Bot Builder",
  "Manual Traders",
  "Charts",
  "Trading Bots",
  "Analysis Tool",
  "Strategies",
  "Copy Trading",
  "TradingView"
];

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="h-[56px] bg-card border-b border-border fixed top-0 left-0 right-0 z-40 flex items-center px-3 gap-2 justify-between shadow-sm">
      {/* Logo */}
      <button
        data-testid="logo-home"
        onClick={() => setActiveTab("Dashboard")}
        className="flex items-start shrink-0 mr-2 hover:opacity-80 transition-opacity cursor-pointer"
        aria-label="Go to home"
      >
        <span className="text-xl font-bold text-[#3B82F6]">TradeX</span>
        <span className="text-[10px] font-bold ml-0.5 mt-0.5 px-1 py-[1px] rounded bg-[#FACC15]/20 text-[#FACC15]">PRO</span>
      </button>

      {/* Scrollable Pill Tabs */}
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 h-full py-2">
        {TABS.map(tab => (
          <button
            key={tab}
            data-testid={`tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              activeTab === tab
                ? "bg-[#22C55E] text-white shadow-sm"
                : "bg-slate-800 dark:bg-[#1F2933] text-white hover:bg-slate-700 dark:hover:bg-[#2e3c4a]"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <button
          data-testid="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="hidden md:flex items-center gap-2">
          <button
            data-testid="button-login"
            className="px-4 py-1.5 text-sm font-semibold text-primary border border-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            Log In
          </button>
          <button
            data-testid="button-signup"
            className="px-4 py-1.5 text-sm font-semibold text-white bg-[#22C55E] hover:bg-[#16a34a] rounded-md transition-colors"
          >
            Sign Up
          </button>
        </div>
        <button
          data-testid="mobile-menu"
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
