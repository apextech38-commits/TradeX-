import {
  createContext, useContext, useState, useEffect,
  useRef, useCallback, ReactNode
} from "react";

// App ID for public WebSocket tick streaming (no auth required)
export const DERIV_APP_ID = "1089";

// App ID registered with redirect URI → https://dev-utility-hub--apexricky20.replit.app/callback
// This must be the user's own registered Deriv app (numeric ID from https://app.deriv.com/account/api-token)
export const OAUTH_APP_ID = "339";

const WS_URL   = `wss://ws.binaryws.com/websockets/v3?app_id=${DERIV_APP_ID}`;
const OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${OAUTH_APP_ID}&l=EN&brand=deriv`;
const SIGNUP_URL = `https://deriv.com/signup/?lang=EN`;
const TOKEN_KEY = "deriv_token";
const ACCOUNTS_KEY = "tradex-deriv-accounts";

export interface DerivAccount {
  account: string;
  token: string;
  currency: string;
}

interface AuthState {
  isLoggedIn: boolean;
  isAuthorized: boolean;
  activeAccount: DerivAccount | null;
  accounts: DerivAccount[];
  balance: number | null;
  currency: string;
  wsConnected: boolean;
  login: () => void;
  signup: () => void;
  logout: () => void;
  switchAccount: (acct: DerivAccount) => void;
  sendWS: (msg: object) => void;
}

const AuthContext = createContext<AuthState>({
  isLoggedIn: false,
  isAuthorized: false,
  activeAccount: null,
  accounts: [],
  balance: null,
  currency: "USD",
  wsConnected: false,
  login: () => {},
  signup: () => {},
  logout: () => {},
  switchAccount: () => {},
  sendWS: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<DerivAccount[]>(() => {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); }
    catch { return []; }
  });
  const [activeAccount, setActiveAccount] = useState<DerivAccount | null>(
    () => accounts[0] ?? null
  );
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const sendWS = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback((token: string) => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setWsConnected(true);
      // Step 1: Authorize with token
      ws.send(JSON.stringify({ authorize: token }));
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.error) return;

        switch (msg.msg_type) {
          case "authorize": {
            setIsAuthorized(true);
            const info = msg.authorize;
            // Update active account with real data
            setActiveAccount(prev => prev ? {
              ...prev,
              account: info.loginid || prev.account,
              currency: info.currency || prev.currency,
            } : null);
            setCurrency(info.currency || "USD");
            // Step 2: Subscribe to balance
            ws.send(JSON.stringify({ balance: 1, account: "current", subscribe: 1 }));
            // Step 3: Fetch statement
            ws.send(JSON.stringify({ statement: 1, limit: 50 }));
            // Step 4: Fetch active symbols
            ws.send(JSON.stringify({ active_symbols: "brief", product_type: "basic" }));
            // Step 5: Subscribe to ticks for Analysis Tool
            ws.send(JSON.stringify({ ticks: "R_10", subscribe: 1 }));
            // Step 6: Fetch trading durations for Quick Strategy
            ws.send(JSON.stringify({ trading_durations: 1, underlying: "R_100", contract_type: "ALL" }));
            break;
          }
          case "balance": {
            setBalance(msg.balance?.balance ?? null);
            setCurrency(msg.balance?.currency || "USD");
            break;
          }
        }
      } catch (_) {}
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setWsConnected(false);
      setIsAuthorized(false);
      // Auto-reconnect after 4 seconds if still logged in
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        reconnectRef.current = setTimeout(() => connect(storedToken), 4000);
      }
    };
  }, []);

  // Connect on mount if token exists
  useEffect(() => {
    mountedRef.current = true;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && accounts.length > 0) {
      connect(token);
    }
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  const login  = () => { window.location.href = OAUTH_URL;  };
  const signup = () => { window.location.href = SIGNUP_URL; };

  const logout = () => {
    sendWS({ logout: 1 });
    wsRef.current?.close();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNTS_KEY);
    setAccounts([]);
    setActiveAccount(null);
    setIsAuthorized(false);
    setBalance(null);
    setWsConnected(false);
  };

  const switchAccount = (acct: DerivAccount) => {
    setActiveAccount(acct);
    setIsAuthorized(false);
    setBalance(null);
    localStorage.setItem(TOKEN_KEY, acct.token);
    connect(acct.token);
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn: accounts.length > 0,
      isAuthorized,
      activeAccount,
      accounts,
      balance,
      currency,
      wsConnected,
      login,
      signup,
      logout,
      switchAccount,
      sendWS,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
