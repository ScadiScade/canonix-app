"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useCredits } from "@/components/CreditProvider";
import { Check, X, Coins, Sparkles, Crown, Building2, Zap, Loader2, ArrowRight } from "lucide-react";
import { useLocale, TranslationKey } from "@/lib/i18n";

const PLANS: { id: string; nameKey: TranslationKey; icon: JSX.Element; price: number; periodKey: TranslationKey; color: string; popular?: boolean; seatPrice?: number; seatKey?: TranslationKey; features: { textKey: TranslationKey; included: boolean }[] }[] = [
  {
    id: "free",
    nameKey: "pricing.planFree",
    icon: <Sparkles size={20} />,
    price: 0,
    periodKey: "pricing.periodForever",
    color: "#78716C",
    features: [
      { textKey: "pricing.f1", included: true },
      { textKey: "pricing.f2", included: true },
      { textKey: "pricing.f3", included: true },
      { textKey: "pricing.f4", included: true },
      { textKey: "pricing.f5", included: true },
      { textKey: "pricing.f6", included: false },
      { textKey: "pricing.f7", included: false },
      { textKey: "pricing.f8", included: false },
    ],
  },
  {
    id: "pro",
    nameKey: "pricing.planPro",
    icon: <Crown size={20} />,
    price: 299,
    periodKey: "pricing.periodMonth",
    color: "#2D5BE3",
    popular: true,
    features: [
      { textKey: "pricing.f9", included: true },
      { textKey: "pricing.f10", included: true },
      { textKey: "pricing.f11", included: true },
      { textKey: "pricing.f6", included: true },
      { textKey: "pricing.f7", included: true },
      { textKey: "pricing.f12", included: true },
      { textKey: "pricing.f13", included: true },
      { textKey: "pricing.f8", included: false },
    ],
  },
  {
    id: "corporate",
    nameKey: "pricing.planCorporate",
    icon: <Building2 size={20} />,
    price: 999,
    periodKey: "pricing.periodMonth",
    color: "#9333EA",
    seatPrice: 499,
    seatKey: "pricing.perSeat",
    features: [
      { textKey: "pricing.f14", included: true },
      { textKey: "pricing.f15", included: true },
      { textKey: "pricing.f16", included: true },
      { textKey: "pricing.f17", included: true },
      { textKey: "pricing.f18", included: true },
      { textKey: "pricing.f19", included: true },
      { textKey: "pricing.f20", included: true },
      { textKey: "pricing.f21", included: true },
    ],
  },
];

// Default packs (overridden by DB via /api/pricing if available)
const DEFAULT_PACKS = [
  { id: "small", credits: 50, price: 149, labelKey: "pricing.pack50" },
  { id: "medium", credits: 200, price: 490, labelKey: "pricing.pack200", popular: true },
  { id: "large", credits: 500, price: 990, labelKey: "pricing.pack500" },
];

// Upgrade pricing constants
const UPGRADE_MARKUP = 49;
const PRO_PRICE = 299;

