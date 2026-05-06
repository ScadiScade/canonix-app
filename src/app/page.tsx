"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useLocale, TranslationKey } from "@/lib/i18n";
import {
  Map, Users, Globe, Zap, Building2, LayoutGrid, GitBranch,
  Clock, Share2, ArrowRight, ChevronRight, Sparkles, Shield, Layers,
} from "lucide-react";

const entityTypes: { icon: typeof Users; typeKey: TranslationKey; descKey: TranslationKey; color: string }[] = [
  { icon: Users, typeKey: "landing.etCharacter", descKey: "landing.etCharacterDesc", color: "#2D5BE3" },
  { icon: Globe, typeKey: "landing.etPlace", descKey: "landing.etPlaceDesc", color: "#16A34A" },
  { icon: Zap, typeKey: "landing.etEvent", descKey: "landing.etEventDesc", color: "#D97706" },
  { icon: Building2, typeKey: "landing.etOrg", descKey: "landing.etOrgDesc", color: "#9333EA" },
];

const features: { icon: typeof LayoutGrid; titleKey: TranslationKey; descKey: TranslationKey; color: string }[] = [
  { icon: LayoutGrid, titleKey: "landing.fBento", descKey: "landing.fBentoDesc", color: "#2D5BE3" },
  { icon: GitBranch, titleKey: "landing.fGraph", descKey: "landing.fGraphDesc", color: "#16A34A" },
  { icon: Clock, titleKey: "landing.fTimeline", descKey: "landing.fTimelineDesc", color: "#D97706" },
  { icon: Share2, titleKey: "landing.fSharing", descKey: "landing.fSharingDesc", color: "#9333EA" },
];

const steps: { num: string; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { num: "01", titleKey: "landing.s1Title", descKey: "landing.s1Desc" },
  { num: "02", titleKey: "landing.s2Title", descKey: "landing.s2Desc" },
  { num: "03", titleKey: "landing.s3Title", descKey: "landing.s3Desc" },
  { num: "04", titleKey: "landing.s4Title", descKey: "landing.s4Desc" },
];

const previewEntities: { nameKey: TranslationKey; typeKey: TranslationKey; color: string }[] = [
  { nameKey: "landing.peAnakin", typeKey: "landing.etCharacter", color: "#2D5BE3" },
  { nameKey: "landing.peTatooine", typeKey: "landing.etPlace", color: "#16A34A" },
  { nameKey: "landing.peOrder66", typeKey: "landing.etEvent", color: "#D97706" },
  { nameKey: "landing.peJedi", typeKey: "landing.etOrg", color: "#9333EA" },
  { nameKey: "landing.peObiwan", typeKey: "landing.etCharacter", color: "#2D5BE3" },
  { nameKey: "landing.peCoruscant", typeKey: "landing.etPlace", color: "#16A34A" },
  { nameKey: "landing.peRepublic", typeKey: "landing.etEvent", color: "#D97706" },
  { nameKey: "landing.peEmpire", typeKey: "landing.etOrg", color: "#9333EA" },
];

const trustItems: { icon: typeof Shield; labelKey: TranslationKey }[] = [
  { icon: Shield, labelKey: "landing.trustProtected" },
  { icon: Sparkles, labelKey: "landing.trustFreeStart" },
  { icon: Layers, labelKey: "landing.trustUnlimited" },
];

const stats = [
  { value: "10K+", labelKey: "landing.statsUniverses" as TranslationKey },
  { value: "500K+", labelKey: "landing.statsEntities" as TranslationKey },
  { value: "50K+", labelKey: "landing.statsCreators" as TranslationKey },
];

