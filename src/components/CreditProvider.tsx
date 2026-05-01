"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface CreditContextType {
  balance: number | null;
  plan: string;
  currentPeriodEnd: string | null;
  pendingPlan: string | null;
  walletBalance: number | null; // in kopecks
  refreshBalance: () => Promise<void>;
  setBalance: (b: number) => void;
}

const CreditContext = createContext<CreditContextType>({
  balance: null,
  plan: "free",
  currentPeriodEnd: null,
  pendingPlan: null,
  walletBalance: null,
  refreshBalance: async () => {},
  setBalance: () => {},
});

export function CreditProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [balance, setBalanceState] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>("free");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const refreshBalance = useCallback(async () => {
    try {
      const [meRes, walletRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/wallet"),
      ]);
      if (meRes.ok) {
        const data = await meRes.json();
        if (data.credits?.balance !== undefined) setBalanceState(data.credits.balance);
        if (data.subscription?.plan) setPlan(data.subscription.plan);
        if (data.subscription?.currentPeriodEnd) setCurrentPeriodEnd(data.subscription.currentPeriodEnd);
        else setCurrentPeriodEnd(null);
        if (data.subscription?.pendingPlan) setPendingPlan(data.subscription.pendingPlan);
        else setPendingPlan(null);
      }
      if (walletRes.ok) {
        const wData = await walletRes.json();
        if (wData.balance !== undefined) setWalletBalance(wData.balance);
      }
    } catch (e) { console.error("refreshBalance:", e); }
  }, []);

  useEffect(() => {
    if (session) {
      refreshBalance();
    } else {
      setBalanceState(null);
      setPlan("free");
      setCurrentPeriodEnd(null);
      setPendingPlan(null);
      setWalletBalance(null);
    }
  }, [session, refreshBalance]);

  const setBalance = useCallback((b: number) => {
    setBalanceState(b);
  }, []);

  return (
    <CreditContext.Provider value={{ balance, plan, currentPeriodEnd, pendingPlan, walletBalance, refreshBalance, setBalance }}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditContext);
}
