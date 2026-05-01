import { useEffect, useState } from "react";
import { parseDerivCallback } from "@/context/AuthContext";

const STORAGE_KEY = "tradex-deriv-accounts";

export default function Callback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing login...");

  useEffect(() => {
    const accounts = parseDerivCallback();

    if (accounts.length === 0) {
      setStatus("error");
      setMessage("No account data received. Please try logging in again.");
      setTimeout(() => { window.location.href = "/"; }, 3000);
      return;
    }

    // Save to localStorage — AuthContext reads from here on next load
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

    setStatus("success");
    setMessage(`Welcome! ${accounts.length > 1 ? `${accounts.length} accounts` : accounts[0].account} connected.`);

    // Redirect back to main app after brief success message
    setTimeout(() => { window.location.href = "/"; }, 1800);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full shadow-lg text-center space-y-5">

        {/* Animated icon */}
        <div className="flex justify-center">
          {status === "processing" && (
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          )}
          {status === "success" && (
            <div className="w-16 h-16 rounded-full bg-[#22C55E]/10 border-2 border-[#22C55E] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#22C55E]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 rounded-full bg-[#EF4444]/10 border-2 border-[#EF4444] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#EF4444]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl font-bold text-foreground mb-1">
            {status === "processing" && "Connecting Account"}
            {status === "success" && "Login Successful"}
            {status === "error" && "Login Failed"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        {status !== "error" && (
          <p className="text-xs text-muted-foreground">Redirecting you back to TradeX...</p>
        )}

        {status === "error" && (
          <button
            onClick={() => { window.location.href = "/"; }}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            Back to TradeX
          </button>
        )}
      </div>
    </div>
  );
}
