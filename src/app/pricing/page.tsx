"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useCredits } from "@/components/CreditProvider";
import { Check, X, Coins, Sparkles, Crown, Building2, Zap, Loader2, ArrowRight } from "lucide-react";
import { useLocale, TranslationKey } from "@/lib/i18n";

const PLANS: { id: string; nameKey: TranslationKey; icon: JSX.Element; price: number; periodKey: TranslationKey; color: string; popular?: boolean; features: { textKey: TranslationKey; included: boolean }[] }[] = [
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

const CREDIT_PACKS = [
  { id: "pack-50", credits: 50, price: 149, labelKey: "pricing.pack50" },
  { id: "pack-200", credits: 200, price: 499, labelKey: "pricing.pack200", popular: true },
  { id: "pack-500", credits: 500, price: 999, labelKey: "pricing.pack500" },
];

export default function PricingPage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { balance, setBalance, plan, refreshBalance } = useCredits();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      // Downgrade
      setLoadingPlan(planId);
      try {
        const res = await fetch("/api/subscription", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "free" }),
        });
        if (res.ok) {
          refreshBalance();
          setSuccessMsg(t("pricing.planChangedFree"));
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
        const text = await res.text().catch(() => "");
        console.error("Checkout failed:", res.status, text);
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Dev mode: checkout already updated the plan directly
        refreshBalance();
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
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Fallback: direct credit add (for dev without Stripe)
        if (data.balance !== undefined) setBalance(data.balance);
        else refreshBalance();
        const pack = CREDIT_PACKS.find(p => p.id === packId);
        setSuccessMsg(t("pricing.creditsAdded", { count: pack?.credits || "" }));
      }
    } finally {
      setLoadingPack(null);
    }
  };

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
            <div className="mt-4 inline-flex items-center gap-2 bg-accent-light/30 border border-accent/20 rounded-full px-4 py-1.5">
              <Coins size={14} className="text-accent" />
              <span className="text-[18px] text-accent font-medium">{t("pricing.yourBalance")}: {balance} {t("pricing.creditsShort")}</span>
              <span className="text-[16px] text-ink-3">({plan === "free" ? t("pricing.free") : plan === "pro" ? "Pro" : t("pricing.corporate")})</span>
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

            // Upgrade pricing: if user has pro, corporate shows (corporate - pro + 1₽)
            const proPrice = PLANS.find(x => x.id === "pro")?.price ?? 0;
            const displayPrice = (plan === "pro" && p.id === "corporate")
              ? p.price - proPrice + 1
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
                      <div className="text-[13px] text-ink-3 mt-0.5 line-through">{p.price} ₽</div>
                    </>
                  ) : (
                    <>
                      <span className="text-[32px] font-light text-ink">{displayPrice === 0 ? "0 ₽" : `${displayPrice} ₽`}</span>
                      <span className="text-[18px] text-ink-3 ml-1">{t(p.periodKey)}</span>
                    </>
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
            {CREDIT_PACKS.map(pack => (
              <div
                key={pack.id}
                className={`bg-surface rounded-xl border p-5 flex flex-col items-center ${
                  pack.popular ? "border-accent/30" : "border-ink-3/10"
                }`}
              >
                {pack.popular && (
                  <span className="text-[14px] tracking-[0.2em] uppercase text-accent mb-2">{t("pricing.bestValue")}</span>
                )}
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap size={16} className="text-accent" />
                  <span className="text-[22px] font-light text-ink">{pack.credits}</span>
                  <span className="text-[17px] text-ink-3">{t("pricing.creditsShort")}</span>
                </div>
                <span className="text-[20px] font-light text-ink mb-4">{pack.price} ₽</span>
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
            ))}
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