const faqItems = [
  { qKey: "landing.faq1q" as TranslationKey, aKey: "landing.faq1a" as TranslationKey },
  { qKey: "landing.faq2q" as TranslationKey, aKey: "landing.faq2a" as TranslationKey },
  { qKey: "landing.faq3q" as TranslationKey, aKey: "landing.faq3a" as TranslationKey },
  { qKey: "landing.faq4q" as TranslationKey, aKey: "landing.faq4a" as TranslationKey },
];

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function Home() {
  const { data: session } = useSession();
  const { t } = useLocale();
  useScrollReveal();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Canonix",
        url: "https://canonix.app",
        logo: "https://canonix.app/logo.png",
        sameAs: [],
      },
      {
        "@type": "WebSite",
        name: "Canonix — Map Any Universe",
        url: "https://canonix.app",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://canonix.app/marketplace?search={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: t(f.qKey),
          acceptedAnswer: {
            "@type": "Answer",
            text: t(f.aKey),
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main id="main-content">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          {/* Subtle gradient bg */}
          <div className="absolute inset-0 bg-gradient-to-b from-accent-light/40 via-transparent to-transparent pointer-events-none" />
          <div className="relative max-w-5xl mx-auto px-4 md:px-7 pt-16 md:pt-28 pb-12 md:pb-20 text-center">
            <div className="inline-flex items-center gap-2 bg-accent-light text-accent rounded-full px-3.5 py-1 text-[15px] tracking-[0.2em] uppercase mb-6 border border-accent/10">
              <Sparkles size={10} />
              {t("landing.openBeta")}
            </div>
            <h1 className="font-serif text-[32px] sm:text-[46px] md:text-[70px] font-light text-ink leading-[1.05] mb-6">
              {t("landing.heroTitle1")}<br />{t("landing.heroTitle2")}
            </h1>
            <p className="text-ink-2 text-[17px] sm:text-[20px] md:text-[22px] max-w-xl mx-auto leading-relaxed mb-8 sm:mb-10">
              {t("landing.heroDesc")}
            </p>
            <div className="flex gap-3 justify-center flex-wrap mb-12">
              <Link
                href={session ? "/dashboard" : "/login"}
                className="bg-accent text-white rounded-xl px-7 py-3.5 text-[17px] tracking-[0.12em] uppercase hover:bg-accent/90 transition-colors no-underline inline-flex items-center gap-2 shadow-lg shadow-accent/20"
              >
                {session ? t("landing.myUniverses") : t("landing.startFree")}
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/marketplace"
                className="bg-surface text-ink border border-ink-3/20 rounded-xl px-7 py-3.5 text-[17px] tracking-[0.12em] uppercase hover:border-ink-3/40 transition-colors no-underline inline-flex items-center gap-2"
              >
                {t("landing.marketplace")}
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
              {trustItems.map(({ icon: Icon, labelKey }) => (
                <div key={labelKey} className="flex items-center gap-2 text-ink-3">
                  <Icon size={14} className="text-accent/60" />
                  <span className="text-[16px] tracking-[0.1em] uppercase">{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Preview mockup ── */}
        <section className="max-w-5xl mx-auto px-4 md:px-7 pb-20 reveal">
          <div className="bg-surface rounded-xl border border-ink-3/12 p-5 md:p-7 shadow-sm shadow-ink/5">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <Map size={16} className="text-accent" />
                <span className="font-serif text-[16px] font-light text-ink">Star Wars</span>
              </div>
              <div className="flex bg-background rounded-lg border border-ink-3/10 p-0.5 ml-auto overflow-x-auto no-scrollbar">
                <span className="px-2.5 py-1 rounded-lg text-[14px] tracking-[0.15em] uppercase bg-accent text-white">Bento</span>
                <span className="px-2.5 py-1 rounded-lg text-[14px] tracking-[0.15em] uppercase text-ink-3">{t("landing.previewGraph")}</span>
                <span className="px-2.5 py-1 rounded-lg text-[14px] tracking-[0.15em] uppercase text-ink-3">{t("landing.previewTimeline")}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
              {previewEntities.map(e => (
                <div key={e.nameKey} className="bg-background rounded-lg p-3 border border-ink-3/8 hover:border-ink-3/20 transition-colors">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-[14px] tracking-[0.15em] uppercase text-ink-3">{t(e.typeKey)}</span>
                  </div>
                  <span className="font-serif text-[19px] font-light text-ink leading-snug">{t(e.nameKey)}</span>
                </div>
              ))}
            </div>
            {/* Fake connections hint */}
            <div className="mt-4 pt-3 border-t border-ink-3/8 flex items-center gap-2 sm:gap-3 text-[13px] sm:text-[15px] text-ink-3 flex-wrap">
              <span className="flex items-center gap-1"><GitBranch size={10} /> {t("landing.previewRelations")}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {t("landing.previewEvents")}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Share2 size={10} /> {t("landing.previewPublic")}</span>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="bg-surface border-y border-ink-3/10 reveal">
          <div className="max-w-5xl mx-auto px-4 md:px-7 py-16 md:py-20 text-center">
            <p className="text-[15px] tracking-[0.2em] uppercase text-accent mb-2">{t("landing.statsLabel")}</p>
            <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] font-light text-ink mb-10">{t("landing.statsTitle")}</h2>
            <div className="grid grid-cols-3 gap-6 md:gap-10">
              {stats.map(({ value, labelKey }) => (
                <div key={labelKey} className="flex flex-col items-center">
                  <span className="font-serif text-[36px] md:text-[48px] font-light text-accent leading-none">{value}</span>
                  <span className="text-[15px] md:text-[17px] tracking-[0.15em] uppercase text-ink-2 mt-2">{t(labelKey)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Entity types ── */}
        <section className="max-w-5xl mx-auto px-4 md:px-7 pb-20 reveal">
          <div className="text-center mb-10">
            <p className="text-[15px] tracking-[0.2em] uppercase text-accent mb-2">{t("landing.structureLabel")}</p>
            <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] font-light text-ink">{t("landing.entityTypesTitle")}</h2>
            <p className="text-ink-2 text-[16px] sm:text-[18px] mt-2 max-w-md mx-auto">{t("landing.entityTypesDesc")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {entityTypes.map(({ icon: Icon, typeKey, descKey, color }) => (
              <div key={typeKey} className="bg-surface rounded-lg p-5 border border-ink-3/10 hover:border-ink-3/25 hover:shadow-sm transition-all group">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ backgroundColor: color + "12" }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <h3 className="font-serif text-[19px] sm:text-[23px] font-light text-ink mb-1.5 sm:mb-2">{t(typeKey)}</h3>
                <p className="text-[15px] sm:text-[17px] text-ink-2 leading-relaxed">{t(descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Key features ── */}
        <section className="bg-surface border-y border-ink-3/10 reveal">
          <div className="max-w-5xl mx-auto px-4 md:px-7 py-20">
            <div className="text-center mb-10">
              <p className="text-[15px] tracking-[0.2em] uppercase text-accent mb-2">{t("landing.featuresLabel")}</p>
              <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] font-light text-ink">{t("landing.featuresTitle")}</h2>
              <p className="text-ink-2 text-[16px] sm:text-[18px] mt-2 max-w-md mx-auto">{t("landing.featuresDesc")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {features.map(({ icon: Icon, titleKey, descKey, color }) => (
                <div key={titleKey} className="bg-background rounded-lg p-6 border border-ink-3/8 hover:border-ink-3/20 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: color + "12" }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <div>
                      <h3 className="font-serif text-[19px] sm:text-[23px] font-light text-ink mb-1 sm:mb-1.5">{t(titleKey)}</h3>
                      <p className="text-[15px] sm:text-[17px] text-ink-2 leading-relaxed">{t(descKey)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="max-w-5xl mx-auto px-4 md:px-7 py-20 reveal">
          <div className="text-center mb-12">
            <p className="text-[15px] tracking-[0.2em] uppercase text-accent mb-2">{t("landing.howLabel")}</p>
            <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] font-light text-ink">{t("landing.howTitle")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {steps.map(({ num, titleKey, descKey }) => (
              <div key={num} className="flex gap-4 p-5 rounded-lg border border-ink-3/8 hover:border-ink-3/20 transition-colors">
                <span className="font-serif text-[34px] font-light text-accent/25 leading-none select-none">{num}</span>
                <div>
                  <h3 className="font-serif text-[22px] font-light text-ink mb-1">{t(titleKey)}</h3>
                  <p className="text-[17px] text-ink-2 leading-relaxed">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="max-w-3xl mx-auto px-4 md:px-7 py-20 reveal" itemScope itemType="https://schema.org/FAQPage">
          <div className="text-center mb-12">
            <p className="text-[15px] tracking-[0.2em] uppercase text-accent mb-2">{t("landing.faqLabel")}</p>
            <h2 className="font-serif text-[28px] sm:text-[34px] md:text-[42px] font-light text-ink">{t("landing.faqTitle")}</h2>
          </div>
          <div className="space-y-4">
            {faqItems.map(({ qKey, aKey }) => (
              <details key={qKey} className="group bg-surface rounded-xl border border-ink-3/10 open:border-ink-3/20 transition-colors" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none select-none">
                  <span className="font-serif text-[19px] font-light text-ink" itemProp="name">{t(qKey)}</span>
                  <ChevronRight size={16} className="text-ink-3 transition-transform group-open:rotate-90 flex-shrink-0" />
                </summary>
                <div className="px-5 pb-5 text-[17px] text-ink-2 leading-relaxed" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                  <p itemProp="text">{t(aKey)}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="relative overflow-hidden reveal">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-light/30 to-accent-light/60 pointer-events-none" />
          <div className="relative max-w-3xl mx-auto px-4 md:px-7 py-20 md:py-28 text-center">
            <h2 className="font-serif text-[38px] md:text-[50px] font-light text-ink leading-[1.1] mb-5">
              {t("landing.ctaTitle1")}<br />{t("landing.ctaTitle2")}
            </h2>
            <p className="text-ink-2 text-[19px] md:text-[20px] max-w-md mx-auto leading-relaxed mb-8">
              {t("landing.ctaDesc")}
            </p>
            <Link
              href={session ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 bg-accent text-white rounded-xl px-8 py-3.5 text-[17px] tracking-[0.12em] uppercase hover:bg-accent/90 transition-colors no-underline shadow-lg shadow-accent/20"
            >
              {session ? t("landing.myUniverses") : t("landing.createUniverse")}
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-ink-3/12 bg-surface">
        <div className="max-w-5xl mx-auto px-4 md:px-7 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 no-underline mb-2">
                <Map size={14} className="text-accent" />
                <span className="font-serif text-[18px] font-light text-ink">Canonix</span>
              </Link>
              <p className="text-[16px] text-ink-3 max-w-xs">{t("landing.footerDesc")}</p>
            </div>
            <nav className="flex flex-col gap-2" aria-label="Footer">
              <Link href="/marketplace" className="text-[16px] tracking-[0.1em] uppercase text-ink-3 hover:text-accent transition-colors no-underline">{t("landing.marketplace")}</Link>
              <Link href="/legal/terms" className="text-[16px] tracking-[0.1em] uppercase text-ink-3 hover:text-accent transition-colors no-underline">{t("landing.termsOfUse")}</Link>
              <Link href="/legal/privacy" className="text-[16px] tracking-[0.1em] uppercase text-ink-3 hover:text-accent transition-colors no-underline">{t("login.privacy")}</Link>
              <Link href="/legal/consent" className="text-[16px] tracking-[0.1em] uppercase text-ink-3 hover:text-accent transition-colors no-underline">{t("landing.dataProcessing")}</Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-ink-3/10 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[15px] tracking-[0.2em] uppercase text-ink-3">canonix · {new Date().getFullYear()}</span>
            <span className="text-[15px] text-ink-3">{t("landing.madeWith")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
