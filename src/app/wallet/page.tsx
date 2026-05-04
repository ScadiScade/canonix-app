"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useCredits } from "@/components/CreditProvider";
import { Wallet, Loader2, Check, X, ArrowLeft, CreditCard, Clock, Shield } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export default function WalletPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { walletBalance, refreshBalance } = useCredits();
  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [loadingTopup, setLoadingTopup] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [topupPrompt, setTopupPrompt] = useState<{ deficitRub: number; label: string; retryAction?: () => void } | null>(null);

  useEffect(() => {
    if (successMsg) { const timer = setTimeout(() => setSuccessMsg(null), 4000); return () => clearTimeout(timer); }
  }, [successMsg]);

  const handleTopup = async (andRetry?: () => void) => {
    if (!session) { window.location.href = "/login"; return; }
    setLoadingTopup(true);
    try {
      const res = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: topupAmount }) });
      if (res.ok) { await refreshBalance(); setTopupPrompt(null); setSuccessMsg(t("pricing.topupSuccess", { amount: topupAmount })); if (andRetry) setTimeout(andRetry, 300); }
      else { const data = await res.json().catch(() => ({})); console.error("Topup failed:", data.error); }
    } finally { setLoadingTopup(false); }
  };

  const walletRub = walletBalance !== null ? walletBalance / 100 : 0;

  // Fetch recent transactions
  const [transactions, setTransactions] = useState<{ id: string; type: string; amount: number; balanceAfter: number; description: string; createdAt: string }[]>([]);
  useEffect(() => {
    if (!session) return;
    fetch("/api/wallet/transactions")
      .then(r => r.ok ? r.json() : [])
      .then(setTransactions)
      .catch(() => {});
  }, [session, successMsg]);

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

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-3" style={{ animation: "fadeIn 0.2s ease-out" }}>
          <Check size={16} /><span className="text-[17px]">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-white/60 hover:text-white"><X size={14} /></button>
        </div>
      )}

      <section className="pt-24 pb-8 md:pt-32 md:pb-12">
        <div className="max-w-lg mx-auto px-4 md:px-7">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-ink-3 hover:text-accent transition-colors text-[15px] mb-6 no-underline">
            <ArrowLeft size={14} />{t("pricing.title")}
          </Link>
          <h1 className="font-serif text-[36px] md:text-[44px] font-light text-ink mb-2">{t("wallet.title")}</h1>
          <p className="text-ink-2 text-[19px] mb-8">{t("wallet.desc")}</p>
        </div>
      </section>

      {/* Balance card */}
      <section className="pb-8">
        <div className="max-w-lg mx-auto px-4 md:px-7">
          <div className="bg-gradient-to-br from-accent/8 via-surface to-accent/4 border border-accent/15 rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center"><Wallet size={20} className="text-accent" /></div>
                <span className="text-[17px] text-ink-2">{t("pricing.walletBalance")}</span>
              </div>
              <span className="text-[36px] font-light text-ink tracking-tight">{walletRub.toLocaleString("ru-RU")} ₽</span>
            </div>

            {topupPrompt && (
              <div className="mb-5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                <p className="text-[15px] text-amber-500 mb-3">{t("pricing.topupPrompt", { deficit: topupPrompt.deficitRub, label: topupPrompt.label })}</p>
                <button onClick={() => handleTopup(topupPrompt.retryAction)} disabled={loadingTopup}
                  className="w-full bg-accent text-white rounded-lg px-4 py-2.5 text-[15px] tracking-[0.08em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loadingTopup ? <Loader2 size={14} className="animate-spin" /> : t("pricing.topupAndBuy")}<span>{topupPrompt.deficitRub} ₽</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              {[300, 500, 1000, 3000, 5000].map(v => (
                <button key={v} onClick={() => { setTopupAmount(v); setTopupPrompt(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-[15px] font-medium transition-all ${topupAmount === v && !topupPrompt ? "bg-accent text-white shadow-sm" : "bg-ink-3/5 text-ink-2 hover:bg-ink-3/10 hover:text-ink"}`}>
                  {v >= 1000 ? `${v / 1000}k` : v} ₽
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input type="number" min={100} max={50000} step={100} value={topupAmount > 5000 ? topupAmount : ""}
                  onChange={e => { const v = parseInt(e.target.value); if (v >= 100 && v <= 50000) setTopupAmount(v); }}
                  onFocus={() => { if (topupAmount <= 5000) setTopupAmount(0); setTopupPrompt(null); }}
                  placeholder={t("wallet.customAmount")}
                  className="w-full px-3 py-2.5 rounded-lg text-[15px] bg-ink-3/5 border border-ink-3/10 text-ink placeholder:text-ink-3/50 focus:outline-none focus:border-accent/40 transition-colors" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-3/50">₽</span>
              </div>
              <button onClick={() => handleTopup(topupPrompt?.retryAction)} disabled={loadingTopup || topupAmount < 100}
                className="px-6 py-2.5 bg-accent text-white rounded-lg text-[15px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm font-medium">
                {loadingTopup ? <Loader2 size={14} className="animate-spin" /> : <><CreditCard size={14} />{t("pricing.topup")}</>}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Transactions */}
      {transactions.length > 0 && (
        <section className="pb-8">
          <div className="max-w-lg mx-auto px-4 md:px-7">
            <h2 className="text-[20px] text-ink font-medium mb-4">{t("wallet.history")}</h2>
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="bg-surface rounded-xl border border-ink-3/10 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[16px] text-ink">{tx.description}</p>
                    <p className="text-[13px] text-ink-3">{new Date(tx.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <span className={`text-[17px] font-medium ${tx.amount >= 0 ? "text-green-500" : "text-ink"}`}>
                    {tx.amount >= 0 ? "+" : ""}{(tx.amount / 100).toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
