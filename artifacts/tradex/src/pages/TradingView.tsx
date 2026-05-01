export default function TradingView() {
  return (
    <div className="flex-1 w-full h-[calc(100vh-56px-52px)] relative bg-background">
      <iframe
        src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=Deriv%3AVOLATILITY25IDX&interval=D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=f8fafc&studies=[]&hideideas=1&theme=light&style=1&timezone=exchange&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=tradex"
        className="w-full h-full border-0"
        title="TradingView Chart"
      />
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <a
          href="https://deriv.com"
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto bg-[#EF4444] hover:bg-[#dc2626] text-white px-4 py-2 rounded font-medium text-sm transition-colors shadow-lg"
        >
          Try free demo
        </a>
      </div>
    </div>
  );
}
