"use client";

import { useLocale } from "@/lib/i18n";
import { Map, Layers, Sparkles, GitBranch, ArrowRight } from "lucide-react";

interface OnboardingGuideProps {
  onCreateUniverse: () => void;
}

export function OnboardingGuide({ onCreateUniverse }: OnboardingGuideProps) {
  const { t } = useLocale();

  const steps = [
    { icon: Map, titleKey: "onboarding.step1Title" as const, descKey: "onboarding.step1Desc" as const, color: "#2D5BE3", darkColor: "#6B8FE8" },
    { icon: Layers, titleKey: "onboarding.step2Title" as const, descKey: "onboarding.step2Desc" as const, color: "#16A34A", darkColor: "#4ADE80" },
    { icon: Sparkles, titleKey: "onboarding.step3Title" as const, descKey: "onboarding.step3Desc" as const, color: "#D97706", darkColor: "#FBBF24" },
    { icon: GitBranch, titleKey: "onboarding.step4Title" as const, descKey: "onboarding.step4Desc" as const, color: "#9333EA", darkColor: "#C084FC" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Welcome header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-5">
          <Map size={28} className="text-accent" />
        </div>
        <h2 className="font-serif text-[32px] md:text-[38px] font-light text-ink leading-tight mb-3">
          {t("onboarding.welcome")}
        </h2>
        <p className="text-ink-2 text-[18px] leading-relaxed max-w-md mx-auto">
          {t("onboarding.welcomeDesc")}
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {steps.map(({ icon: Icon, titleKey, descKey, color, darkColor }, i) => (
          <div
            key={titleKey}
            className="bg-surface rounded-xl border border-ink-3/10 p-5 flex gap-4 items-start"
          >
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[22px] font-light text-ink-3/30 select-none">{String(i + 1).padStart(2, "0")}</span>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + "15" }}
              >
                <Icon size={16} className="dark:hidden" style={{ color }} />
                <Icon size={16} className="hidden dark:block" style={{ color: darkColor }} />
              </div>
            </div>
            <div>
              <h3 className="font-serif text-[19px] font-light text-ink mb-1">{t(titleKey)}</h3>
              <p className="text-[15px] text-ink-2 leading-relaxed">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center">
        <button
          onClick={onCreateUniverse}
          className="inline-flex items-center gap-2 bg-accent text-white rounded-xl px-8 py-3 text-[17px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
        >
          {t("dashboard.createUniverse")}
          <ArrowRight size={14} />
        </button>
        <p className="text-ink-3 text-[15px] mt-4">
          {t("onboarding.tryExample")} → <a href="/marketplace" className="text-accent hover:underline">{t("landing.marketplace")}</a>
        </p>
      </div>
    </div>
  );
}
