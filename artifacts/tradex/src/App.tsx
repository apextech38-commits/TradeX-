import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";

import LoadingScreen from "@/components/LoadingScreen";
import Navbar, { TABS } from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";

import Dashboard from "@/pages/Dashboard";
import BotBuilder from "@/pages/BotBuilder";
import ManualTraders from "@/pages/ManualTraders";
import Charts from "@/pages/Charts";
import TradingBots from "@/pages/TradingBots";
import AnalysisTool from "@/pages/AnalysisTool";
import Strategies from "@/pages/Strategies";
import CopyTrading from "@/pages/CopyTrading";
import TradingView from "@/pages/TradingView";

const queryClient = new QueryClient();

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TABS[0]);

  if (loading) {
    return <LoadingScreen onComplete={() => setLoading(false)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard": return <Dashboard />;
      case "Bot Builder": return <BotBuilder />;
      case "Manual Traders": return <ManualTraders />;
      case "Charts": return <Charts />;
      case "Trading Bots": return <TradingBots />;
      case "Analysis Tool": return <AnalysisTool />;
      case "Strategies": return <Strategies />;
      case "Copy Trading": return <CopyTrading />;
      case "TradingView": return <TradingView />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans flex flex-col pt-[56px] pb-[52px]">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col w-full h-full overflow-y-auto">
        {renderContent()}
      </main>

      <BottomBar />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="tradex-theme-v3">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
