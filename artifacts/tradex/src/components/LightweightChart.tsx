import { useEffect, useRef } from "react";
import {
  createChart, ColorType, AreaSeries, LineSeries, LineStyle,
} from "lightweight-charts";
import type {
  IChartApi, ISeriesApi, UTCTimestamp, IPriceLine,
} from "lightweight-charts";
import { DERIV_APP_ID } from "@/context/AuthContext";

const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;

interface Props {
  symbol: string;
  /** When true: line-only chart + dashed price line + trade window overlay */
  tradingMode?: boolean;
}

export default function LightweightChart({ symbol, tradingMode = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<"Area"> | ISeriesApi<"Line"> | null>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const roRef        = useRef<ResizeObserver | null>(null);
  const mountRef     = useRef(true);
  const priceLineRef = useRef<IPriceLine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    mountRef.current = true;

    const el = containerRef.current;

    // ── Chart options ──────────────────────────────────────────────────────
    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: tradingMode ? "#0C1B2E" : "#ffffff" },
        textColor:  tradingMode ? "#7A8EA8" : "#6B7280",
        fontSize: 11,
        fontFamily: "'Inter', system-ui, sans-serif",
      },
      grid: {
        vertLines: {
          color: tradingMode ? "rgba(255,255,255,0.04)" : "rgba(229,231,235,0.6)",
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: tradingMode ? "rgba(255,255,255,0.04)" : "rgba(229,231,235,0.6)",
          style: LineStyle.Dotted,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color:  tradingMode ? "rgba(30,144,255,0.45)" : "rgba(107,114,128,0.5)",
          width:  1,
          style:  LineStyle.Dashed,
          labelBackgroundColor: "#1E90FF",
        },
        horzLine: {
          color:  tradingMode ? "rgba(30,144,255,0.45)" : "rgba(107,114,128,0.5)",
          width:  1,
          style:  LineStyle.Dashed,
          labelBackgroundColor: "#1E90FF",
        },
      },
      rightPriceScale: {
        borderColor: tradingMode ? "rgba(255,255,255,0.08)" : "#E5E7EB",
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor:    tradingMode ? "rgba(255,255,255,0.08)" : "#E5E7EB",
        timeVisible:    true,
        secondsVisible: true,
        rightOffset:    tradingMode ? 6 : 3,
        barSpacing:     tradingMode ? 4 : 3,
        fixLeftEdge:    false,
        lockVisibleTimeRangeOnResize: true,
      },
      // In trading mode lock view so the price line stays stable
      handleScroll: !tradingMode,
      handleScale:  !tradingMode,
      width:  el.clientWidth,
      height: el.clientHeight || 300,
    });
    chartRef.current = chart;

    // ── Series ─────────────────────────────────────────────────────────────
    if (tradingMode) {
      const line = chart.addSeries(LineSeries, {
        color:   "#1E90FF",
        lineWidth: 2,
        // Show a prominent dot at the cursor position
        crosshairMarkerVisible:         true,
        crosshairMarkerRadius:          5,
        crosshairMarkerBackgroundColor: "#1E90FF",
        crosshairMarkerBorderColor:     "#ffffff",
        crosshairMarkerBorderWidth:     2,
        // Floating price tag on the right axis
        lastValueVisible: true,
        // We supply our own dashed price line below — disable the default solid one
        priceLineVisible: false,
      });
      seriesRef.current = line;

      // Dashed horizontal price line at the latest price
      priceLineRef.current = line.createPriceLine({
        price:             0,
        color:             "#1E90FF",
        lineWidth:         1,
        lineStyle:         LineStyle.Dashed,
        axisLabelVisible:  false, // lastValueVisible already covers the label
        title:             "",
      });
    } else {
      const area = chart.addSeries(AreaSeries, {
        lineColor:       "#1E90FF",
        topColor:        "rgba(30,144,255,0.18)",
        bottomColor:     "rgba(30,144,255,0.0)",
        lineWidth:       2,
        crosshairMarkerVisible:         true,
        crosshairMarkerRadius:          4,
        crosshairMarkerBackgroundColor: "#1E90FF",
        crosshairMarkerBorderColor:     "#ffffff",
        crosshairMarkerBorderWidth:     2,
        lastValueVisible: true,
        priceLineVisible: false,
      });
      seriesRef.current = area;
    }

    // ── ResizeObserver ─────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (!el || !chartRef.current) return;
      chartRef.current.applyOptions({
        width:  el.clientWidth,
        height: el.clientHeight,
      });
    });
    ro.observe(el);
    roRef.current = ro;

    // ── WebSocket (identical to original — DO NOT MODIFY) ──────────────────
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountRef.current) return;
      ws.send(JSON.stringify({
        ticks_history: symbol,
        count:         500,
        end:           "latest",
        style:         "ticks",
        subscribe:     1,
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
            // Initialise the dashed price line
            if (tradingMode && priceLineRef.current && prices.length > 0) {
              priceLineRef.current.applyOptions({ price: prices[prices.length - 1] });
            }
          }
        }

        if (msg.msg_type === "tick") {
          const { epoch, quote } = msg.tick as { epoch: number; quote: number };
          seriesRef.current?.update({ time: epoch as UTCTimestamp, value: quote });
          // Slide the dashed price line to the new price
          if (tradingMode && priceLineRef.current) {
            priceLineRef.current.applyOptions({ price: quote });
          }
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
      chartRef.current   = null;
      seriesRef.current  = null;
      priceLineRef.current = null;
    };
  }, [symbol, tradingMode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* lightweight-charts canvas target */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* ── Trading-mode overlays ─────────────────────────────────────── */}
      {tradingMode && (
        <>
          {/* Trade-window rectangle — rightmost ~20% of the chart area     */}
          {/* Sits above the time axis (~24 px) so it doesn't cover ticks   */}
          <div
            style={{
              position:        "absolute",
              top:             0,
              right:           0,
              width:           "20%",
              bottom:          24,           // leave room for the time axis
              backgroundColor: "rgba(30,144,255,0.06)",
              borderLeft:      "1.5px dashed rgba(30,144,255,0.55)",
              pointerEvents:   "none",
            }}
          >
            {/* ENTRY label on the left border */}
            <span
              style={{
                position:       "absolute",
                top:            10,
                left:           6,
                fontSize:       "9px",
                fontWeight:     700,
                letterSpacing:  "0.07em",
                textTransform:  "uppercase",
                color:          "rgba(30,144,255,0.75)",
                userSelect:     "none",
              }}
            >
              Entry
            </span>

            {/* Subtle animated pulse on the entry line */}
            <span
              style={{
                position:        "absolute",
                top:             "50%",
                left:            -5,
                transform:       "translateY(-50%)",
                width:           8,
                height:          8,
                borderRadius:    "50%",
                backgroundColor: "#1E90FF",
                boxShadow:       "0 0 0 3px rgba(30,144,255,0.25)",
                animation:       "tradex-pulse 2s ease-in-out infinite",
              }}
            />

            {/* Duration label at bottom */}
            <span
              style={{
                position:      "absolute",
                bottom:        8,
                right:         6,
                fontSize:      "9px",
                fontWeight:    700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color:         "rgba(30,144,255,0.5)",
                userSelect:    "none",
              }}
            >
              Exit
            </span>
          </div>
        </>
      )}

      {/* Keyframe for the pulse dot — injected once via a style tag */}
      {tradingMode && (
        <style>{`
          @keyframes tradex-pulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(30,144,255,0.25); }
            50%       { box-shadow: 0 0 0 7px rgba(30,144,255,0.08); }
          }
        `}</style>
      )}
    </div>
  );
}
