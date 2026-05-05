"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useCredits } from "@/components/CreditProvider";
import {
  Wallet, Loader2, Check, X, ArrowLeft, CreditCard, Clock, Shield,
  Plus, ArrowDownLeft, ArrowUpRight, RefreshCw, ShoppingBag, Receipt, Banknote, Coins,
} from "lucide-react";
import { useLocale, type TranslationKey } from "@/lib/i18n";

interface TxItem {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  refId: string | null;
  createdAt: string;
}

const TX_TYPE_META: Record<string, { icon: typeof Plus; color: string; labelKey: string }> = {
  topup:       { icon: ArrowDownLeft,  color: "text-green-500",  labelKey: "wallet.typeTopup" },
  subscription:{ icon: RefreshCw,      color: "text-blue-500",   labelKey: "wallet.typeSubscription" },
  credits:     { icon: Coins,          color: "text-purple-500", labelKey: "wallet.typeCredits" },
  purchase:    { icon: ShoppingBag,     color: "text-amber-500",  labelKey: "wallet.typePurchase" },
  refund:      { icon: ArrowUpRight,   color: "text-emerald-500",labelKey: "wallet.typeRefund" },
  payout:      { icon: Banknote,        color: "text-sky-500",    labelKey: "wallet.typePayout" },
  commission:  { icon: Receipt,         color: "text-ink-3",      labelKey: "wallet.typeCommission" },
};

const QUICK_AMOUNTS = [300, 500, 1000, 3000, 5000];

