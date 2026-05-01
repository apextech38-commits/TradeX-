import { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from "recharts";
import { useDerivWS } from "@/hooks/useDerivWS";
import { useTheme } from "@/components/ThemeProvider";

export default function Charts() {
  const { latestTick, subscribe, unsubscribe } = useDerivWS();
  const { theme } = useTheme();
  const [data, setData] = useState<{ value: number }[]>([]);

  const isDark = theme === "dark";
  const strokeColor = isDark ? "#3B82F6" : "#1e293b";
  const fillFrom = isDark ? "rgba(59,130,246,0.25)" : "rgba(30,41,59,0.12)";
  const fillTo = isDark ? "rgba(59,130,246,0)" : "rgba(30,41,59,0)";
  const gridColor = isDark ? "#1F2933" : "#e5e7eb";

  useEffect(() => {
    subscribe("R_100");
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  useEffect(() => {
    const initData: { value: number }[] = [];
    let val = 5000;
    for (let i = 0; i < 200; i++) {
      val = val + (Math.random() - 0.5) * 10;
      initData.push({ value: val });
    }
    setData(initData);
  }, []);

  useEffect(() => {
    if (latestTick) {
      setData((prev) => {
        const newData = [...prev, { value: latestTick.quote }];
        if (newData.length > 200) return newData.slice(newData.length - 200);
        return newData;
      });
    }
  }, [latestTick]);

  const isPositive = data.length >= 2 && data[data.length - 1].value >= data[data.length - 2].value;
  const latestVal = data.length > 0 ? data[data.length - 1].value : null;
  const prevVal = data.length >= 2 ? data[data.length - 2].value : null;
  const change = latestVal && prevVal ? (latestVal - prevVal).toFixed(2) : "0.00";
  const changePct = latestVal && prevVal ? (((latestVal - prevVal) / prevVal) * 100).toFixed(2) : "0.00";

  return (
    <div className="flex-1 relative h-[calc(100vh-56px-52px)] w-full overflow-hidden bg-background">
      {/* Instrument Info */}
      <div className="absolute top-4 left-4 z-10 p-3 bg-card/90 backdrop-blur-sm border border-border rounded-xl shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-muted-foreground text-xs font-medium">Volatility 100 Index</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground font-mono">
            {latestVal ? latestVal.toFixed(2) : "---.--"}
          </span>
          <span className={`text-sm font-semibold ${isPositive ? "text-[#22C55E]" : "text-[#EF4444]"}`}>
            {isPositive ? "+" : ""}{change} ({isPositive ? "+" : ""}{changePct}%)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={isDark ? 0.25 : 0.12} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#chartGrad)"
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
