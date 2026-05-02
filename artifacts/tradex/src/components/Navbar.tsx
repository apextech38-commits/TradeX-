import { useState } from "react";
import { Moon, Sun, Menu, ChevronDown, LogOut, User, Wifi, WifiOff } from "lucide-react";
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
  const { isLoggedIn, isAuthorized, activeAccount, accounts, balance, currency, wsConnected, login, logout, switchAccount } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const formattedBalance = balance !== null
    ? `${currency} ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : isLoggedIn ? "Loading..." : null;

  return (
    <nav className="h-[56px] bg-card border-b border-border fixed top-0 left-0 right-0 z-40 flex items-center px-3 gap-2 justify-between shadow-sm">
      {/* Logo */}
      <button
        data-testid="logo-home"
        onClick={() => setActiveTab("Dashboard")}
        className="flex items-start shrink-0 mr-2 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <span className="text-xl font-bold text-[#3B82F6]">TradeX</span>
        <span className="text-[10px] font-bold ml-0.5 mt-0.5 px-1 py-[1px] rounded bg-[#FACC15]/20 text-[#FACC15]">PRO</span>
      </button>

      {/* Tabs */}
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

      {/* Right Side */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {/* Theme toggle */}
        <button
          data-testid="theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Logged-in: balance + account menu */}
        {isLoggedIn ? (
          <div className="relative hidden md:block">
            <button
              data-testid="account-menu-button"
              onClick={() => setShowAccountMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-colors"
            >
              {/* WS status dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${wsConnected && isAuthorized ? "bg-[#22C55E]" : "bg-[#FACC15] animate-pulse"}`} />

              <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] text-muted-foreground">{activeAccount?.account || "Account"}</span>
                <span className={`text-sm font-bold ${balance !== null ? "text-[#22C55E]" : "text-muted-foreground"}`}>
                  {formattedBalance ?? "—"}
                </span>
              </div>

              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showAccountMenu ? "rotate-180" : ""}`} />
            </button>

            {showAccountMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
                <div className="absolute right-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* WS status header */}
                  <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
                    {wsConnected && isAuthorized
                      ? <><Wifi className="w-4 h-4 text-[#22C55E]" /><span className="text-xs text-[#22C55E] font-medium">Live — Connected to Deriv</span></>
                      : <><WifiOff className="w-4 h-4 text-[#FACC15]" /><span className="text-xs text-[#FACC15] font-medium">Reconnecting...</span></>
                    }
                  </div>

                  {/* Account list */}
                  {accounts.map(acct => (
                    <button
                      key={acct.account}
                      data-testid={`switch-${acct.account}`}
                      onClick={() => { switchAccount(acct); setShowAccountMenu(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                        acct.account === activeAccount?.account
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{acct.account}</span>
                      </div>
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-secondary rounded">{acct.currency}</span>
                    </button>
                  ))}

                  {/* Logout */}
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
              </>
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
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