export default function PricingPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { balance, plan, currentPeriodEnd, pendingPlan, walletBalance, refreshBalance } = useCredits();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState<number>(500);
  const [loadingTopup, setLoadingTopup] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [topupPrompt, setTopupPrompt] = useState<{ deficitRub: number; label: string; retryAction?: () => void } | null>(null);
  const [creditPacks, setCreditPacks] = useState(DEFAULT_PACKS);

  // Load pricing from DB
  useEffect(() => {
    (async () => {
      try {
        // Seed defaults if empty
        await fetch("/api/pricing", { method: "POST" });
        const res = await fetch("/api/pricing");
        if (res.ok) {
          const data = await res.json();
          if (data.creditPacks?.length > 0) {
            const labelMap: Record<string, string> = { small: "pricing.pack50", medium: "pricing.pack200", large: "pricing.pack500" };
            const popularMap: Record<string, boolean> = { medium: true };
            setCreditPacks(data.creditPacks.map((p: { key: string; credits: number; price: number }) => ({
              id: p.key,
              credits: p.credits,
              price: Math.round(p.price / 100),
              labelKey: labelMap[p.key] || `pricing.pack${p.credits}`,
              popular: popularMap[p.key] || false,
            })));
          }
        }
      } catch { /* use defaults */ }
    })();
  }, []);

  // Auto-dismiss success
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      window.location.href = "/login";
      return;
    }
    if (planId === "free") {
      // Downgrade — scheduled for next period
      setLoadingPlan(planId);
      try {
        const res = await fetch("/api/subscription", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "free" }),
        });
        if (res.ok) {
          const data = await res.json();
          refreshBalance();
          if (data.pendingPlan) {
            setSuccessMsg(t("pricing.scheduledChange") + t("pricing.free") + " " + t("pricing.nextPeriod"));
          } else {
            setSuccessMsg(t("pricing.planChangedFree"));
          }
        }
      } finally {
        setLoadingPlan(null);
      }
      return;
    }
    // For paid plans, redirect to Stripe checkout (placeholder)
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Insufficient wallet balance") {
          const deficit = Math.ceil((data.deficit || 0) / 100);
          setTopupPrompt({ deficitRub: deficit, label: planId === "pro" ? "Pro" : t("pricing.corporate"), retryAction: () => handleSubscribe(planId) });
          setTopupAmount(deficit);
        } else {
          console.error("Checkout failed:", res.status, data);
        }
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        await refreshBalance();
        setSuccessMsg(t("pricing.planChanged", { plan: planId === "pro" ? "Pro" : t("pricing.corporate") }));
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBuyCredits = async (packId: string) => {
    if (!session) {
      window.location.href = "/login";
      return;
    }
    setLoadingPack(packId);
    try {
      const res = await fetch("/api/subscription/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data.error === "Insufficient wallet balance") {
          const deficit = Math.ceil((data.deficit || 0) / 100);
          const pack = creditPacks.find(p => p.id === packId);
          setTopupPrompt({ deficitRub: deficit, label: `${pack?.credits || ""} ${t("common.credits")}`, retryAction: () => handleBuyCredits(packId) });
          setTopupAmount(deficit);
        } else {
          console.error("Buy credits failed:", res.status, data);
          setSuccessMsg(data.error || t("common.error"));
        }
        return;
      }
      await refreshBalance();
      const pack = creditPacks.find(p => p.id === packId);
      setSuccessMsg(t("pricing.creditsAdded", { count: pack?.credits || "" }));
    } finally {
      setLoadingPack(null);
    }
  };

  const handleTopup = async (andRetry?: () => void) => {
    if (!session) { window.location.href = "/login"; return; }
    setLoadingTopup(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: topupAmount }),
      });
      if (res.ok) {
        await refreshBalance();
        setTopupPrompt(null);
        setSuccessMsg(t("pricing.topupSuccess", { amount: topupAmount }));
        if (andRetry) {
          // Small delay to let state settle after refreshBalance
          setTimeout(andRetry, 300);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Topup failed:", data.error);
      }
    } finally {
      setLoadingTopup(false);
    }
  };

  const walletRub = walletBalance !== null ? walletBalance / 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Topbar />

      <main id="main-content" className="max-w-5xl mx-auto px-4 md:px-7 py-12">
        {/* Success message */}
        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-[19px] text-green-700">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-green-400 hover:text-green-600"><X size={14} /></button>
          </div>
        )}
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-[32px] md:text-[38px] font-light text-ink mb-3">
            {t("pricing.title")}
          </h1>
          <p className="text-ink-2 text-[20px] max-w-lg mx-auto">
            {t("pricing.desc")}
          </p>
          {session && balance !== null && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-accent-light/30 border border-accent/20 rounded-full px-4 py-1.5">
                <Coins size={14} className="text-accent" />
                <span className="text-[18px] text-accent font-medium">{t("pricing.yourBalance")}: {balance} {t("pricing.creditsShort")}</span>
                <span className="text-[16px] text-ink-3">({plan === "free" ? t("pricing.free") : plan === "pro" ? "Pro" : t("pricing.corporate")})</span>
              </div>
              {currentPeriodEnd && plan !== "free" && (
                <div className="text-[14px] text-ink-3">
                  {t("pricing.renewsOn")} {new Date(currentPeriodEnd).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  {pendingPlan && (
                    <span className="ml-2 text-amber-600">→ {pendingPlan === "free" ? t("pricing.free") : pendingPlan === "pro" ? "Pro" : t("pricing.corporate")} {t("pricing.nextPeriod")}</span>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Wallet */}
          {session && walletBalance !== null && (
            <div className="mt-6 max-w-md mx-auto bg-surface border border-ink-3/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[16px] text-ink-2">{t("pricing.walletBalance")}</span>
                <span className="text-[22px] font-light text-ink">{walletRub} ₽</span>
              </div>

              {/* Top-up prompt */}
              {topupPrompt && (
                <div className="mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg px-3 py-2.5">
                  <p className="text-[15px] text-amber-700 dark:text-amber-300 mb-2">
                    {t("pricing.topupPrompt", { deficit: topupPrompt.deficitRub, label: topupPrompt.label })}
                  </p>
                  <button
                    onClick={() => handleTopup(topupPrompt.retryAction)}
                    disabled={loadingTopup}
                    className="w-full bg-accent text-white rounded-lg px-4 py-2 text-[15px] tracking-[0.08em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingTopup ? <Loader2 size={14} className="animate-spin" /> : t("pricing.topupAndBuy")}
                    <span>{topupPrompt.deficitRub} ₽</span>
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {[300, 500, 1000, 3000].map(v => (
                  <button
                    key={v}
                    onClick={() => { setTopupAmount(v); setTopupPrompt(null); }}
                    className={`px-3 py-1.5 rounded-lg text-[14px] transition-colors ${
                      topupAmount === v && !topupPrompt ? "bg-accent text-white" : "bg-ink-3/5 text-ink hover:bg-ink-3/10"
                    }`}
                  >
                    {v} ₽
                  </button>
                ))}
                <input
                  type="number"
                  min={100}
                  max={50000}
                  step={100}
                  value={topupAmount > 3000 ? topupAmount : ""}
                  onChange={e => {
                    const v = parseInt(e.target.value);
                    if (v >= 100 && v <= 50000) setTopupAmount(v);
                  }}
                  onFocus={() => { if (topupAmount <= 3000) setTopupAmount(0); setTopupPrompt(null); }}
                  placeholder="₽"
                  className="w-20 px-2 py-1.5 rounded-lg text-[14px] bg-ink-3/5 border border-ink-3/10 text-ink focus:outline-none focus:border-accent transition-colors"
                />
                <button
                  onClick={() => handleTopup(topupPrompt?.retryAction)}
                  disabled={loadingTopup || topupAmount < 100}
                  className="ml-auto px-4 py-1.5 bg-accent text-white rounded-lg text-[14px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loadingTopup ? <Loader2 size={12} className="animate-spin" /> : t("pricing.topup")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mb-16">
          {PLANS.map(p => {
            // Tier ordering: free < pro < corporate
            const tierOrder: Record<string, number> = { free: 0, pro: 1, corporate: 2 };
            const currentTier = tierOrder[plan] ?? 0;
            const planTier = tierOrder[p.id] ?? 0;
            const isBelow = planTier < currentTier;
            const isCurrent = plan === p.id;

            // Upgrade pricing: if user has pro, corporate shows (corporate - pro + markup₽)
            const displayPrice = (plan === "pro" && p.id === "corporate")
              ? p.price - PRO_PRICE + UPGRADE_MARKUP
              : p.price;
            const isUpgrade = plan === "pro" && p.id === "corporate";

            return (
              <div
                key={p.id}
                className={`relative bg-surface rounded-xl border p-6 flex flex-col transition-all ${
                  isBelow ? "opacity-40 border-ink-3/5" : p.popular ? "border-accent/40 shadow-lg shadow-accent/5 hover:shadow-md" : "border-ink-3/10 hover:shadow-md"
                } ${isCurrent ? "ring-2 ring-accent/30" : ""}`}
              >
                {p.popular && !isBelow && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[15px] tracking-[0.15em] uppercase px-3 py-1 rounded-full">
                    {t("pricing.popular")}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-accent-light text-accent text-[15px] tracking-[0.15em] uppercase px-3 py-1 rounded-full">
                    {t("pricing.current")}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.color}15`, color: p.color }}>
                    {p.icon}
                  </div>
                  <div>
                    <h3 className="font-serif text-[20px] font-light text-ink">{t(p.nameKey)}</h3>
                  </div>
                </div>

                <div className="mb-5">
                  {isUpgrade && p.price > 0 ? (
                    <>
                      <span className="text-[32px] font-light text-ink">{displayPrice} ₽</span>
                      <span className="text-[18px] text-ink-3 ml-1">{t(p.periodKey)}</span>
                      <div className="text-[13px] text-ink-3 mt-0.5 line-through">{p.price} ₽ {t(p.periodKey)}</div>
                    </>
                  ) : (
                    <>
                      <span className="text-[32px] font-light text-ink">{displayPrice === 0 ? "0 ₽" : `${displayPrice} ₽`}</span>
                      <span className="text-[18px] text-ink-3 ml-1">{t(p.periodKey)}</span>
                    </>
                  )}
                  {p.seatPrice && !isBelow && (
                    <div className="text-[13px] text-ink-3 mt-1">{t(p.seatKey!)} {p.seatPrice} ₽{t(p.periodKey)}</div>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {f.included ? (
                        <Check size={14} className="text-accent flex-shrink-0 mt-0.5" />
                      ) : (
                        <X size={14} className="text-ink-3/40 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-[18px] ${f.included ? "text-ink" : "text-ink-3"}`}>{t(f.textKey)}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(p.id)}
                  disabled={loadingPlan === p.id || isCurrent || isBelow}
                  className={`w-full py-2.5 rounded-lg text-[18px] tracking-[0.1em] uppercase flex items-center justify-center gap-2 transition-colors ${
                    isBelow
                      ? "bg-ink-3/5 text-ink-3/50 cursor-not-allowed"
                      : isCurrent
                      ? "bg-ink-3/5 text-ink-3 cursor-default"
                      : p.popular
                      ? "bg-accent text-white hover:bg-accent/90"
                      : "bg-background border border-ink-3/20 text-ink hover:border-accent/40"
                  } disabled:opacity-50`}
                >
                  {loadingPlan === p.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isBelow ? (
                    t("pricing.lowerPlan")
                  ) : isCurrent ? (
                    t("pricing.currentPlan")
                  ) : (
                    <>
                      {isUpgrade ? t("pricing.upgrade") : p.price === 0 ? t("pricing.startFree") : t("pricing.subscribe")}
                      <ArrowRight size={12} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Credit packs */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="font-serif text-[26px] font-light text-ink mb-2">{t("pricing.buyCredits")}</h2>
            <p className="text-ink-2 text-[19px]">{t("pricing.creditsDesc")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {creditPacks.map(pack => {
              const basePerCredit = creditPacks[0].price / creditPacks[0].credits;
              const thisPerCredit = pack.price / pack.credits;
              const savings = Math.round((1 - thisPerCredit / basePerCredit) * 100);
              return (
              <div
                key={pack.id}
                className={`bg-surface rounded-xl border p-5 flex flex-col items-center ${
                  pack.popular ? "border-accent/30" : "border-ink-3/10"
                }`}
              >
                {savings > 0 && (
                  <span className="text-[13px] tracking-[0.15em] uppercase text-green-600 mb-1.5">−{savings}%</span>
                )}
                {pack.popular && (
                  <span className="text-[14px] tracking-[0.2em] uppercase text-accent mb-2">{t("pricing.bestValue")}</span>
                )}
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={16} className="text-accent" />
                  <span className="text-[22px] font-light text-ink">{pack.credits}</span>
                  <span className="text-[17px] text-ink-3">{t("pricing.creditsShort")}</span>
                </div>
                <span className="text-[20px] font-light text-ink mb-1">{pack.price} ₽</span>
                <span className="text-[13px] text-ink-3 mb-3">{(pack.price / pack.credits).toFixed(1)} ₽/{t("pricing.creditsShort")}</span>
                <button
                  onClick={() => handleBuyCredits(pack.id)}
                  disabled={loadingPack === pack.id}
                  className="w-full py-2 bg-accent/10 text-accent rounded-lg text-[17px] tracking-[0.1em] uppercase hover:bg-accent/20 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loadingPack === pack.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <>
                      <Coins size={12} />
                      {t("pricing.buy")}
                    </>
                  )}
                </button>
              </div>
            );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-[26px] font-light text-ink mb-6 text-center">{t("pricing.faq")}</h2>
          <div className="space-y-4">
            {([
              { qKey: "pricing.faq1q" as TranslationKey, aKey: "pricing.faq1a" as TranslationKey },
              { qKey: "pricing.faq2q" as TranslationKey, aKey: "pricing.faq2a" as TranslationKey },
              { qKey: "pricing.faq3q" as TranslationKey, aKey: "pricing.faq3a" as TranslationKey },
              { qKey: "pricing.faq4q" as TranslationKey, aKey: "pricing.faq4a" as TranslationKey },
            ]).map((item, i) => (
              <div key={i} className="bg-surface rounded-lg border border-ink-3/10 p-4">
                <h3 className="text-[19px] text-ink font-medium mb-1">{t(item.qKey)}</h3>
                <p className="text-[18px] text-ink-2 leading-relaxed">{t(item.aKey)}</p>
              </div>
            ))}
          </div>
        </div>

        {!session && (
          <div className="text-center mt-12">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-accent text-white rounded-xl px-6 py-3 text-[18px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors no-underline"
            >
              {t("pricing.startFree")}
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
