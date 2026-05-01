import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const DERIV_APP_ID = "339nn77Xa7qUHK0CbknRG";
const OAUTH_URL = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=EN&brand=deriv`;
const REDIRECT_URI = "https://dev-utility-hub--apexricky20.replit.app/callback";

export interface DerivAccount {
  account: string;   // e.g. CR1234567
  token: string;     // OAuth token
  currency: string;  // e.g. USD
}

interface AuthState {
  accounts: DerivAccount[];
  activeAccount: DerivAccount | null;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  setActiveAccount: (acct: DerivAccount) => void;
}

const AuthContext = createContext<AuthState>({
  accounts: [],
  activeAccount: null,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  setActiveAccount: () => {},
});

const STORAGE_KEY = "tradex-deriv-accounts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<DerivAccount[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const [activeAccount, setActiveAccountState] = useState<DerivAccount | null>(
    () => accounts[0] ?? null
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  const login = () => {
    window.location.href = OAUTH_URL;
  };

  const logout = () => {
    setAccounts([]);
    setActiveAccountState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const setActiveAccount = (acct: DerivAccount) => {
    setActiveAccountState(acct);
  };

  return (
    <AuthContext.Provider
      value={{
        accounts,
        activeAccount,
        isLoggedIn: accounts.length > 0,
        login,
        logout,
        setActiveAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Call this from the /callback page to save accounts from URL params */
export function parseDerivCallback(): DerivAccount[] {
  const params = new URLSearchParams(window.location.search);
  const result: DerivAccount[] = [];

  let i = 1;
  while (params.has(`acct${i}`)) {
    const account = params.get(`acct${i}`) || "";
    const token = params.get(`token${i}`) || "";
    const currency = params.get(`cur${i}`) || "USD";
    if (account && token) {
      result.push({ account, token, currency });
    }
    i++;
  }

  return result;
}

export { DERIV_APP_ID, OAUTH_URL, REDIRECT_URI };
