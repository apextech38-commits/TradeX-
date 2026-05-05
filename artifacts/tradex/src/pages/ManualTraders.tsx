import { useState, useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/*
 * DTrader is the official Deriv trading platform.
 * We embed it via iframe — no redirect, user stays on xricky20.replit.app.
 *
 * Auth wiring: if the user already logged in through TradeX's OAuth flow,
 * we append their Deriv account tokens to the DTrader URL as query params
 * (?acct1=CR…&token1=…&cur1=USD). DTrader recognises these and auto-logs
 * the user in — no second login required.
 *
 * If not logged in, DTrader shows its own guest/login view which still lets
 * users see prices, charts, and markets (same as visiting dtrader.deriv.com).
 *
 * Confirmed embeddable: no X-Frame-Options on dtrader.deriv.com,
 * access-control-allow-origin: *, HTTP/2 200 — same as dbot.deriv.com.
 */

const BASE = "https://dtrader.deriv.com/";

/** Height taken by TradeX navbar (44px) + tab bar (36px) + bottom bar (52px) */
const SHELL_HEIGHT = "calc(100dvh - 132px)";

/** Deriv's own header bar height — crop it so DTrader fills our shell cleanly */
const HEADER_CROP = 48;

export default function ManualTraders() {
  const { accounts } = useAuth();
  const [loaded, setLoaded] = useState(false);

  /*
   * Build the DTrader URL with auth tokens when the user is logged in.
   * Format: ?acct1=CR12345&token1=xxx&cur1=USD&acct2=…&token2=…
   * This is the standard Deriv multi-account token handoff used by
   * traderkit.pro and other Deriv partners.
   */
  const dtraderUrl = useMemo(() => {
    if (!accounts.length) return BASE;
    const p = new URLSearchParams();
    accounts.forEach((acct, i) => {
      p.set(`acct${i + 1}`,  acct.account);
      p.set(`token${i + 1}`, acct.token);
      p.set(`cur${i + 1}`,   acct.currency);
    });
    return `${BASE}?${p.toString()}`;
  }, [accounts]);

  /*
   * Use accounts as iframe key: changing it forces a fresh DTrader load
   * whenever the user logs in or out through TradeX's own auth flow.
   */
  const iframeKey = accounts.length
    ? accounts.map(a => a.account).join(",")
    : "guest";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: SHELL_HEIGHT,
        background: "#0e1726",
      }}
    >

      {/* ── Loading overlay (matches traderkit.pro's "Please wait" pattern) ── */}
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 20,
          background: "#0e1726",
        }}>

          {/* TradeX icon */}
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: "linear-gradient(135deg,#1E90FF 0%,#0044cc 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 32px rgba(30,144,255,0.4)",
          }}>
            <TrendingUp style={{ width: 30, height: 30, color: "#fff" }} />
          </div>

          {/* Text */}
          <div style={{ textAlign: "center", lineHeight: 1.5 }}>
            <p style={{
              margin: 0, fontSize: 15, fontWeight: 700, color: "#e2e8f0",
              fontFamily: "'IBM Plex Sans','Inter',sans-serif",
            }}>
              Please wait for DTrader to open…
            </p>
            <p style={{
              margin: "4px 0 0", fontSize: 12, color: "#475569",
              fontFamily: "'IBM Plex Sans','Inter',sans-serif",
            }}>
              {accounts.length > 0
                ? `Connecting as ${accounts[0].account}`
                : "Powered by Deriv"}
            </p>
          </div>

          {/* Spinner */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            border: "3px solid rgba(30,144,255,0.15)",
            borderTop: "3px solid #1E90FF",
            animation: "mt-spin 0.75s linear infinite",
          }} />
        </div>
      )}

      {/* ── DTrader iframe ─────────────────────────────────────────────────── */}
      <iframe
        key={iframeKey}
        src={dtraderUrl}
        onLoad={() => setLoaded(true)}
        style={{
          position: "absolute",
          top:    -HEADER_CROP,
          left:   0,
          width:  "100%",
          height: `calc(100% + ${HEADER_CROP}px)`,
          border: "none",
          /* Fade in once loaded so there's no flash of unstyled content */
          opacity:    loaded ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
        allow="clipboard-read; clipboard-write; microphone; camera"
        title="DTrader — Deriv Trading Platform"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      />

      <style>{`
        @keyframes mt-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
