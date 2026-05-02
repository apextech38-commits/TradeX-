import { useEffect, useState } from "react";

const TOKEN_KEY = "deriv_token";
const ACCOUNTS_KEY = "tradex-deriv-accounts";

function parseCallback() {
  const params = new URLSearchParams(window.location.search);
  const accounts = [];
  let i = 1;
  while (params.has(`acct${i}`)) {
    const account  = params.get(`acct${i}`)  || "";
    const token    = params.get(`token${i}`) || "";
    const currency = params.get(`cur${i}`)   || "USD";
    if (account && token) accounts.push({ account, token, currency });
    i++;
  }
  return accounts;
}

export default function Callback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Processing your login...");

  useEffect(() => {
    const accounts = parseCallback();

    if (accounts.length === 0) {
      setStatus("error");
      setMessage("No account data was received from Deriv. Please try again.");
      setTimeout(() => { window.location.href = "/"; }, 4000);
      return;
    }

    // Store the primary token as `deriv_token` (used for WS auth)
    localStorage.setItem(TOKEN_KEY, accounts[0].token);
    // Store all accounts (used to show account switcher)
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

    const label = accounts.length > 1
      ? `${accounts.length} accounts connected`
      : `${accounts[0].account} (${accounts[0].currency})`;

    setStatus("success");
    setMessage(`Welcome back! ${label}`);
    setTimeout(() => { window.location.href = "/"; }, 2000);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F14] flex items-center justify-center px-4">
      <div className="bg-[#121821] border border-[#1F2933] rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center space-y-5">

        <div className="flex justify-center">
          {status === "processing" && (
            <div className="w-16 h-16 rounded-full border-4 border-[#3B82F6]/20 border-t-[#3B82F6] animate-spin" />
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
          <h1 className="text-xl font-bold text-white mb-1">
            {status === "processing" ? "Connecting to Deriv" :
             status === "success"    ? "Login Successful"   : "Login Failed"}
          </h1>
          <p className="text-sm text-gray-400">{message}</p>
        </div>

        {status !== "error" && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            Redirecting to TradeX...
          </div>
        )}

        {status === "error" && (
          <button
            onClick={() => { window.location.href = "/"; }}
            className="w-full py-2.5 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            Back to TradeX
          </button>
        )}
      </div>
    </div>
  );
}
