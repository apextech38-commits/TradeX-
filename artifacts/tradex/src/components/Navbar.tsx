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
    <nav className="h-[56px] bg-[#121821] border-b border-[#1F2933] fixed top-0 left-0 right-0 z-40 flex items-center px-4 justify-between">
      {/* Logo */}
      <div className="flex items-start shrink-0 mr-6">
        <span className="text-xl font-bold text-[#3B82F6]">TradeX</span>
        <span className="text-[#FACC15] text-[10px] font-bold ml-0.5 mt-0.5 px-1 py-[1px] rounded bg-[#FACC15]/10">PRO</span>
      </div>

      {/* Center Tabs (Scrollable on mobile) */}
      <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1 md:gap-2 h-full">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-3 md:px-4 h-full text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab 
                ? "border-[#3B82F6] text-[#3B82F6]" 
                : "border-transparent text-[#9CA3AF] hover:text-[#E5E7EB]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2933] rounded-md transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="hidden md:flex items-center gap-2">
          <button className="px-4 py-1.5 text-sm font-medium text-[#3B82F6] border border-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-md transition-colors">
            Log In
          </button>
          <button className="px-4 py-1.5 text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 rounded-md transition-colors">
            Sign Up
          </button>
        </div>
        <button className="md:hidden p-2 text-[#9CA3AF] hover:text-[#E5E7EB]">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
