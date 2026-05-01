import { useState } from "react";
import { Moon, Sun, Menu, ChevronDown, LogOut, User } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "@/context/AuthContext";

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
  const { isLoggedIn, activeAccount, accounts, login, logout, setActiveAccount } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

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
        {/* Theme toggle */}
        <button
          data-testid="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Auth buttons / account menu */}
        {isLoggedIn && activeAccount ? (
          <div className="relative hidden md:block">
            <button
              data-testid="account-menu-button"
              onClick={() => setShowAccountMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-md text-sm font-semibold transition-colors"
            >
              <User className="w-4 h-4" />
              <span>{activeAccount.account}</span>
              <span className="text-[10px] bg-primary text-white rounded px-1 py-0.5">{activeAccount.currency}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAccountMenu ? "rotate-180" : ""}`} />
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {accounts.map(acct => (
                  <button
                    key={acct.account}
                    data-testid={`account-switch-${acct.account}`}
                    onClick={() => { setActiveAccount(acct); setShowAccountMenu(false); }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                      acct.account === activeAccount.account
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{acct.account}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{acct.currency}</span>
                  </button>
                ))}
                <div className="border-t border-border">
                  <button
                    data-testid="button-logout"
                    onClick={() => { logout(); setShowAccountMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <button
              data-testid="button-login"
              onClick={login}
              className="px-4 py-1.5 text-sm font-semibold text-primary border border-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              Log In
            </button>
            <button
              data-testid="button-signup"
              onClick={login}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-[#22C55E] hover:bg-[#16a34a] rounded-md transition-colors"
            >
              Sign Up
            </button>
          </div>
        )}

        <button
          data-testid="mobile-menu"
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Click-outside overlay for account menu */}
      {showAccountMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAccountMenu(false)}
        />
      )}
    </nav>
  );
}
