import { useEffect, useRef } from "react";
import { createChart, ColorType, AreaSeries } from "lightweight-charts";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

interface Props {
  symbol: string;
}

export default function LightweightChart({ symbol }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Area"> | null>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const roRef        = useRef<ResizeObserver | null>(null);
  const mountRef     = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;
    mountRef.current = true;

    const el = containerRef.current;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#6B7280",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#F3F4F6" },
        horzLines: { color: "#F3F4F6" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#E5E7EB" },
      timeScale: {
        borderColor: "#E5E7EB",
        timeVisible: true,
        secondsVisible: true,
      },
      handleScroll: true,
      handleScale: true,
      width: el.clientWidth,
      height: el.clientHeight || 300,
    });
    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#1E90FF",
      topColor: "rgba(30,144,255,0.25)",
      bottomColor: "rgba(30,144,255,0.0)",
      lineWidth: 2,
      crosshairMarkerVisible: true,
    });
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (!el || !chartRef.current) return;
      chartRef.current.applyOptions({
        width:  el.clientWidth,
        height: el.clientHeight,
      });
    });
    ro.observe(el);
    roRef.current = ro;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountRef.current) return;
      ws.send(JSON.stringify({
        ticks_history: symbol,
        count: 500,
        end: "latest",
        style: "ticks",
        subscribe: 1,
      }));
    };

    ws.onmessage = (evt) => {
      if (!mountRef.current) return;
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg.error) return;

        if (msg.msg_type === "history") {
          const { times, prices } = msg.history as { times: number[]; prices: number[] };
          const pts = times.map((t, i) => ({
            time:  t as UTCTimestamp,
            value: prices[i],
          }));
          if (seriesRef.current && pts.length > 0) {
            seriesRef.current.setData(pts);
            chartRef.current?.timeScale().fitContent();
          }
        }

        if (msg.msg_type === "tick") {
          const { epoch, quote } = msg.tick as { epoch: number; quote: number };
          seriesRef.current?.update({ time: epoch as UTCTimestamp, value: quote });
        }
      } catch (_) {}
    };

    ws.onerror  = () => {};
    ws.onclose  = () => {};

    return () => {
      mountRef.current = false;
      ro.disconnect();
      ws.onclose = null;
      ws.close();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  }, [symbol]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
