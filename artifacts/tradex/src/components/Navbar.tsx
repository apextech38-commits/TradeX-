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
    <nav className="h-[56px] bg-card border-b border-border fixed top-0 left-0 right-0 z-40 flex items-center px-4 justify-between">
      {/* Logo — clicking returns to Dashboard (landing page) */}
      <button
        data-testid="logo-home"
        onClick={() => setActiveTab("Dashboard")}
        className="flex items-start shrink-0 mr-6 hover:opacity-80 transition-opacity cursor-pointer"
        aria-label="Go to home"
      >
        <span className="text-xl font-bold text-[#3B82F6] dark:text-[#3B82F6]">TradeX</span>
        <span className="text-[#FACC15] text-[10px] font-bold ml-0.5 mt-0.5 px-1 py-[1px] rounded bg-[#FACC15]/10">PRO</span>
      </button>

      {/* Center Tabs (Scrollable on mobile) */}
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1 md:gap-2 h-full">
        {TABS.map(tab => (
          <button
            key={tab}
            data-testid={`tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-3 md:px-4 h-full text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#3B82F6] text-[#3B82F6]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button
          data-testid="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-border rounded-md transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="hidden md:flex items-center gap-2">
          <button
            data-testid="button-login"
            className="px-4 py-1.5 text-sm font-medium text-primary border border-primary hover:bg-primary/10 rounded-md transition-colors"
          >
            Log In
          </button>
          <button
            data-testid="button-signup"
            className="px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
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