export default function WalletPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { walletBalance, refreshBalance } = useCredits();
  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [customInput, setCustomInput] = useState("");
  const [loadingTopup, setLoadingTopup] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transaction state
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    if (successMsg) { const timer = setTimeout(() => setSuccessMsg(null), 4000); return () => clearTimeout(timer); }
  }, [successMsg]);

  const walletRub = walletBalance !== null ? walletBalance / 100 : 0;

  // Fetch transactions
  const fetchTransactions = useCallback(async (cursor?: string, type?: string | null, append = false) => {
    if (!session) return;
    setLoadingTx(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (cursor) params.set("cursor", cursor);
      if (type) params.set("type", type);
      const res = await fetch(`/api/wallet/transactions?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setTransactions(append ? prev => [...prev, ...data.transactions] : data.transactions);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch { /* ignore */ }
    finally { setLoadingTx(false); }
  }, [session]);

  // Initial fetch + refetch on filter change or topup
  useEffect(() => {
    setTransactions([]);
    setNextCursor(null);
    fetchTransactions(undefined, typeFilter, false);
  }, [session, typeFilter, successMsg, fetchTransactions]);

  const handleTopup = async () => {
    if (!session) { window.location.href = "/login"; return; }
    const amount = customInput ? parseInt(customInput) : topupAmount;
    if (amount < 100 || amount > 50000) return;
    setLoadingTopup(true);
    try {
      const res = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
      if (res.ok) {
        await refreshBalance();
        setSuccessMsg(t("wallet.topupSuccess", { amount }));
        setCustomInput("");
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Topup failed:", data.error);
      }
    } finally { setLoadingTopup(false); }
  };

  const activeAmount = customInput ? parseInt(customInput) : topupAmount;
  const canTopup = activeAmount >= 100 && activeAmount <= 50000;

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar />
        <div className="flex items-center justify-center py-40">
          <Link href="/login" className="bg-accent text-white rounded-xl px-6 py-3 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors no-underline">
            {t("pricing.startFree")}
          </Link>
        </div>
      </div>
    );
  }

  // Unique types present in transactions
  const presentTypes = Array.from(new Set(transactions.map(tx => tx.type)));

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-3" style={{ animation: "fadeIn 0.2s ease-out" }}>
          <Check size={16} /><span className="text-[17px]">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-white/60 hover:text-white"><X size={14} /></button>
        </div>
      )}

      <section className="pt-24 pb-6 md:pt-32 md:pb-8">
        <div className="max-w-lg mx-auto px-4 md:px-7">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-ink-3 hover:text-accent transition-colors text-[15px] mb-6 no-underline">
            <ArrowLeft size={14} />{t("pricing.title")}
          </Link>
          <h1 className="font-serif text-[36px] md:text-[44px] font-light text-ink mb-2">{t("wallet.title")}</h1>
          <p className="text-ink-2 text-[19px] mb-8">{t("wallet.desc")}</p>
        </div>
      </section>

      {/* Balance + Topup */}
      <section className="pb-6">
        <div className="max-w-lg mx-auto px-4 md:px-7">
          <div className="bg-gradient-to-br from-accent/8 via-surface to-accent/4 border border-accent/15 rounded-2xl p-6 md:p-8">
            {/* Balance display */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center"><Wallet size={20} className="text-accent" /></div>
                <span className="text-[17px] text-ink-2">{t("wallet.balance")}</span>
              </div>
              <span className="text-[36px] font-light text-ink tracking-tight">{walletRub.toLocaleString("ru-RU")} ₽</span>
            </div>

            {/* Quick amount pills */}
            <div className="flex items-center gap-2 mb-3">
              {QUICK_AMOUNTS.map(v => (
                <button
                  key={v}
                  onClick={() => { setTopupAmount(v); setCustomInput(""); }}
                  className={`flex-1 py-2 rounded-lg text-[14px] font-medium transition-all ${
                    !customInput && topupAmount === v
                      ? "bg-accent text-white shadow-sm"
                      : "bg-ink-3/5 text-ink-2 hover:bg-ink-3/10 hover:text-ink"
                  }`}
                >
                  {v >= 1000 ? `${v / 1000}k` : v} ₽
                </button>
              ))}
            </div>

            {/* Input + button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={100}
                  max={50000}
                  step={100}
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onFocus={() => setCustomInput(prev => prev || "")}
                  placeholder={t("wallet.customAmount")}
                  className="w-full px-3 py-2.5 rounded-lg text-[15px] bg-ink-3/5 border border-ink-3/10 text-ink placeholder:text-ink-3/50 focus:outline-none focus:border-accent/40 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-3/50">₽</span>
              </div>
              <button
                onClick={handleTopup}
                disabled={loadingTopup || !canTopup}
                className="px-6 py-2.5 bg-accent text-white rounded-lg text-[15px] tracking-[0.08em] uppercase hover:bg-accent/90 transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm font-medium"
              >
                {loadingTopup ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} />{t("wallet.topup")}</>}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Transaction history */}
      <section className="pb-8">
        <div className="max-w-lg mx-auto px-4 md:px-7">
          <h2 className="text-[20px] text-ink font-medium mb-3">{t("wallet.history")}</h2>

          {/* Type filter tabs */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              onClick={() => setTypeFilter(null)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                !typeFilter ? "bg-accent text-white" : "bg-ink-3/5 text-ink-2 hover:text-ink"
              }`}
            >
              {t("wallet.allTypes")}
            </button>
            {presentTypes.map(type => {
              const meta = TX_TYPE_META[type];
              if (!meta) return null;
              return (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type === typeFilter ? null : type)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                    typeFilter === type ? "bg-accent text-white" : "bg-ink-3/5 text-ink-2 hover:text-ink"
                  }`}
                >
                  {t(meta.labelKey as TranslationKey)}
                </button>
              );
            })}
          </div>

          {/* Transaction list */}
          {transactions.length === 0 && !loadingTx ? (
            <div className="text-center py-12 text-ink-3 text-[15px]">{t("wallet.noTransactions")}</div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map(tx => {
                const meta = TX_TYPE_META[tx.type] || { icon: CreditCard, color: "text-ink-3", labelKey: "wallet.typePurchase" };
                const Icon = meta.icon;
                const isPositive = tx.amount >= 0;
                return (
                  <div key={tx.id} className="bg-surface rounded-xl border border-ink-3/8 px-4 py-3 flex items-center gap-3">
                    {/* Type icon */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPositive ? "bg-green-500/8" : "bg-ink-3/5"}`}>
                      <Icon size={16} className={isPositive ? "text-green-500" : meta.color} />
                    </div>
                    {/* Description + date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] text-ink truncate">{tx.description || t(meta.labelKey as TranslationKey)}</p>
                      <p className="text-[12px] text-ink-3">
                        {new Date(tx.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {/* Amount + balance after */}
                    <div className="text-right shrink-0">
                      <span className={`text-[15px] font-medium ${isPositive ? "text-green-500" : "text-ink"}`}>
                        {isPositive ? "+" : ""}{(tx.amount / 100).toLocaleString("ru-RU")} ₽
                      </span>
                      <p className="text-[12px] text-ink-3">{(tx.balanceAfter / 100).toLocaleString("ru-RU")} ₽ {t("wallet.balanceAfter")}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <button
              onClick={() => fetchTransactions(nextCursor || undefined, typeFilter, true)}
              disabled={loadingTx}
              className="w-full mt-3 py-2.5 rounded-lg text-[14px] text-ink-2 hover:text-ink hover:bg-ink-3/5 transition-colors disabled:opacity-50"
            >
              {loadingTx ? <Loader2 size={14} className="animate-spin mx-auto" /> : t("wallet.loadMore")}
            </button>
          )}
        </div>
      </section>

      {/* Trust */}
      <section className="pb-20">
        <div className="max-w-lg mx-auto px-4 md:px-7">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-accent/8 flex items-center justify-center mx-auto mb-2"><Shield size={18} className="text-accent" /></div>
              <h3 className="text-[15px] text-ink font-medium mb-0.5">{t("wallet.trust1t")}</h3>
              <p className="text-[13px] text-ink-2">{t("wallet.trust1d")}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-accent/8 flex items-center justify-center mx-auto mb-2"><Clock size={18} className="text-accent" /></div>
              <h3 className="text-[15px] text-ink font-medium mb-0.5">{t("wallet.trust2t")}</h3>
              <p className="text-[13px] text-ink-2">{t("wallet.trust2d")}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
