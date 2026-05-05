import { useState } from "react";
import { TrendingUp } from "lucide-react";

const DTRADER_URL = "https://dtrader.deriv.com/";

export default function ManualTraders() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        minHeight: 0,
        height: "calc(100dvh - 132px)",
        background: "#0e1726",
      }}
    >
      {/* Loading overlay — shown until iframe fires onLoad */}
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            background: "#0e1726",
          }}
        >
          {/* TradeX logo mark */}
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg,#1E90FF,#0055cc)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(30,144,255,0.35)",
          }}>
            <TrendingUp style={{ width: 28, height: 28, color: "#fff" }} />
          </div>

          {/* Message */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 15, fontWeight: 700, color: "#e2e8f0",
              fontFamily: "'IBM Plex Sans','Inter',sans-serif",
              marginBottom: 6,
            }}>
              Please wait for DTrader to open…
            </div>
            <div style={{
              fontSize: 12, color: "#64748b",
              fontFamily: "'IBM Plex Sans','Inter',sans-serif",
            }}>
              Powered by Deriv
            </div>
          </div>

          {/* Spinner */}
          <div style={{
            width: 32, height: 32,
            border: "3px solid rgba(30,144,255,0.15)",
            borderTop: "3px solid #1E90FF",
            borderRadius: "50%",
            animation: "mt-spin 0.8s linear infinite",
          }} />
        </div>
      )}

      {/* DTrader iframe — crop Deriv's own header bar */}
      <iframe
        src={DTRADER_URL}
        onLoad={() => setLoaded(true)}
        style={{
          position: "absolute",
          top: -56,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "calc(100% + 56px)",
          border: "none",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.35s ease",
        }}
        allow="clipboard-read; clipboard-write; microphone; camera"
        title="DTrader — Deriv Trading Platform"
      />

      <style>{`
        @keyframes mt-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
