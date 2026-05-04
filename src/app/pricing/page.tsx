"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Topbar from "@/components/Topbar";
import { useCredits } from "@/components/CreditProvider";
import { Check, X, Coins, Sparkles, Crown, Building2, Zap, Loader2, ArrowRight, ChevronDown, Wallet, Shield, Clock, Star } from "lucide-react";
import { useLocale, TranslationKey } from "@/lib/i18n";

const PLANS: { id: string; nameKey: TranslationKey; icon: JSX.Element; price: number; periodKey: TranslationKey; color: string; popular?: boolean; seatPrice?: number; seatKey?: TranslationKey; features: { textKey: TranslationKey; included: boolean }[] }[] = [
  { id: "free", nameKey: "pricing.planFree", icon: <Sparkles size={20} />, price: 0, periodKey: "pricing.periodForever", color: "#78716C", features: [
    { textKey: "pricing.f1", included: true }, { textKey: "pricing.f2", included: true }, { textKey: "pricing.f3", included: true },
    { textKey: "pricing.f4", included: true }, { textKey: "pricing.f5", included: true }, { textKey: "pricing.f6", included: false },
    { textKey: "pricing.f7", included: false }, { textKey: "pricing.f8", included: false },
  ]},
  { id: "pro", nameKey: "pricing.planPro", icon: <Crown size={20} />, price: 299, periodKey: "pricing.periodMonth", color: "#2D5BE3", popular: true, features: [
    { textKey: "pricing.f9", included: true }, { textKey: "pricing.f10", included: true }, { textKey: "pricing.f11", included: true },
    { textKey: "pricing.f6", included: true }, { textKey: "pricing.f7", included: true }, { textKey: "pricing.f12", included: true },
    { textKey: "pricing.f13", included: true }, { textKey: "pricing.f8", included: false },
  ]},
  { id: "corporate", nameKey: "pricing.planCorporate", icon: <Building2 size={20} />, price: 999, periodKey: "pricing.periodMonth", color: "#9333EA", seatPrice: 499, seatKey: "pricing.perSeat", features: [
    { textKey: "pricing.f14", included: true }, { textKey: "pricing.f15", included: true }, { textKey: "pricing.f16", included: true },
    { textKey: "pricing.f17", included: true }, { textKey: "pricing.f18", included: true }, { textKey: "pricing.f19", included: true },
    { textKey: "pricing.f20", included: true }, { textKey: "pricing.f21", included: true },
  ]},
];

const DEFAULT_PACKS = [
  { id: "small", credits: 50, price: 149, labelKey: "pricing.pack50" as TranslationKey },
  { id: "medium", credits: 200, price: 490, labelKey: "pricing.pack200" as TranslationKey, popular: true },
  { id: "large", credits: 500, price: 990, labelKey: "pricing.pack500" as TranslationKey },
];

