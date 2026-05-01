import { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useDerivWS } from "@/hooks/useDerivWS";

export default function Charts() {
  const { latestTick, subscribe, unsubscribe } = useDerivWS();
  const [data, setData] = useState<{ value: number }[]>([]);

  useEffect(() => {
    subscribe("R_100");
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  // Generate initial simulated data
  useEffect(() => {
    const initData = [];
    let val = 5000;
    for (let i = 0; i < 200; i++) {
      val = val + (Math.random() - 0.5) * 10;
      initData.push({ value: val });
    }
    setData(initData);
  }, []);

  // Update with live ticks
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

  return (
    <div className="flex-1 relative h-[calc(100vh-56px-52px)] w-full overflow-hidden bg-[#0B0F14]">
      {/* Instrument Info Overlay */}
      <div className="absolute top-6 left-6 z-10 p-4 bg-[#121821]/80 backdrop-blur-md border border-[#1F2933] rounded-xl shadow-lg">
        <h2 className="text-[#9CA3AF] text-sm font-medium mb-1">Volatility 100 Index (1s)</h2>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-[#E5E7EB] font-mono">
            {data.length > 0 ? data[data.length - 1].value.toFixed(2) : "---.--"}
          </span>
          <span className={`text-sm font-medium ${isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
            {isPositive ? '+' : ''}{data.length >= 2 ? (data[data.length - 1].value - data[data.length - 2].value).toFixed(2) : "0.00"}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-full pt-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
