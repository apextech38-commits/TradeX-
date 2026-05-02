import { useState } from "react";

const SYMBOLS = [
  { label: "Volatility 25 Index",  value: "Deriv:VOLATILITY_25"  },
  { label: "Volatility 100 Index", value: "Deriv:VOLATILITY_100" },
  { label: "Volatility 10 Index",  value: "Deriv:VOLATILITY_10"  },
  { label: "Volatility 75 Index",  value: "Deriv:VOLATILITY_75"  },
  { label: "Volatility 50 Index",  value: "Deriv:VOLATILITY_50"  },
];

export default function TradingView() {
  const [selected, setSelected] = useState(SYMBOLS[0]);

  const src =
    `https://www.tradingview.com/widgetembed/` +
    `?frameElementId=tradingview_chart` +
    `&symbol=${encodeURIComponent(selected.value)}` +
    `&interval=1` +
    `&hidesidetoolbar=0` +
    `&hidetoptoolbar=0` +
    `&symboledit=1` +
    `&saveimage=1` +
    `&toolbarbg=f8fafc` +
    `&studies=[]` +
    `&hideideas=1` +
    `&theme=light` +
    `&style=1` +
    `&timezone=exchange` +
    `&locale=en` +
    `&utm_source=tradex`;

  return (
    <div className="flex flex-col w-full h-[calc(100vh-56px-52px)] bg-background">
      {/* Symbol selector bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0 overflow-x-auto no-scrollbar">
        {SYMBOLS.map(sym => (
          <button
            key={sym.value}
            onClick={() => setSelected(sym)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shrink-0 ${
              selected.value === sym.value
                ? "bg-[#3B82F6] text-white shadow-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            {sym.label}
          </button>
        ))}
      </div>

      {/* TradingView iframe */}
      <div className="flex-1 relative">
        <iframe
          key={selected.value}
          src={src}
          className="w-full h-full border-0"
          title={`TradingView — ${selected.label}`}
          allowFullScreen
        />
      </div>
    </div>
  );
}
