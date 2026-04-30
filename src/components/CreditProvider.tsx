"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface CreditContextType {
  balance: number | null;
  plan: string;
  refreshBalance: () => Promise<void>;
  setBalance: (b: number) => void;
}

const CreditContext = createContext<CreditContextType>({
  balance: null,
  plan: "free",
  refreshBalance: async () => {},
  setBalance: () => {},
});

export function CreditProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [balance, setBalanceState] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("free");

  const refreshBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        if (data.credits?.balance !== undefined) setBalanceState(data.credits.balance);
        if (data.subscription?.plan) setPlan(data.subscription.plan);
      }
    } catch (e) { console.error("refreshBalance:", e); }
  }, []);

  useEffect(() => {
    if (session) {
      refreshBalance();
    } else {
      setBalanceState(null);
      setPlan("free");
    }
  }, [session, refreshBalance]);

  const setBalance = useCallback((b: number) => {
    setBalanceState(b);
  }, []);

  return (
    <CreditContext.Provider value={{ balance, plan, refreshBalance, setBalance }}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditContext);
}