const UPGRADE_MARKUP = 49;
const PRO_PRICE = 299;
const FAQ_ITEMS = [
  { qKey: "pricing.faq1q" as TranslationKey, aKey: "pricing.faq1a" as TranslationKey },
  { qKey: "pricing.faq2q" as TranslationKey, aKey: "pricing.faq2a" as TranslationKey },
  { qKey: "pricing.faq3q" as TranslationKey, aKey: "pricing.faq3a" as TranslationKey },
  { qKey: "pricing.faq4q" as TranslationKey, aKey: "pricing.faq4a" as TranslationKey },
];

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
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await fetch("/api/pricing", { method: "POST" });
        const res = await fetch("/api/pricing");
        if (res.ok) {
          const data = await res.json();
          if (data.creditPacks?.length > 0) {
            const labelMap: Record<string, string> = { small: "pricing.pack50", medium: "pricing.pack200", large: "pricing.pack500" };
            const popularMap: Record<string, boolean> = { medium: true };
            setCreditPacks(data.creditPacks.map((p: { key: string; credits: number; price: number }) => ({
              id: p.key, credits: p.credits, price: Math.round(p.price / 100),
              labelKey: (labelMap[p.key] || `pricing.pack${p.credits}`) as TranslationKey, popular: popularMap[p.key] || false,
            })));
          }
        }
      } catch { /* use defaults */ }
    })();
  }, []);

  useEffect(() => {
    if (successMsg) { const timer = setTimeout(() => setSuccessMsg(null), 4000); return () => clearTimeout(timer); }
  }, [successMsg]);

  const handleSubscribe = async (planId: string) => {
    if (!session) { window.location.href = "/login"; return; }
    if (planId === "free") {
      setLoadingPlan(planId);
      try {
        const res = await fetch("/api/subscription", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: "free" }) });
        if (res.ok) { const data = await res.json(); refreshBalance(); setSuccessMsg(data.pendingPlan ? t("pricing.scheduledChange") + t("pricing.free") + " " + t("pricing.nextPeriod") : t("pricing.planChangedFree")); }
      } finally { setLoadingPlan(null); }
      return;
    }
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/subscription/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "Insufficient wallet balance") {
          const deficit = Math.ceil((data.deficit || 0) / 100);
          setTopupPrompt({ deficitRub: deficit, label: planId === "pro" ? "Pro" : t("pricing.corporate"), retryAction: () => handleSubscribe(planId) }); setTopupAmount(deficit);
        } else { console.error("Checkout failed:", res.status, data); }
        return;
      }
      const data = await res.json();
      if (data.url) { window.location.href = data.url; } else { await refreshBalance(); setSuccessMsg(t("pricing.planChanged", { plan: planId === "pro" ? "Pro" : t("pricing.corporate") })); }
    } finally { setLoadingPlan(null); }
  };

  const handleBuyCredits = async (packId: string) => {
    if (!session) { window.location.href = "/login"; return; }
    setLoadingPack(packId);
    try {
      const res = await fetch("/api/subscription/buy-credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId }) });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data.error === "Insufficient wallet balance") {
          const deficit = Math.ceil((data.deficit || 0) / 100); const pack = creditPacks.find(p => p.id === packId);
          setTopupPrompt({ deficitRub: deficit, label: `${pack?.credits || ""} ${t("common.credits")}`, retryAction: () => handleBuyCredits(packId) }); setTopupAmount(deficit);
        } else { console.error("Buy credits failed:", res.status, data); setSuccessMsg(data.error || t("common.error")); }
        return;
      }
      await refreshBalance(); const pack = creditPacks.find(p => p.id === packId);
      setSuccessMsg(t("pricing.creditsAdded", { count: pack?.credits || "" }));
    } finally { setLoadingPack(null); }
  };

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
  const showWallet = session && walletBalance !== null;

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white rounded-xl px-5 py-3 shadow-lg flex items-center gap-3" style={{ animation: "fadeIn 0.2s ease-out" }}>
          <Check size={16} /><span className="text-[17px]">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-white/60 hover:text-white"><X size={14} /></button>
        </div>
      )}

      {/* HERO */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-20">
        <div className="max-w-3xl mx-auto px-4 md:px-7 text-center">
          <div className="inline-flex items-center gap-2 bg-accent/8 border border-accent/15 rounded-full px-4 py-1.5 mb-6">
            <Star size={14} className="text-accent" />
            <span className="text-[15px] text-accent font-medium tracking-wide">{t("pricing.badge")}</span>
          </div>
          <h1 className="font-serif text-[36px] md:text-[48px] font-light text-ink leading-tight mb-4">{t("pricing.title")}</h1>
          <p className="text-ink-2 text-[20px] md:text-[22px] max-w-xl mx-auto leading-relaxed mb-8">{t("pricing.desc")}</p>
          {session && balance !== null && (
            <div className="flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-3 bg-surface border border-ink-3/10 rounded-full px-5 py-2">
                <Coins size={14} className="text-accent" />
                <span className="text-[17px] text-ink">{balance} {t("pricing.creditsShort")}</span>
                <span className="text-[15px] text-ink-3">·</span>
                <span className="text-[15px] text-ink-2">{plan === "free" ? t("pricing.free") : plan === "pro" ? "Pro" : t("pricing.corporate")}</span>
              </div>
              {currentPeriodEnd && plan !== "free" && (
                <div className="text-[14px] text-ink-3">
                  {t("pricing.renewsOn")} {new Date(currentPeriodEnd).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  {pendingPlan && <span className="ml-2 text-amber-600">→ {pendingPlan === "free" ? t("pricing.free") : pendingPlan === "pro" ? "Pro" : t("pricing.corporate")} {t("pricing.nextPeriod")}</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* PLANS */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 md:px-7">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {PLANS.map(p => {
              const tierOrder: Record<string, number> = { free: 0, pro: 1, corporate: 2 };
              const currentTier = tierOrder[plan] ?? 0;
              const planTier = tierOrder[p.id] ?? 0;
              const isBelow = planTier < currentTier;
              const isCurrent = plan === p.id;
              const displayPrice = (plan === "pro" && p.id === "corporate") ? p.price - PRO_PRICE + UPGRADE_MARKUP : p.price;
              const isUpgrade = plan === "pro" && p.id === "corporate";
              return (
                <div key={p.id} className={`relative bg-surface rounded-2xl border p-6 md:p-7 flex flex-col transition-all ${
                  isBelow ? "opacity-40 border-ink-3/5" : p.popular ? "border-accent/40 shadow-lg shadow-accent/8 hover:shadow-xl" : "border-ink-3/10 hover:shadow-lg"
                } ${isCurrent ? "ring-2 ring-accent/30" : ""}`}>
                  {p.popular && !isBelow && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-accent text-white text-[13px] tracking-[0.15em] uppercase px-4 py-1 rounded-full font-medium">{t("pricing.popular")}</div>}
                  {isCurrent && <div className="absolute -top-3.5 right-5 bg-accent/10 text-accent text-[13px] tracking-[0.15em] uppercase px-3 py-1 rounded-full font-medium">{t("pricing.current")}</div>}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${p.color}12`, color: p.color }}>{p.icon}</div>
                    <h3 className="font-serif text-[22px] font-light text-ink">{t(p.nameKey)}</h3>
                  </div>
                  <div className="mb-6">
                    {isUpgrade && p.price > 0 ? (
                      <div><span className="text-[36px] font-light text-ink">{displayPrice} ₽</span><span className="text-[17px] text-ink-3 ml-1">{t(p.periodKey)}</span><div className="text-[14px] text-ink-3 mt-0.5 line-through">{p.price} ₽ {t(p.periodKey)}</div></div>
                    ) : (
                      <div><span className="text-[36px] font-light text-ink">{displayPrice === 0 ? "0 ₽" : `${displayPrice} ₽`}</span><span className="text-[17px] text-ink-3 ml-1">{t(p.periodKey)}</span></div>
                    )}
                    {p.seatPrice && !isBelow && <div className="text-[14px] text-ink-3 mt-1">{t(p.seatKey!)} {p.seatPrice} ₽{t(p.periodKey)}</div>}
                  </div>
                  <ul className="space-y-3 mb-7 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        {f.included ? <Check size={15} className="text-accent flex-shrink-0 mt-0.5" /> : <X size={15} className="text-ink-3/30 flex-shrink-0 mt-0.5" />}
                        <span className={`text-[17px] leading-snug ${f.included ? "text-ink" : "text-ink-3/60"}`}>{t(f.textKey)}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleSubscribe(p.id)} disabled={loadingPlan === p.id || isCurrent || isBelow}
                    className={`w-full py-3 rounded-xl text-[17px] tracking-[0.08em] uppercase flex items-center justify-center gap-2 transition-all ${
                      isBelow ? "bg-ink-3/5 text-ink-3/40 cursor-not-allowed" : isCurrent ? "bg-accent/8 text-accent cursor-default"
                      : p.popular ? "bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20"
                      : "bg-surface border border-ink-3/15 text-ink hover:border-accent/40 hover:text-accent"
                    } disabled:opacity-50`}>
                    {loadingPlan === p.id ? <Loader2 size={15} className="animate-spin" />
                    : isBelow ? t("pricing.lowerPlan") : isCurrent ? t("pricing.currentPlan")
                    : <>{isUpgrade ? t("pricing.upgrade") : p.price === 0 ? t("pricing.startFree") : t("pricing.subscribe")}<ArrowRight size={13} /></>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CREDITS + WALLET */}
      <section id="credits" className="pb-20 scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4 md:px-7">
          <div className="text-center mb-10">
            <h2 className="font-serif text-[30px] md:text-[36px] font-light text-ink mb-3">{t("pricing.buyCredits")}</h2>
            <p className="text-ink-2 text-[19px] max-w-lg mx-auto">{t("pricing.creditsDesc")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-3xl mx-auto mb-8">
            {creditPacks.map(pack => {
              const basePerCredit = creditPacks[0].price / creditPacks[0].credits;
              const savings = Math.round((1 - pack.price / pack.credits / basePerCredit) * 100);
              return (
                <div key={pack.id} className={`bg-surface rounded-2xl border p-6 flex flex-col items-center text-center transition-all hover:shadow-lg ${pack.popular ? "border-accent/30 shadow-md shadow-accent/5" : "border-ink-3/10"}`}>
                  {savings > 0 && <span className="text-[13px] tracking-[0.15em] uppercase text-green-600 font-medium mb-2">−{savings}%</span>}
                  {pack.popular && <span className="text-[14px] tracking-[0.2em] uppercase text-accent font-medium mb-2">{t("pricing.bestValue")}</span>}
                  <div className="flex items-center gap-1.5 mb-2"><Zap size={18} className="text-accent" /><span className="text-[26px] font-light text-ink">{pack.credits}</span><span className="text-[18px] text-ink-3">{t("pricing.creditsShort")}</span></div>
                  <span className="text-[24px] font-light text-ink mb-1">{pack.price} ₽</span>
                  <span className="text-[14px] text-ink-3 mb-5">{(pack.price / pack.credits).toFixed(1)} ₽/{t("pricing.creditsShort")}</span>
                  <button onClick={() => handleBuyCredits(pack.id)} disabled={loadingPack === pack.id}
                    className="w-full py-2.5 bg-accent/8 text-accent rounded-xl text-[17px] tracking-[0.08em] uppercase hover:bg-accent/15 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 font-medium">
                    {loadingPack === pack.id ? <Loader2 size={13} className="animate-spin" /> : <><Coins size={13} />{t("pricing.buy")}</>}
                  </button>
                </div>
              );
            })}
          </div>
          {showWallet && (
            <div id="wallet" className="max-w-md mx-auto scroll-mt-20">
              <div className="bg-gradient-to-br from-accent/6 via-surface to-accent/3 border border-accent/12 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center"><Wallet size={17} className="text-accent" /></div><span className="text-[16px] text-ink-2">{t("pricing.walletBalance")}</span></div>
                  <span className="text-[30px] font-light text-ink tracking-tight">{walletRub.toLocaleString("ru-RU")} ₽</span>
                </div>
                {topupPrompt && (
                  <div className="mb-4 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-700/30 rounded-xl px-4 py-3">
                    <p className="text-[15px] text-amber-700 dark:text-amber-300 mb-3">{t("pricing.topupPrompt", { deficit: topupPrompt.deficitRub, label: topupPrompt.label })}</p>
                    <button onClick={() => handleTopup(topupPrompt.retryAction)} disabled={loadingTopup}
                      className="w-full bg-accent text-white rounded-lg px-4 py-2.5 text-[15px] tracking-[0.08em] uppercase hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      {loadingTopup ? <Loader2 size={14} className="animate-spin" /> : t("pricing.topupAndBuy")}<span>{topupPrompt.deficitRub} ₽</span>
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  {[300, 500, 1000, 3000, 5000].map(v => (
                    <button key={v} onClick={() => { setTopupAmount(v); setTopupPrompt(null); }}
                      className={`flex-1 py-2 rounded-lg text-[14px] font-medium transition-all ${topupAmount === v && !topupPrompt ? "bg-accent text-white shadow-sm" : "bg-ink-3/5 text-ink-2 hover:bg-ink-3/10 hover:text-ink"}`}>
                      {v >= 1000 ? `${v / 1000}k` : v} ₽
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input type="number" min={100} max={50000} step={100} value={topupAmount > 5000 ? topupAmount : ""}
                      onChange={e => { const v = parseInt(e.target.value); if (v >= 100 && v <= 50000) setTopupAmount(v); }}
                      onFocus={() => { if (topupAmount <= 5000) setTopupAmount(0); setTopupPrompt(null); }}
                      placeholder="Другая сумма"
                      className="w-full px-3 py-2 rounded-lg text-[14px] bg-ink-3/5 border border-ink-3/10 text-ink placeholder:text-ink-3/50 focus:outline-none focus:border-accent/40 transition-colors" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] text-ink-3/50">₽</span>
                  </div>
                  <button onClick={() => handleTopup(topupPrompt?.retryAction)} disabled={loadingTopup || topupAmount < 100}
                    className="px-5 py-2 bg-accent text-white rounded-lg text-[14px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-sm font-medium">
                    {loadingTopup ? <Loader2 size={12} className="animate-spin" /> : t("pricing.topup")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* TRUST SIGNALS */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 md:px-7">
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: <Shield size={22} className="text-accent" />, titleKey: "pricing.trust1t" as TranslationKey, descKey: "pricing.trust1d" as TranslationKey },
              { icon: <Clock size={22} className="text-accent" />, titleKey: "pricing.trust2t" as TranslationKey, descKey: "pricing.trust2d" as TranslationKey },
              { icon: <Wallet size={22} className="text-accent" />, titleKey: "pricing.trust3t" as TranslationKey, descKey: "pricing.trust3d" as TranslationKey },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-accent/8 flex items-center justify-center mx-auto mb-3">{item.icon}</div>
                <h3 className="text-[18px] text-ink font-medium mb-1">{t(item.titleKey)}</h3>
                <p className="text-[16px] text-ink-2 leading-relaxed">{t(item.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pb-20">
        <div className="max-w-2xl mx-auto px-4 md:px-7">
          <h2 className="font-serif text-[30px] md:text-[36px] font-light text-ink mb-8 text-center">{t("pricing.faq")}</h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-surface rounded-xl border border-ink-3/10 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="text-[18px] text-ink font-medium pr-4">{t(item.qKey)}</span>
                  <ChevronDown size={18} className={`text-ink-3 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 -mt-1" style={{ animation: "fadeIn 0.15s ease-out" }}>
                    <p className="text-[17px] text-ink-2 leading-relaxed">{t(item.aKey)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      {!session && (
        <section className="pb-20">
          <div className="max-w-xl mx-auto px-4 md:px-7 text-center">
            <div className="bg-gradient-to-br from-accent/8 via-surface to-accent/4 border border-accent/15 rounded-2xl p-8 md:p-10">
              <h2 className="font-serif text-[28px] md:text-[32px] font-light text-ink mb-3">{t("pricing.ctaTitle")}</h2>
              <p className="text-ink-2 text-[19px] mb-6">{t("pricing.ctaDesc")}</p>
              <Link href="/login" className="inline-flex items-center gap-2 bg-accent text-white rounded-xl px-7 py-3.5 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors no-underline shadow-lg shadow-accent/20">
                {t("pricing.startFree")}<ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
