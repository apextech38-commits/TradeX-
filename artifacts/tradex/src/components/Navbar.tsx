import { useState, useEffect } from "react";
import { Moon, Sun, Menu, X, ChevronDown, LogOut, User, Wifi, WifiOff } from "lucide-react";
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
  const {
    isLoggedIn, isAuthorized, activeAccount, accounts,
    balance, currency, wsConnected, login, signup, logout, switchAccount,
  } = useAuth();

  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [mobileOpen, setMobileOpen]           = useState(false);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const formattedBalance = balance !== null
    ? `${currency} ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : isLoggedIn ? "Loading..." : null;

  return (
    <>
      {/* ── Main navbar ─────────────────────────────────────────────────── */}
      <nav className="h-[56px] bg-card border-b border-border fixed top-0 left-0 right-0 z-40 flex items-center px-3 gap-2 justify-between shadow-sm">

        {/* Logo */}
        <button
          data-testid="logo-home"
          onClick={() => navigate("Dashboard")}
          className="flex items-start shrink-0 mr-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <span className="text-xl font-bold text-[#3B82F6]">TradeX</span>
          <span className="text-[10px] font-bold ml-0.5 mt-0.5 px-1 py-[1px] rounded bg-[#FACC15]/20 text-[#FACC15]">PRO</span>
        </button>

        {/* Desktop tabs — hidden on mobile */}
        <div className="hidden md:flex flex-1 overflow-x-auto no-scrollbar items-center gap-1.5 h-full py-2">
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

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0 ml-2">

          {/* Theme toggle — always visible */}
          <button
            data-testid="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Desktop: logged-in account menu */}
          {isLoggedIn ? (
            <div className="relative hidden md:block">
              <button
                data-testid="account-menu-button"
                onClick={() => setShowAccountMenu(v => !v)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-md transition-colors"
              >
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
                    <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
                      {wsConnected && isAuthorized
                        ? <><Wifi className="w-4 h-4 text-[#22C55E]" /><span className="text-xs text-[#22C55E] font-medium">Live — Connected to Deriv</span></>
                        : <><WifiOff className="w-4 h-4 text-[#FACC15]" /><span className="text-xs text-[#FACC15] font-medium">Reconnecting...</span></>
                      }
                    </div>
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
            /* Desktop: Log In + Sign Up — hidden on mobile */
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
                onClick={signup}
                className="px-4 py-1.5 text-sm font-semibold text-white bg-[#22C55E] hover:bg-[#16a34a] rounded-md transition-colors"
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Hamburger — mobile only */}
          <button
            data-testid="mobile-menu"
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* ── Mobile slide-in drawer ───────────────────────────────────────── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-[56px] right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Account status (if logged in) */}
        {isLoggedIn && (
          <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${wsConnected && isAuthorized ? "bg-[#22C55E]" : "bg-[#FACC15] animate-pulse"}`} />
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-xs text-muted-foreground truncate">{activeAccount?.account || "Account"}</span>
              <span className={`text-base font-bold ${balance !== null ? "text-[#22C55E]" : "text-muted-foreground"}`}>
                {formattedBalance ?? "—"}
              </span>
            </div>
          </div>
        )}

        {/* Tab list */}
        <div className="flex-1 overflow-y-auto py-3">
          {TABS.map(tab => (
            <button
              key={tab}
              data-testid={`mobile-tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => navigate(tab)}
              className={`w-full text-left px-5 py-3.5 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-[#22C55E]/10 text-[#22C55E] border-r-2 border-[#22C55E]"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}

          {/* Switch account rows on mobile */}
          {isLoggedIn && accounts.length > 1 && (
            <>
              <div className="px-5 pt-5 pb-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Accounts</span>
              </div>
              {accounts.map(acct => (
                <button
                  key={acct.account}
                  onClick={() => { switchAccount(acct); setMobileOpen(false); }}
                  className={`w-full flex items-center justify-between px-5 py-3 text-sm transition-colors ${
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
            </>
          )}
        </div>

        {/* Bottom — Log In / Sign Up OR Log Out */}
        <div className="border-t border-border p-4 space-y-2 shrink-0">
          {isLoggedIn ? (
            <button
              data-testid="mobile-logout"
              onClick={() => { logout(); setMobileOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444]/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          ) : (
            <>
              <button
                data-testid="mobile-login"
                onClick={() => { login(); setMobileOpen(false); }}
                className="w-full py-2.5 text-sm font-semibold text-primary border border-primary hover:bg-primary/10 rounded-md transition-colors"
              >
                Log In
              </button>
              <button
                data-testid="mobile-signup"
                onClick={() => { signup(); setMobileOpen(false); }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#22C55E] hover:bg-[#16a34a] rounded-md transition-colors"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
